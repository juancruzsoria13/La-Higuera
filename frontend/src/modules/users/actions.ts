"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { api, json } from "@/lib/api";
import { fields, type ActionState } from "@/lib/action-state";
import { requireUser } from "./session";
import { loginSchema, profileSchema, registrationSchema } from "./schema";

export async function register(_previous: ActionState, form: FormData): Promise<ActionState> {
  const values = fields(form, ["display_name", "email"]);
  const parsed = registrationSchema.safeParse({...values, password: form.get("password")});
  if (!parsed.success) return {error: parsed.error.issues[0].message, values};
  const client = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return {error: "Falta configurar la dirección del sitio para confirmar el correo.", values};
  const {data, error} = await client.auth.signUp({email: parsed.data.email, password: parsed.data.password,
    options: {data: {display_name: parsed.data.display_name}, emailRedirectTo: `${siteUrl}/auth/confirm`},
  });
  if (error) return {error: error.code === "weak_password" ? "Elegí una contraseña más segura." : "No pudimos completar el registro. Revisá los datos o intentá más tarde.", values};
  if (data.session) redirect("/mi-perfil?bienvenida=1");
  return {success: "Revisá tu correo para confirmar la cuenta. Si ya tenés una cuenta con ese correo, ingresá con tu contraseña.", values};
}
export async function login(_previous: ActionState, form: FormData): Promise<ActionState> {
  const values = fields(form, ["email"]);
  const parsed = loginSchema.safeParse({...values, password: form.get("password")});
  if (!parsed.success) return {error: parsed.error.issues[0].message, values};
  const client = await createClient();
  const {error} = await client.auth.signInWithPassword(parsed.data);
  if (error) return {error: error.code === "email_not_confirmed" ? "Confirmá tu correo antes de ingresar. Revisá también la carpeta de spam." : "No pudimos iniciar sesión. Revisá el correo y la contraseña, o intentá más tarde.", values};
  revalidatePath("/", "layout"); redirect("/mis-productos");
}
export async function logout() {
  const client = await createClient();
  await client.auth.signOut();
  revalidatePath("/", "layout"); redirect("/");
}
export async function updateProfile(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(form, ["display_name", "locality_id"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return {error: parsed.error.issues[0].message, values};
  try { await api("/profile", json(parsed.data, "PUT")); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos guardar tu perfil.", values}; }
  revalidatePath("/", "layout");
  return {success: "Tu perfil se guardó correctamente.", values};
}
export async function deleteAccount(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  if (form.get("confirmation") !== "ELIMINAR") return {error: "Escribí ELIMINAR para confirmar."};
  // La API bloquea la cuenta, borra sus imágenes y elimina el usuario de Auth con la clave secreta.
  try { await api("/account/delete", json({confirmation: "ELIMINAR"})); }
  catch (error) { return {error: error instanceof Error ? error.message : "No pudimos completar la eliminación."}; }
  const client = await createClient();
  await client.auth.signOut();
  revalidatePath("/", "layout"); redirect("/?cuenta=eliminada");
}
