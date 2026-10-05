"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { fields, type ActionState } from "@/lib/action-state";
import { requireUser } from "./session";
import { loginSchema, profileSchema, registrationSchema } from "./schema";
import { BUCKET } from "@/modules/products/storage";

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
  const user = await requireUser();
  const values = fields(form, ["display_name", "locality"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return {error: parsed.error.issues[0].message, values};
  const client = await createClient();
  const {data, error} = await client.from("profiles").update(parsed.data).eq("id", user.id).select("id");
  if (error || !data?.length) return {error: "No pudimos guardar tu perfil. Si empezaste a eliminar la cuenta, volvé a intentar esa operación.", values};
  revalidatePath("/", "layout");
  return {success: "Tu perfil se guardó correctamente.", values};
}
export async function deleteAccount(_previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get("confirmation") !== "ELIMINAR") return {error: "Escribí ELIMINAR para confirmar."};
  const client = await createClient();
  try {
    const admin = adminClient(); // Validate configuration before freezing the account.
    const {error: lockError} = await client.rpc("begin_account_deletion");
    if (lockError) throw new Error("No pudimos iniciar la eliminación. Intentá nuevamente.");
    // Supabase requires removing owned Storage objects before deleting auth.users.
    for (;;) {
      const {data, error} = await admin.storage.from(BUCKET).list(user.id, {limit: 100});
      if (error) throw error;
      if (!data?.length) break;
      const {error: removalError} = await admin.storage.from(BUCKET).remove(data.map(file => `${user.id}/${file.name}`));
      if (removalError) throw removalError;
    }
    const {error} = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    // The Auth deletion cascades profile, businesses and products atomically in PostgreSQL.
    await admin.from("storage_cleanup").delete().eq("owner_id", user.id);
  } catch (error) {
    console.error("Account deletion failed", error instanceof Error ? error.message : "Supabase error");
    return {error: !process.env.SUPABASE_SERVICE_ROLE_KEY ? "La eliminación de cuentas todavía no está configurada en el servidor." : "No pudimos completar la eliminación. La cuenta puede haber quedado bloqueada para cambios y algunas imágenes eliminadas. Volvé a confirmar para reintentar."};
  }
  await client.auth.signOut();
  revalidatePath("/", "layout"); redirect("/?cuenta=eliminada");
}
