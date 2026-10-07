"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/users/session";
import { type ActionState, fields } from "@/lib/action-state";
import { uuidSchema } from "@/modules/products/schema";
import { serviceSchema } from "./schema";
const names = ["name", "trade", "license_number", "license_body", "description", "phone", "locality", "status"];

export async function saveService(id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = fields(form, names);
  const result = serviceSchema.safeParse(values);
  if (!result.success) return {error: result.error.issues[0].message, values};
  if (id && !uuidSchema.safeParse(id).success) return {error: "Servicio inválido.", values};
  const client = await createClient();
  const query = id
    ? client.from("service_providers").update(result.data).eq("id", id).eq("owner_id", user.id).eq("updated_at", String(form.get("version")))
    : client.from("service_providers").insert({...result.data, owner_id: user.id});
  const {data, error} = await query.select("id").single();
  if (error || !data) return {error: "No pudimos guardar el servicio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente.", values};
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/mis-servicios"); revalidatePath(`/servicios/${data.id}`);
  redirect(`/servicios/${data.id}?guardado=1`);
}
export async function deleteService(id: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuidSchema.safeParse(id).success || form.get("confirmation") !== "ELIMINAR") return {error: "Confirmá la eliminación del servicio."};
  const client = await createClient();
  const {data, error} = await client.from("service_providers").delete().eq("id", id).eq("owner_id", user.id).select("id");
  if (error || !data?.length) return {error: "No pudimos eliminar el servicio. Intentá nuevamente."};
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/mis-servicios"); revalidatePath(`/servicios/${id}`);
  redirect("/mis-servicios?eliminado=1");
}
