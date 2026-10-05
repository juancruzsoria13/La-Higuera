import { requireUser } from "@/modules/users/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/modules/users/profile-form";
import { deleteAccount } from "@/modules/users/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Mi perfil"};
export default async function Profile({searchParams}: {searchParams: Promise<{bienvenida?: string}>}) {
  const user = await requireUser(); const client = await createClient();
  const {data, error} = await client.from("profiles").select("display_name, locality").eq("id", user.id).single();
  if (error || !data) throw new Error("No pudimos cargar tu perfil.");
  const params = await searchParams;
  return <div className="shell max-w-2xl py-10"><PageHeading title="Mi perfil" description="Así te conocen en La Higuera." />{params.bienvenida && <p className="notice notice-success mb-5">¡Tu cuenta está lista! Completá tu perfil para empezar.</p>}<ProfileForm name={data.display_name} locality={data.locality} email={user.email ?? ""} /><section className="mt-8 rounded-2xl border border-red-200 p-6"><h2 className="font-semibold">Eliminar cuenta</h2><p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">Se eliminarán de forma definitiva tu perfil, tus anuncios, tus comercios y sus imágenes.</p><DeleteDialog action={deleteAccount} account /></section></div>;
}
