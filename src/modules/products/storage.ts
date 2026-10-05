import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeImage } from "./images";
export const BUCKET = "product-images";
export async function cleanImages(client: SupabaseClient, ownerId: string) {
  const {data, error} = await client.from("storage_cleanup").select("path").eq("owner_id", ownerId).eq("ready", true).limit(100);
  if (error) return false;
  let complete = true;
  for (const {path} of data ?? []) {
    const {error: removalError} = await client.storage.from(BUCKET).remove([path]);
    if (removalError) { complete = false; continue; }
    const {error: deleteError} = await client.from("storage_cleanup").delete().eq("path", path).eq("owner_id", ownerId);
    if (deleteError) complete = false;
  }
  return complete;
}
export async function uploadImage(client: SupabaseClient, file: File) {
  const bytes = await normalizeImage(file);
  const {data: path, error} = await client.rpc("reserve_image");
  if (error || !path) throw new Error("No pudimos preparar la imagen. Intentá nuevamente.");
  const {error: uploadError} = await client.storage.from(BUCKET).upload(path, bytes, {contentType: "image/webp", upsert: false});
  if (uploadError) {
    await client.rpc("abandon_image", {image: path});
    throw new Error("No pudimos subir la imagen. Tus datos siguen en el formulario; volvé a seleccionar el archivo.");
  }
  return path as string;
}
