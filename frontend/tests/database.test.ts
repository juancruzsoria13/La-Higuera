import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync } from "node:fs";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const stranger = "77777777-7777-4777-8777-777777777777";
// El id lo genera la base: products y businesses no tienen permiso de INSERT sobre esa columna.
let product = "";
let business = "";
const migrations = ["202610020001_initial.sql", "202610070001_services.sql", "202610070002_supabase_hardening.sql", "202610070003_marketplace_model.sql", "202610090001_service_images.sql"];
const insertProduct = "insert into products(owner_id,title,description,price,currency,category_id,condition,locality_id,contact_phone) values($1,'Bicicleta','En perfecto estado',1200.50,'ARS','otros','usado','capital','2644123456') returning id";
let db: PGlite;
async function asUser<T>(id: string | null, run: () => Promise<T>) {
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [id ?? "", id ? "authenticated" : "anon"]);
  try { return await run(); } finally { await db.exec("reset role"); await db.exec("select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false)"); }
}
async function reserveUploaded(owner: string) {
  return asUser(owner, async () => {
    const path = (await db.query<{path: string}>("select reserve_image() as path")).rows[0].path;
    await db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [path]);
    return path;
  });
}
const imagesOf = async (id: string) => (await db.query<{path: string; sort_order: number}>("select path, sort_order from product_images where product_id=$1 order by sort_order", [id])).rows;
// Real PostgreSQL RLS/constraints; minimal Auth and Storage schema fixtures, NOT Supabase services.
beforeAll(async () => {
  db = new PGlite({extensions: {pg_trgm}});
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz, phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, unique(bucket_id,name));
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    alter table storage.objects enable row level security;
  `);
  for (const file of migrations) await db.exec(readFileSync(`../database/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [a, {display_name: "Ana"}, b, {display_name: "Bruno"}]);
});
afterAll(async () => { await db?.close(); });
describe("Migraciones y permisos con dos identidades en PostgreSQL local", () => {
  it("expone las listas de referencia y no deja modificarlas", async () => {
    await asUser(null, async () => {
      for (const [table, size] of [["localities", 19], ["categories", 8], ["trades", 12]] as const) expect((await db.query(`select id from ${table} where active`)).rows).toHaveLength(size);
      expect((await db.query("select requires_license from trades where id='gasista'")).rows[0]).toEqual({requires_license: true});
    });
    await asUser(a, async () => {await expect(db.query("insert into categories(id,name) values('nuevo','Nuevo')")).rejects.toThrow();});
  });
  it("crea perfiles públicos por trigger y solo deja editar el propio", async () => {
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(2);
    await asUser(null, async () => {expect((await db.query("select display_name, locality_id, rating_score from public.profiles where id=$1", [a])).rows[0]).toEqual({display_name: "Ana", locality_id: "capital", rating_score: "3.500"});});
    await asUser(a, async () => {
      expect((await db.query("update public.profiles set display_name = 'Hack' where id = $1 returning id", [b])).rows).toHaveLength(0);
      expect((await db.query("update public.profiles set locality_id = 'rivadavia' where id = $1 returning locality_id", [a])).rows[0]).toEqual({locality_id: "rivadavia"});
      await expect(db.query("update public.profiles set locality_id = 'mendoza' where id = $1", [a])).rejects.toThrow();
      await expect(db.query("update public.profiles set rating_score = 5 where id = $1", [a])).rejects.toThrow();
    });
  });
  it("permite alta, consulta y edición propia; bloquea propiedad falsa y columnas no permitidas", async () => {
    await asUser(a, async () => {
      await expect(db.query("insert into products(id,owner_id,title,description,price,currency,category_id,condition,locality_id,contact_phone) values($1,$2,'Bicicleta','En perfecto estado',0,'ARS','otros','usado','capital','2644123456')", [stranger, a])).rejects.toThrow();
      product = (await db.query<{id: string}>(insertProduct, [a])).rows[0].id;
      expect((await db.query("update products set price=1500.25 where id=$1 returning price", [product])).rows).toHaveLength(1);
      await expect(db.query("update products set owner_id=$1 where id=$2", [b, product])).rejects.toThrow();
      await expect(db.query("update products set hidden=true where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set expires_at=now() + interval '1 year' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("insert into products(owner_id,title,description,price,currency,category_id,condition,locality_id,contact_phone,hidden) values($1,'Bicicleta','En perfecto estado',0,'ARS','otros','usado','capital','2644123456',false)", [a])).rejects.toThrow();
      await expect(db.query(insertProduct, [b])).rejects.toThrow();
    });
    await asUser(b, async () => {expect((await db.query("select id from products")).rows).toHaveLength(1); expect((await db.query("update products set price=0 where id=$1 returning id", [product])).rows).toHaveLength(0); expect((await db.query("delete from products where id=$1 returning id", [product])).rows).toHaveLength(0);});
    await asUser(null, async () => {expect((await db.query("select product_seller($1) as name", [product])).rows[0]).toEqual({name: "Ana"});});
  });
  it("exige contacto en anuncios activos y operación solo en inmuebles", async () => {
    await asUser(a, async () => {
      await expect(db.query("update products set contact_phone=null where id=$1", [product])).rejects.toThrow();
      await db.query("update products set contact_phone=null, contact_email='ana@example.com' where id=$1", [product]);
      await expect(db.query("update products set contact_email='sin-arroba' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set category_id='inmuebles' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set operation='venta' where id=$1", [product])).rejects.toThrow();
      await db.query("update products set category_id='inmuebles', operation='alquiler' where id=$1", [product]);
      await db.query("update products set category_id='otros', operation=null, contact_phone='2644123456' where id=$1", [product]);
      await expect(db.query("update products set category_id='inexistente' where id=$1", [product])).rejects.toThrow();
    });
  });
  it("impide vincular un anuncio a un comercio ajeno", async () => {
    await asUser(b, async () => {business = (await db.query<{id: string}>("insert into businesses(owner_id,name,slug) values($1,'Mi comercio','mi-comercio') returning id", [b])).rows[0].id;});
    await asUser(a, async () => {expect((await db.query("select * from businesses")).rows).toHaveLength(0); await expect(db.query("update products set business_id=$1 where id=$2", [business, product])).rejects.toThrow();});
  });
  it("pausados, vendidos, ocultos y vencidos solo son visibles para su propietario", async () => {
    const hiddenFromOthers = async () => {
      await asUser(a, async () => {expect((await db.query("select * from products")).rows).toHaveLength(1);});
      for (const user of [b, null]) await asUser(user, async () => {expect((await db.query("select * from products")).rows).toHaveLength(0); expect((await db.query("select product_seller($1) as name", [product])).rows[0]).toEqual({name: null});});
    };
    for (const status of ["pausado", "vendido"]) {
      await asUser(a, async () => {await db.query("update products set status=$1 where id=$2", [status, product]);});
      await hiddenFromOthers();
    }
    await asUser(a, async () => {await db.query("update products set status='activo' where id=$1", [product]);});
    await db.query("update products set hidden=true where id=$1", [product]);
    await hiddenFromOthers();
    await db.query("update products set hidden=false, expires_at=now() - interval '1 day' where id=$1", [product]);
    await hiddenFromOthers();
    await asUser(b, async () => {await expect(db.query("select renew_product($1)", [product])).rejects.toThrow();});
    await asUser(a, async () => {expect((await db.query<{ok: boolean}>("select renew_product($1) > now() + interval '59 days' as ok", [product])).rows[0]).toEqual({ok: true});});
    await asUser(null, async () => {expect((await db.query("select * from products")).rows).toHaveLength(1);});
  });
  it("aplica restricciones incluso sin usar los formularios", async () => {
    await asUser(a, async () => {
      await expect(db.query("update products set price=-1 where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set status='inexistente' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set image_path='x' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("insert into product_images(product_id,owner_id,path,sort_order) values($1,$2,$3,0)", [product, a, `${b}/${stranger}.webp`])).rejects.toThrow();
    });
  });
  it("administra varias fotos con set_product_images y encola la limpieza en la misma transacción", async () => {
    const [first, second, third] = [await reserveUploaded(a), await reserveUploaded(a), await reserveUploaded(a)];
    await asUser(a, async () => {
      await db.query("select set_product_images($1, $2)", [product, [first, second]]);
      expect(await imagesOf(product)).toEqual([{path: first, sort_order: 0}, {path: second, sort_order: 1}]);
      expect((await db.query("select * from storage_cleanup where path = any($1)", [[first, second]])).rows).toHaveLength(0);
      expect((await db.query("delete from storage.objects where name=$1 returning name", [first])).rows).toHaveLength(0);
      await expect(db.query("select set_product_images($1, $2)", [product, [first, first]])).rejects.toThrow();
      await expect(db.query("select set_product_images($1, $2)", [product, Array.from({length: 9}, (_, i) => `${a}/${String(i).repeat(8)}-0000-4000-8000-000000000000.webp`)])).rejects.toThrow();
      await expect(db.query("select set_product_images($1, $2)", [product, [first, `${a}/${stranger}.webp`]])).rejects.toThrow();
      expect(await imagesOf(product)).toHaveLength(2);
    });
    await asUser(null, async () => {
      expect((await db.query("select * from product_images")).rows).toHaveLength(2);
      expect((await db.query("select * from storage.objects where name=$1", [first])).rows).toHaveLength(1);
    });
    await asUser(b, async () => {
      await expect(db.query("select set_product_images($1, $2)", [product, []])).rejects.toThrow();
      await expect(db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [`${a}/${stranger}.webp`])).rejects.toThrow();
      expect((await db.query("delete from storage.objects where name=$1 returning name", [first])).rows).toHaveLength(0);
      expect((await db.query("update storage.objects set name='changed' where name=$1 returning name", [first])).rows).toHaveLength(0);
      expect((await db.query("delete from product_images returning path")).rows).toHaveLength(0);
    });
    await asUser(a, async () => {
      // Nueva portada, reordena y quita la primera: la foto quitada queda lista para limpiar.
      await db.query("select set_product_images($1, $2)", [product, [third, second]]);
      expect(await imagesOf(product)).toEqual([{path: third, sort_order: 0}, {path: second, sort_order: 1}]);
      expect((await db.query("select ready from storage_cleanup where path=$1", [first])).rows[0]).toEqual({ready: true});
      await db.query("delete from storage.objects where name=$1", [first]);
      await db.query("delete from storage_cleanup where path=$1", [first]);
      await db.query("update products set status='pausado' where id=$1", [product]);
    });
    await asUser(null, async () => {
      expect((await db.query("select * from product_images")).rows).toHaveLength(0);
      expect((await db.query("select * from storage.objects where name=$1", [second])).rows).toHaveLength(0);
    });
    await asUser(a, async () => {
      await db.query("update products set status='activo' where id=$1", [product]);
      await db.query("select set_product_images($1, $2)", [product, []]);
      expect((await db.query<{path: string}>("select path from storage_cleanup where ready")).rows.map(r => r.path).sort()).toEqual([second, third].sort());
      await db.query("delete from storage.objects where name = any($1)", [[second, third]]);
      await db.query("delete from storage_cleanup where path = any($1)", [[second, third]]);
    });
  });
  it("la eliminación de cuenta bloquea nuevas escrituras y hace cascada sin afectar al otro usuario", async () => {
    const path = await reserveUploaded(a);
    await asUser(a, async () => {
      await db.query("select set_product_images($1, $2)", [product, [path]]);
      const ownBusiness = (await db.query<{id: string}>("insert into businesses(owner_id,name,slug) values($1,'Comercio Ana','comercio-ana') returning id", [a])).rows[0].id;
      await db.query("update products set business_id=$1 where id=$2", [ownBusiness, product]);
      await db.query("select begin_account_deletion()");
      await expect(db.query("select reserve_image()")).rejects.toThrow();
      await expect(db.query("select renew_product($1)", [product])).rejects.toThrow();
      expect((await db.query("update products set title='Nuevo nombre' where id=$1 returning id", [product])).rows).toHaveLength(0);
    });
    await db.query("delete from auth.users where id=$1", [a]);
    for (const [table, column] of [["products", "owner_id"], ["product_images", "owner_id"], ["profiles", "id"], ["businesses", "owner_id"]]) expect((await db.query(`select * from ${table} where ${column}=$1`, [a])).rows).toHaveLength(0);
    expect((await db.query("select ready from storage_cleanup where path=$1", [path])).rows[0]).toEqual({ready: true});
    expect((await db.query("select * from profiles where id=$1", [b])).rows).toHaveLength(1);
    expect((await db.query("select * from businesses where owner_id=$1", [b])).rows).toHaveLength(1);
  });
});
describe("Servicios de oficio", () => {
  const c = "55555555-5555-4555-8555-555555555555";
  const d = "66666666-6666-4666-8666-666666666666";
  let service = "";
  const row = "insert into service_providers(owner_id,name,trade_id,license_number,license_body,description,phone,locality_id) values($1,'Juan Gas','gasista','1234','ENARGAS','Instalaciones de gas',$2,'capital') returning id";
  it("exige matrícula solo si el oficio la requiere y no deja marcar insignias", async () => {
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [c, {display_name: "Carla"}, d, {display_name: "Diego"}]);
    await asUser(c, async () => {
      await expect(db.query("insert into service_providers(owner_id,name,trade_id,license_number,license_body,description,phone,locality_id,verified) values($1,'X Y','gasista','1','E','Instalaciones de gas','2644123456','capital',true)", [c])).rejects.toThrow();
      await expect(db.query("insert into service_providers(owner_id,name,trade_id,description,phone,locality_id) values($1,'Juan Gas','gasista','Instalaciones de gas','2644123456','capital')", [c])).rejects.toThrow();
      service = (await db.query<{id: string}>(row, [c, "2644123456"])).rows[0].id;
      expect((await db.query("select verified, references_verified from service_providers where id=$1", [service])).rows[0]).toEqual({verified: false, references_verified: false});
      await expect(db.query("update service_providers set verified=true where id=$1", [service])).rejects.toThrow();
      await expect(db.query("update service_providers set references_verified=true where id=$1", [service])).rejects.toThrow();
      await expect(db.query("update service_providers set rating_score=5 where id=$1", [service])).rejects.toThrow();
      await expect(db.query(row, [d, "2644123456"])).rejects.toThrow();
      await expect(db.query("update service_providers set phone='abc' where id=$1", [service])).rejects.toThrow();
      const painter = (await db.query("insert into service_providers(owner_id,name,trade_id,license_number,license_body,description,phone,locality_id,contact_email) values($1,'Carla Pinta','pintor','77','Municipio','Pintura de interiores','2644123456','capital','carla@example.com') returning license_number, license_body, contact_email", [c])).rows[0];
      expect(painter).toEqual({license_number: null, license_body: null, contact_email: "carla@example.com"});
    });
  });
  it("retira las insignias al cambiar matrícula u oficio y respeta visibilidad y propiedad", async () => {
    await db.query("update service_providers set verified=true, references_verified=true where id=$1", [service]);
    await asUser(null, async () => {expect((await db.query("select verified from service_providers where id=$1", [service])).rows).toEqual([{verified: true}]);});
    await asUser(d, async () => {expect((await db.query("update service_providers set name='Hack' where id=$1 returning id", [service])).rows).toHaveLength(0); expect((await db.query("delete from service_providers where id=$1 returning id", [service])).rows).toHaveLength(0);});
    await asUser(c, async () => {
      await db.query("update service_providers set license_number='9999' where id=$1", [service]);
      expect((await db.query("select verified, references_verified from service_providers where id=$1", [service])).rows[0]).toEqual({verified: false, references_verified: true});
      await db.query("update service_providers set trade_id='pintor' where id=$1", [service]);
      expect((await db.query("select license_number, references_verified from service_providers where id=$1", [service])).rows[0]).toEqual({license_number: null, references_verified: false});
    });
    await db.query("update service_providers set hidden=true where id=$1", [service]);
    await asUser(d, async () => {expect((await db.query("select * from service_providers where id=$1", [service])).rows).toHaveLength(0);});
    await asUser(c, async () => {expect((await db.query("select * from service_providers where id=$1", [service])).rows).toHaveLength(1); await db.query("update service_providers set status='pausado' where id=$1", [service]);});
    await db.query("update service_providers set hidden=false where id=$1", [service]);
    await asUser(null, async () => {expect((await db.query("select * from service_providers where id=$1", [service])).rows).toHaveLength(0);});
  });
});
describe("Fotos de servicios", () => {
  const e = "88888888-8888-4888-8888-888888888888";
  const f = "99999999-9999-4999-8999-999999999999";
  let service = "";
  const servicePhotos = async () => (await db.query<{kind: string; path: string; sort_order: number}>("select kind, path, sort_order from service_images where service_provider_id=$1 order by kind, sort_order", [service])).rows;
  it("guarda foto de perfil y trabajos, y solo las ve quien ve el servicio", async () => {
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [e, {display_name: "Elena"}, f, {display_name: "Fede"}]);
    await asUser(e, async () => {service = (await db.query<{id: string}>("insert into service_providers(owner_id,name,trade_id,description,phone,locality_id) values($1,'Elena Pinta','pintor','Pintura de interiores y exteriores','2644123456','capital') returning id", [e])).rows[0].id;});
    const [avatar, first, second] = [await reserveUploaded(e), await reserveUploaded(e), await reserveUploaded(e)];
    await asUser(e, async () => {
      await db.query("select set_service_images($1, $2, $3)", [service, avatar, [first, second]]);
      expect(await servicePhotos()).toEqual([{kind: "perfil", path: avatar, sort_order: 0}, {kind: "trabajo", path: first, sort_order: 0}, {kind: "trabajo", path: second, sort_order: 1}]);
      await expect(db.query("select set_service_images($1, $2, $3)", [service, avatar, [avatar]])).rejects.toThrow();
      await expect(db.query("select set_service_images($1, $2, $3)", [service, null, Array.from({length: 9}, (_, i) => `${e}/${String(i).repeat(8)}-0000-4000-8000-000000000000.webp`)])).rejects.toThrow();
      await expect(db.query("select set_service_images($1, $2, $3)", [service, first, [second]])).rejects.toThrow();
      await expect(db.query("insert into service_images(service_provider_id,owner_id,kind,path,sort_order) values($1,$2,'perfil',$3,1)", [service, e, `${e}/${stranger}.webp`])).rejects.toThrow();
      expect((await db.query("delete from storage.objects where name=$1 returning name", [first])).rows).toHaveLength(0);
      await db.query("select abandon_image($1)", [first]);
      expect((await db.query("select * from storage_cleanup where path=$1", [first])).rows).toHaveLength(0);
    });
    await asUser(null, async () => {
      expect((await db.query("select * from service_images where service_provider_id=$1", [service])).rows).toHaveLength(3);
      expect((await db.query("select * from storage.objects where name = any($1)", [[avatar, first, second]])).rows).toHaveLength(3);
    });
    await asUser(f, async () => {
      await expect(db.query("select set_service_images($1, $2, $3)", [service, null, []])).rejects.toThrow();
      expect((await db.query("delete from service_images where service_provider_id=$1 returning path", [service])).rows).toHaveLength(0);
      expect((await db.query("update service_images set sort_order=5 where service_provider_id=$1 returning path", [service])).rows).toHaveLength(0);
    });
    await asUser(e, async () => {await db.query("update service_providers set status='pausado' where id=$1", [service]);});
    await asUser(null, async () => {
      expect((await db.query("select * from service_images where service_provider_id=$1", [service])).rows).toHaveLength(0);
      expect((await db.query("select * from storage.objects where name = any($1)", [[avatar, first, second]])).rows).toHaveLength(0);
    });
    await asUser(e, async () => {await db.query("update service_providers set status='activo' where id=$1", [service]);});
  });
  it("reordena, quita la foto de perfil y encola los archivos quitados", async () => {
    const [avatar, first, second] = (await servicePhotos()).map(row => row.path);
    await asUser(e, async () => {
      await db.query("select set_service_images($1, $2, $3)", [service, null, [second]]);
      expect(await servicePhotos()).toEqual([{kind: "trabajo", path: second, sort_order: 0}]);
      expect((await db.query<{path: string}>("select path from storage_cleanup where ready")).rows.map(r => r.path).sort()).toEqual([avatar, first].sort());
      await db.query("delete from storage.objects where name = any($1)", [[avatar, first]]);
      await db.query("delete from storage_cleanup where path = any($1)", [[avatar, first]]);
    });
  });
  it("la eliminación de cuenta arrastra las fotos y deja sus archivos para limpiar", async () => {
    const [remaining] = (await servicePhotos()).map(row => row.path);
    await db.query("delete from auth.users where id=$1", [e]);
    expect((await db.query("select * from service_images where owner_id=$1", [e])).rows).toHaveLength(0);
    expect((await db.query("select ready from storage_cleanup where path=$1", [remaining])).rows[0]).toEqual({ready: true});
  });
});
