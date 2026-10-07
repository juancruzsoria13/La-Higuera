import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync } from "node:fs";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const product = "33333333-3333-4333-8333-333333333333";
const business = "44444444-4444-4444-8444-444444444444";
let db: PGlite;
async function asUser<T>(id: string | null, run: () => Promise<T>) {
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [id ?? "", id ? "authenticated" : "anon"]);
  try { return await run(); } finally { await db.exec("reset role"); await db.exec("select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false)"); }
}
// Real PostgreSQL RLS/constraints; minimal Auth and Storage schema fixtures, NOT Supabase services.
beforeAll(async () => {
  db = new PGlite({extensions: {pg_trgm}});
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, unique(bucket_id,name));
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    alter table storage.objects enable row level security;
  `);
  await db.exec(readFileSync("supabase/migrations/202610020001_initial.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202610070001_services.sql", "utf8"));
  await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [a, {display_name: "Ana"}, b, {display_name: "Bruno"}]);
});
afterAll(async () => { await db?.close(); });
describe("Migración y permisos con dos identidades en PostgreSQL local", () => {
  it("crea perfiles por trigger y no expone perfiles de terceros", async () => {
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(2);
    await asUser(a, async () => {expect((await db.query("select * from public.profiles")).rows).toHaveLength(1); expect((await db.query("update public.profiles set display_name = 'Hack' where id = $1 returning id", [b])).rows).toHaveLength(0);});
    await asUser(null, async () => {await expect(db.query("select * from public.profiles")).rejects.toThrow();});
  });
  it("permite alta, consulta y edición propia; bloquea propiedad falsa", async () => {
    await asUser(a, async () => {
      await db.query("insert into products(id,owner_id,title,description,price,currency,category,condition,locality) values($1,$2,'Bicicleta','En perfecto estado',1200.50,'ARS','Otros','usado','Capital')", [product,a]);
      expect((await db.query("update products set price=1500.25 where id=$1 returning price", [product])).rows).toHaveLength(1);
      await expect(db.query("update products set owner_id=$1 where id=$2", [b,product])).rejects.toThrow();
      await expect(db.query("insert into products(owner_id,title,description,price,currency,category,condition,locality) values($1,'Bicicleta','En perfecto estado',0,'ARS','Otros','usado','Capital')", [b])).rejects.toThrow();
    });
    await asUser(b, async () => {expect((await db.query("select id from products")).rows).toHaveLength(1); expect((await db.query("update products set price=0 where id=$1 returning id", [product])).rows).toHaveLength(0); expect((await db.query("delete from products where id=$1 returning id", [product])).rows).toHaveLength(0);});
    await asUser(null, async () => {expect((await db.query("select product_seller($1) as name", [product])).rows[0]).toEqual({name: "Ana"});});
  });
  it("impide vincular un anuncio a un comercio ajeno", async () => {
    await asUser(b, async () => {await db.query("insert into businesses(id,owner_id,name,slug) values($1,$2,'Mi comercio','mi-comercio')", [business,b]);});
    await asUser(a, async () => {expect((await db.query("select * from businesses")).rows).toHaveLength(0); await expect(db.query("update products set business_id=$1 where id=$2", [business,product])).rejects.toThrow();});
  });
  it("pausados y vendidos solo son visibles para su propietario", async () => {
    for (const status of ["pausado", "vendido"]) {
      await asUser(a, async () => {await db.query("update products set status=$1 where id=$2", [status,product]); expect((await db.query("select * from products")).rows).toHaveLength(1);});
      for (const user of [b,null]) await asUser(user, async () => {expect((await db.query("select * from products")).rows).toHaveLength(0); expect((await db.query("select product_seller($1) as name", [product])).rows[0]).toEqual({name: null});});
    }
    await asUser(a, async () => {await db.query("update products set status='activo' where id=$1", [product]);});
  });
  it("aplica restricciones incluso sin usar los formularios", async () => {
    await asUser(a, async () => {
      await expect(db.query("update products set price=-1 where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set status='inexistente' where id=$1", [product])).rejects.toThrow();
      await expect(db.query("update products set image_path=$1 where id=$2", [`${b}/${product}.webp`,product])).rejects.toThrow();
    });
  });
  it("protege Storage y encola la limpieza en la misma transacción que el cambio", async () => {
    let path = "";
    await asUser(a, async () => {
      path = (await db.query<{path: string}>("select reserve_image() as path")).rows[0].path;
      await db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [path]);
      await db.query("update products set image_path=$1 where id=$2", [path, product]);
      expect((await db.query("select * from storage_cleanup where path=$1", [path])).rows).toHaveLength(0);
      expect((await db.query("delete from storage.objects where name=$1 returning name", [path])).rows).toHaveLength(0);
    });
    await asUser(null, async () => {expect((await db.query("select * from storage.objects where name=$1", [path])).rows).toHaveLength(1);});
    await asUser(b, async () => {
      await expect(db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [`${a}/${business}.webp`])).rejects.toThrow();
      expect((await db.query("delete from storage.objects where name=$1 returning name", [path])).rows).toHaveLength(0);
      expect((await db.query("update storage.objects set name='changed' where name=$1 returning name", [path])).rows).toHaveLength(0);
    });
    await asUser(a, async () => {await db.query("update products set status='pausado' where id=$1", [product]);});
    await asUser(null, async () => {expect((await db.query("select * from storage.objects where name=$1", [path])).rows).toHaveLength(0);});
    await asUser(a, async () => {await db.query("update products set image_path=null where id=$1", [product]); expect((await db.query("select ready from storage_cleanup where path=$1", [path])).rows[0]).toEqual({ready: true}); await db.query("delete from storage.objects where name=$1", [path]);});
  });
  it("la eliminación de cuenta bloquea nuevas escrituras y hace cascada sin afectar al otro usuario", async () => {
    await asUser(a, async () => {
      const ownBusiness = (await db.query<{id: string}>("insert into businesses(owner_id,name,slug) values($1,'Comercio Ana','comercio-ana') returning id", [a])).rows[0].id;
      await db.query("update products set business_id=$1 where id=$2", [ownBusiness, product]);
      await db.query("select begin_account_deletion()");
      await expect(db.query("select reserve_image()")).rejects.toThrow();
      expect((await db.query("update products set title='Nuevo nombre' where id=$1 returning id", [product])).rows).toHaveLength(0);
    });
    await db.query("delete from auth.users where id=$1", [a]);
    expect((await db.query("select * from products where owner_id=$1", [a])).rows).toHaveLength(0);
    expect((await db.query("select * from profiles where id=$1", [a])).rows).toHaveLength(0);
    expect((await db.query("select * from businesses where owner_id=$1", [a])).rows).toHaveLength(0);
    expect((await db.query("select * from profiles where id=$1", [b])).rows).toHaveLength(1);
    expect((await db.query("select * from businesses where owner_id=$1", [b])).rows).toHaveLength(1);
  });
});
describe("Servicios de oficio matriculados", () => {
  const c = "55555555-5555-4555-8555-555555555555";
  const d = "66666666-6666-4666-8666-666666666666";
  let service = "";
  const row = "insert into service_providers(owner_id,name,trade,license_number,license_body,description,phone,locality) values($1,'Juan Gas','Gasista','1234','ENARGAS','Instalaciones de gas',$2,'Capital') returning id";
  it("no permite a quien publica marcar su matrícula como verificada", async () => {
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)", [c, {display_name: "Carla"}, d, {display_name: "Diego"}]);
    await asUser(c, async () => {
      await expect(db.query("insert into service_providers(owner_id,name,trade,license_number,license_body,description,phone,locality,verified) values($1,'X Y','Gasista','1','E','Instalaciones de gas','2644123456','Capital',true)", [c])).rejects.toThrow();
      service = (await db.query<{id: string}>(row, [c, "2644123456"])).rows[0].id;
      expect((await db.query("select verified from service_providers where id=$1", [service])).rows[0]).toEqual({verified: false});
      await expect(db.query("update service_providers set verified=true where id=$1", [service])).rejects.toThrow();
      await expect(db.query(row, [d, "2644123456"])).rejects.toThrow();
      await expect(db.query("update service_providers set phone='abc' where id=$1", [service])).rejects.toThrow();
    });
  });
  it("retira la verificación al cambiar la matrícula y respeta visibilidad y propiedad", async () => {
    await db.query("update service_providers set verified=true where id=$1", [service]);
    await asUser(null, async () => {expect((await db.query("select verified from service_providers")).rows).toEqual([{verified: true}]);});
    await asUser(d, async () => {expect((await db.query("update service_providers set name='Hack' where id=$1 returning id", [service])).rows).toHaveLength(0); expect((await db.query("delete from service_providers where id=$1 returning id", [service])).rows).toHaveLength(0);});
    await asUser(c, async () => {await db.query("update service_providers set license_number='9999' where id=$1", [service]); expect((await db.query("select verified from service_providers where id=$1", [service])).rows[0]).toEqual({verified: false}); await db.query("update service_providers set status='pausado' where id=$1", [service]);});
    await asUser(d, async () => {expect((await db.query("select * from service_providers")).rows).toHaveLength(0);});
    await asUser(null, async () => {expect((await db.query("select * from service_providers")).rows).toHaveLength(0);});
  });
});
