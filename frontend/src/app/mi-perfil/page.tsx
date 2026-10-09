import { requireUser } from "@/modules/users/session";
import { getProfile } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { ProfileForm } from "@/modules/users/profile-form";
import { deleteAccount } from "@/modules/users/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Mi perfil"};
export default async function Profile({searchParams}: {searchParams: Promise<{bienvenida?: string}>}) {
  const user = await requireUser(); const [data, {localities}] = await Promise.all([getProfile(), getCatalog()]);
  const params = await searchParams;
  return <div className="shell flex max-w-[672px] flex-col gap-6 py-7 sm:py-10"><PageHeading title="Mi perfil" description="Así te conocen en La Higuera." />{params.bienvenida && <p className="notice notice-success">¡Tu cuenta está lista! Completá tu perfil para empezar.</p>}<ProfileForm name={data.display_name} locality={data.locality_id} localities={localities} email={user.email ?? ""} /><section className="form-panel border-error-border" aria-labelledby="borrar"><div className="flex flex-col gap-1.5"><h2 id="borrar" className="panel-title">Eliminar cuenta</h2><p className="body-sm text-muted-foreground">Se eliminarán de forma definitiva tu perfil, tus anuncios, tus comercios y sus imágenes.</p></div><div><DeleteDialog action={deleteAccount} account /></div></section></div>;
}
