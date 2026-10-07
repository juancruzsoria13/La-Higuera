import { requireUser } from "@/modules/users/session";
import { createClient } from "@/lib/supabase/server";
import { ServiceForm } from "@/modules/services/service-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Ofrecer mis servicios"};
export default async function NewService() {
  const user = await requireUser(); const client = await createClient();
  const {data} = await client.from("profiles").select("locality, display_name").eq("id", user.id).single();
  return <div className="shell max-w-3xl py-10"><PageHeading title="Ofrecé tus servicios" description="Armá tu perfil de oficio con matrícula y datos de contacto." back="/servicios" backLabel="Servicios" /><ServiceForm locality={data?.locality} name={data?.display_name} /></div>;
}
