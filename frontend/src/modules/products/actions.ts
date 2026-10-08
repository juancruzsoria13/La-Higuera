"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { api } from "@/lib/api";
import { MAX_IMAGES, productSchema, uuidSchema } from "./schema";
const names = ["title", "description", "price", "currency", "category_id", "condition", "locality_id", "operation", "contact_phone", "contact_email", "status"];

export async function saveProduct(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(form, names);
  const result = productSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Anuncio inválido.", values};
  const order = form.getAll("image_order").filter(value => typeof value === "string");
  if (order.length > MAX_IMAGES) return {error: `Podés subir hasta ${MAX_IMAGES} fotos por anuncio.`, values};
  // La API valida de nuevo, normaliza las fotos y aplica la versión para evitar pisar cambios.
  const body = new FormData();
  for (const name of [...names, "version"]) { const value = form.get(name); if (typeof value === "string") body.set(name, value); }
  for (const token of order) body.append("image_order", token);
  for (const image of form.getAll("images")) if (image instanceof File && image.size > 0) body.append("images", image);
  let saved: {id: string; clean: boolean};
  try { saved = await api(id ? `/products/${id}` : "/products", {method: id ? "PUT" : "POST", body}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos guardar el anuncio.", values}; }
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${saved.id}`);
  redirect(`/productos/${saved.id}?guardado=1${saved.clean ? "" : "&limpieza=pendiente"}`);
}
export async function renewProduct(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuidSchema.safeParse(id).success) return {error: "Anuncio inválido."};
  try { await api(`/products/${id}/renew`, {method: "POST"}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos renovar el anuncio. Intentá nuevamente."}; }
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${id}`);
  return {success: "Listo: el anuncio vuelve a estar visible por 60 días."};
}
export async function deleteProduct(id: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  if (!uuidSchema.safeParse(id).success || form.get("confirmation") !== "ELIMINAR") return {error: "Confirmá la eliminación del anuncio."};
  let result: {clean: boolean};
  try { result = await api(`/products/${id}`, {method: "DELETE"}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos eliminar el anuncio. Intentá nuevamente."}; }
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${id}`);
  redirect(`/mis-productos?eliminado=1${result.clean ? "" : "&limpieza=pendiente"}`);
}
