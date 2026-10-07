import { requireUser } from "@/modules/users/session";
import { getProfile } from "@/lib/api";
import { ServiceForm } from "@/modules/services/service-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Ofrecer mis servicios"};
export default async function NewService() {
  await requireUser(); const data = await getProfile().catch(() => null);
  return <div className="shell max-w-3xl py-10"><PageHeading title="Ofrecé tus servicios" description="Armá tu perfil de oficio con matrícula y datos de contacto." back="/servicios" backLabel="Servicios" /><ServiceForm locality={data?.locality} name={data?.display_name} /></div>;
}
