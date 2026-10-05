"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { productSchema, uuidSchema } from "./schema";
import { uploadImage, cleanImages } from "./storage";
const names = ["title", "description", "price", "currency", "category", "condition", "locality", "status"];

export async function saveProduct(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = fields(form, names);
  const result = productSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Anuncio inválido.", values};
  const client = await createClient();
  let imagePath: string | null = null;
  let uploaded: string | null = null;
  let productId = id;
  let clean = true;
  try {
    if (id) {
      const {data, error} = await client.from("products").select("image_path, updated_at").eq("id", id).eq("owner_id", user.id).maybeSingle();
      if (error || !data) return {error: "No pudimos encontrar un anuncio tuyo con ese identificador.", values};
      if (data.updated_at !== form.get("version")) return {error: "El anuncio cambió en otra pestaña. Recargá la página antes de guardar.", values};
      imagePath = data.image_path;
    }
    if (form.get("remove_image") === "on") imagePath = null;
    const image = form.get("image");
    if (image instanceof File && image.size > 0) { uploaded = await uploadImage(client, image); imagePath = uploaded; }
    const payload = {...result.data, image_path: imagePath};
    const query = id
      ? client.from("products").update(payload).eq("id", id).eq("owner_id", user.id).eq("updated_at", String(form.get("version")))
      : client.from("products").insert({...payload, owner_id: user.id, business_id: null});
    const {data, error} = await query.select("id").single();
    if (error || !data) throw new Error("No pudimos guardar el anuncio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente.");
    productId = data.id;
    clean = await cleanImages(client, user.id);
  } catch (error) {
    if (uploaded) { await client.rpc("abandon_image", {image: uploaded}); }
    await cleanImages(client, user.id);
    return {error: error instanceof Error ? error.message : "No pudimos guardar el anuncio.", values};
  }
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${productId}`);
  redirect(`/productos/${productId}?guardado=1${clean ? "" : "&limpieza=pendiente"}`);
}
export async function deleteProduct(id: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuidSchema.safeParse(id).success || form.get("confirmation") !== "ELIMINAR") return {error: "Confirmá la eliminación del anuncio."};
  const client = await createClient();
  const {data, error} = await client.from("products").delete().eq("id", id).eq("owner_id", user.id).select("id");
  if (error || !data?.length) return {error: "No pudimos eliminar el anuncio. Intentá nuevamente."};
  const clean = await cleanImages(client, user.id);
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${id}`);
  redirect(`/mis-productos?eliminado=1${clean ? "" : "&limpieza=pendiente"}`);
}
