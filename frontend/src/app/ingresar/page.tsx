import { PageHeading } from "@/components/page-heading";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/env";
import { AuthForm } from "@/modules/users/auth-form";
export const metadata = {title: "Ingresar"};
export default async function Login({searchParams}: {searchParams: Promise<{confirmacion?: string}>}) {
  const params = await searchParams;
  return <div className="shell max-w-[480px] py-7 sm:py-10"><PageHeading back={null} title="Qué bueno verte de nuevo" description="Ingresá para publicar y gestionar tus anuncios." />{params.confirmacion === "error" && <p className="notice notice-error mb-5">El enlace de confirmación no es válido o ya venció. Intentá ingresar si ya confirmaste tu correo; en caso contrario, solicitá un nuevo registro.</p>}{isConfigured() ? <AuthForm /> : <SetupNotice />}</div>;
}
