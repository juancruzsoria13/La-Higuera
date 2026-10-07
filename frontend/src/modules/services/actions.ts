"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { api, json } from "@/lib/api";
import { uuidSchema } from "@/modules/products/schema";
import { serviceSchema } from "./schema";
const names = ["name", "trade", "license_number", "license_body", "description", "phone", "locality", "status"];

export async function saveService(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(form, names);
  const result = serviceSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Servicio inválido.", values};
  let saved: {id: string};
  try { saved = await api(id ? `/services/${id}` : "/services", json({...result.data, version: String(form.get("version") ?? "")}, id ? "PUT" : "POST")); }
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
