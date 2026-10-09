import { requireUser } from "@/modules/users/session";
import { getProfile } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { ServiceForm } from "@/modules/services/service-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Ofrecer mis servicios"};
export default async function NewService() {
  await requireUser(); const [data, catalog] = await Promise.all([getProfile().catch(() => null), getCatalog()]);
  return <div className="shell max-w-3xl py-7 sm:py-10"><PageHeading title="Ofrecé tus servicios" description="Armá tu perfil de oficio con tus datos de contacto y, si tu oficio la exige, tu matrícula." back="/servicios" backLabel="Servicios" /><ServiceForm catalog={catalog} locality={data?.locality_id} name={data?.display_name} /></div>;
}
