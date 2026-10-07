"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { api } from "@/lib/api";
import { productSchema, uuidSchema } from "./schema";
const names = ["title", "description", "price", "currency", "category", "condition", "locality", "status"];

export async function saveProduct(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(form, names);
  const result = productSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Anuncio inválido.", values};
  // La API valida de nuevo, normaliza la imagen y aplica la versión para evitar pisar cambios.
  const body = new FormData();
  for (const name of [...names, "version", "remove_image"]) { const value = form.get(name); if (typeof value === "string") body.set(name, value); }
  const image = form.get("image");
  if (image instanceof File && image.size > 0) body.set("image", image);
  let saved: {id: string; clean: boolean};
  try { saved = await api(id ? `/products/${id}` : "/products", {method: id ? "PUT" : "POST", body}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos guardar el anuncio.", values}; }
  revalidatePath("/"); revalidatePath("/mis-productos"); revalidatePath(`/productos/${saved.id}`);
  redirect(`/productos/${saved.id}?guardado=1${saved.clean ? "" : "&limpieza=pendiente"}`);
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
