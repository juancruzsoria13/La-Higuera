import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configurá Supabase en .env.local antes de ejecutar el mantenimiento.");
const client = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
const deadline = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
let total = 0;
// Atomically claim expired reservations. Product linking locks the same row,
// so a pending upload cannot be linked while its cleanup is being claimed.
const {error: claimError} = await client.from("storage_cleanup").update({ready: true}).eq("ready", false).lt("created_at", deadline);
if (claimError) throw claimError;
for (;;) {
  const {data, error} = await client.from("storage_cleanup").select("path").eq("ready", true).limit(100);
  if (error) throw error;
  if (!data?.length) break;
  let progress = 0;
  for (const {path} of data) {
    const {data: linked, error: lookupError} = await client.from("products").select("id").eq("image_path", path).maybeSingle();
    if (lookupError) throw lookupError;
    if (linked) { console.error("Archivo todavía asociado; se conserva:", path); continue; }
    const {error: removalError} = await client.storage.from("product-images").remove([path]);
    if (removalError) {console.error("No se pudo limpiar", path, removalError.message); continue;}
    const {error: deleteError} = await client.from("storage_cleanup").delete().eq("path", path);
    if (deleteError) throw deleteError;
    progress++; total++;
  }
  if (!progress) throw new Error("Quedan archivos pendientes; corregí el problema y reintentá.");
}
console.log(`Limpieza completada: ${total} archivos.`);
