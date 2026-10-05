import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !secret || process.env.ALLOW_INTEGRATION_TESTS !== "true") throw new Error("Faltan credenciales o ALLOW_INTEGRATION_TESTS=true. Usá un proyecto de pruebas con las migraciones aplicadas.");
const options = {auth: {persistSession: false, autoRefreshToken: false}};
const admin = createClient(url, secret, options);
const anon = createClient(url, key, options);
const users: {id: string; email: string; password: string; client: SupabaseClient}[] = [];
const bucket = "product-images";
async function removeAccount(id: string) {
  for (;;) {
    const {data, error} = await admin.storage.from(bucket).list(id, {limit: 100});
    assert.ifError(error); if (!data?.length) break;
    const result = await admin.storage.from(bucket).remove(data.map(x => `${id}/${x.name}`)); assert.ifError(result.error);
  }
  const result = await admin.auth.admin.deleteUser(id); assert.ifError(result.error);
  const cleanup = await admin.from("storage_cleanup").delete().eq("owner_id", id); assert.ifError(cleanup.error);
}
try {
  for (const name of ["Ana", "Bruno"]) {
    const email = `la-higuera-test-${randomUUID()}@example.com`; const password = `Test!${randomUUID()}`;
    const {data, error} = await admin.auth.admin.createUser({email, password, email_confirm: true, user_metadata: {display_name: name}});
    assert.ifError(error); assert.ok(data.user);
    const client: SupabaseClient = createClient(url, key, options);
    users.push({id: data.user.id, email, password, client});
    assert.ifError((await client.auth.signInWithPassword({email, password})).error);
    const profile = await client.from("profiles").select("*").single(); assert.ifError(profile.error); assert.equal(profile.data.display_name, name);
  }
  const [a,b] = users;
  assert.ifError((await a.client.from("profiles").update({locality: "Rivadavia"}).eq("id", a.id)).error);
  assert.equal((await a.client.from("profiles").select("locality").eq("id",a.id).single()).data?.locality, "Rivadavia");
  assert.deepEqual((await b.client.from("profiles").select("*").eq("id",a.id)).data, []);
  assert.ok((await anon.from("profiles").select("*")).error);
  const input = {owner_id: a.id, title: "Bicicleta de prueba", description: "Prueba automatizada de persistencia", price: 1500.25, currency: "ARS", category: "Otros", condition: "usado", locality: "Capital", status: "activo"};
  const product = await a.client.from("products").insert(input).select("*").single(); assert.ifError(product.error); const id = product.data.id;
  const independent = createClient(url,key,options); assert.ifError((await independent.auth.signInWithPassword({email: a.email, password: a.password})).error);
  assert.equal((await independent.from("products").select("price").eq("id",id).single()).data?.price, 1500.25);
  assert.equal((await anon.rpc("product_seller", {product_id: id})).data, "Ana");
  assert.deepEqual((await b.client.from("products").update({price: 1}).eq("id",id).select("id")).data, []);
  assert.deepEqual((await b.client.from("products").delete().eq("id",id).select("id")).data, []);
  assert.ok((await b.client.from("products").insert(input)).error);
  assert.ok((await a.client.from("products").update({owner_id: b.id}).eq("id",id)).error);
  const business = await b.client.from("businesses").insert({owner_id:b.id, name:"Comercio de prueba", slug:`test-${randomUUID()}`}).select("id").single(); assert.ifError(business.error);
  assert.ok((await a.client.from("products").update({business_id:business.data.id}).eq("id",id)).error);
  for (const status of ["pausado", "vendido", "activo"]) {
    assert.ifError((await a.client.from("products").update({status}).eq("id",id)).error);
    const visible = await anon.from("products").select("id").eq("id",id); assert.ifError(visible.error); assert.equal(visible.data?.length, status === "activo" ? 1 : 0);
    assert.equal((await a.client.from("products").select("status").eq("id",id).single()).data?.status,status);
    if (status !== "activo") assert.deepEqual((await b.client.from("products").select("id").eq("id",id)).data, []);
  }
  const bytes = await sharp({create:{width:12,height:12,channels:3,background:"green"}}).webp().toBuffer();
  const reserve = await a.client.rpc("reserve_image"); assert.ifError(reserve.error); const path = reserve.data as string;
  assert.ifError((await a.client.storage.from(bucket).upload(path,bytes,{contentType:"image/webp"})).error);
  assert.ifError((await a.client.from("products").update({image_path:path}).eq("id",id)).error);
  assert.ifError((await anon.storage.from(bucket).download(path)).error);
  await b.client.storage.from(bucket).remove([path]);
  assert.ifError((await a.client.storage.from(bucket).download(path)).error);
  assert.ok((await b.client.storage.from(bucket).upload(`${a.id}/${randomUUID()}.webp`,bytes,{contentType:"image/webp"})).error);
  assert.ok((await a.client.storage.from(bucket).upload(path,bytes,{contentType:"image/webp",upsert:true})).error);
  assert.ifError((await a.client.from("products").update({status:"pausado"}).eq("id",id)).error);
  assert.ok((await anon.storage.from(bucket).download(path)).error);
  assert.ok((await b.client.storage.from(bucket).download(path)).error);
  assert.ifError((await a.client.from("products").delete().eq("id",id)).error);
  assert.equal((await a.client.from("storage_cleanup").select("ready").eq("path",path).single()).data?.ready,true);
  assert.ifError((await a.client.storage.from(bucket).remove([path])).error);
  assert.ifError((await a.client.from("storage_cleanup").delete().eq("path",path)).error);
  // Verify Auth deletion cascades a business with an attached product, not only an empty account.
  const ownBusiness = await a.client.from("businesses").insert({owner_id:a.id,name:"Comercio Ana",slug:`test-${randomUUID()}`}).select("id").single(); assert.ifError(ownBusiness.error);
  assert.ifError((await a.client.from("products").insert({...input,business_id:ownBusiness.data.id})).error);
  assert.ifError((await a.client.rpc("begin_account_deletion")).error);
  assert.ok((await a.client.rpc("reserve_image")).error);
  await removeAccount(a.id);
  assert.equal((await admin.from("profiles").select("id").eq("id",a.id)).data?.length,0);
  assert.equal((await admin.from("products").select("id").eq("owner_id",a.id)).data?.length,0);
  assert.equal((await admin.from("businesses").select("id").eq("owner_id",a.id)).data?.length,0);
  assert.ok((await a.client.auth.getUser()).error);
  assert.equal((await b.client.from("profiles").select("id").eq("id",b.id)).data?.length,1);
  users.shift();
  console.log("OK: Supabase real, dos usuarios, persistencia en nueva sesión, CRUD, RLS, comercios, Storage privado y eliminación de Auth.");
} finally {
  for (const user of users) {try {await removeAccount(user.id);} catch {console.error("No se pudo limpiar el usuario temporal:",user.id); process.exitCode = 1;}}
}
