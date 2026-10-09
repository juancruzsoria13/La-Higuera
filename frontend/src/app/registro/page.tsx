import { PageHeading } from "@/components/page-heading";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/env";
import { AuthForm } from "@/modules/users/auth-form";
export const metadata = {title: "Crear cuenta"};
export default function Register() {
  return <div className="shell max-w-[480px] py-7 sm:py-10"><PageHeading back={null} title="Sumate a La Higuera" description="Creá tu cuenta y empezá a publicar en San Juan." />{isConfigured() ? <AuthForm signup /> : <SetupNotice />}</div>;
}
