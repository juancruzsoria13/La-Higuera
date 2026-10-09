"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { api } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { MAX_IMAGES, uuidSchema } from "@/modules/products/schema";
import { LICENSE_REQUIRED, serviceSchema } from "./schema";
const names = ["name", "trade_id", "license_number", "license_body", "description", "phone", "locality_id", "contact_email", "status"];

export async function saveService(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(form, names);
  const result = serviceSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Servicio inválido.", values};
  const trade = (await getCatalog()).trades.find(t => t.id === result.data.trade_id);
  if (trade?.requires_license && !(result.data.license_number && result.data.license_body)) return {error: LICENSE_REQUIRED, values};
  const order = form.getAll("image_order").filter(value => typeof value === "string");
  if (order.length > MAX_IMAGES) return {error: `Podés subir hasta ${MAX_IMAGES} fotos por servicio.`, values};
  // La API valida de nuevo, normaliza las fotos y aplica la versión para evitar pisar cambios.
  const body = new FormData();
  for (const name of [...names, "version", "avatar"]) { const value = form.get(name); if (typeof value === "string") body.set(name, value); }
  for (const token of order) body.append("image_order", token);
  for (const image of form.getAll("images")) if (image instanceof File && image.size > 0) body.append("images", image);
  const avatar = form.get("avatar_file");
  if (avatar instanceof File && avatar.size > 0) body.set("avatar_file", avatar);
  let saved: {id: string};
  try { saved = await api(id ? `/services/${id}` : "/services", {method: id ? "PUT" : "POST", body}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos guardar el servicio.", values}; }
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/mis-servicios"); revalidatePath(`/servicios/${saved.id}`);
  redirect(`/servicios/${saved.id}?guardado=1`);
}
export async function deleteService(id: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  if (!uuidSchema.safeParse(id).success || form.get("confirmation") !== "ELIMINAR") return {error: "Confirmá la eliminación del servicio."};
  try { await api(`/services/${id}`, {method: "DELETE"}); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos eliminar el servicio. Intentá nuevamente."}; }
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/mis-servicios"); revalidatePath(`/servicios/${id}`);
  redirect("/mis-servicios?eliminado=1");
}
