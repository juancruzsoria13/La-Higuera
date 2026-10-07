import { notFound } from "next/navigation";
import { requireUser } from "@/modules/users/session";
import { getService } from "@/modules/services/queries";
import { uuidSchema } from "@/modules/products/schema";
import { ServiceForm } from "@/modules/services/service-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Editar servicio"};
export default async function EditService({params}: {params: Promise<{id: string}>}) {
  const user = await requireUser(); const {id} = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const service = await getService(id);
  if (!service || service.owner_id !== user.id) notFound();
  return <div className="shell max-w-3xl py-10"><PageHeading title="Editar servicio" description="Actualizá tus datos o pausá tu perfil." back={`/servicios/${id}`} backLabel="Volver al perfil" /><ServiceForm service={service} /></div>;
}
