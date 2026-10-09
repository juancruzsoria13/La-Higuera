import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { requireUser } from "@/modules/users/session";
import { listServices } from "@/modules/services/queries";
import { ServiceCard } from "@/components/service-card";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
export const metadata = {title: "Mis servicios"};
export default async function MyServices({searchParams}: {searchParams: Promise<{page?: string; eliminado?: string}>}) {
  await requireUser(); const params = await searchParams;
  const page = Math.max(1, Math.min(10000, parseInt(params.page ?? "1") || 1));
  const {services, count} = await listServices({mine: true, page});
  return <div className="shell py-7 sm:py-10"><PageHeading title="Mis servicios" description="Tus perfiles de oficio. Editá tus datos o pausá la visibilidad." back="/servicios" backLabel="Servicios" action={<Link href="/servicios/nuevo" className={buttonVariants()}><Plus className="size-4" />Nuevo servicio</Link>} />{params.eliminado && <p className="notice notice-success mb-6">El servicio se eliminó correctamente.</p>}{services.length ? <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{services.map(s => <ServiceCard service={s} manage key={s.id} />)}</div> : <div className="rounded-2xl border border-dashed border-border-strong bg-card p-14 text-center"><Wrench className="mx-auto mb-4 size-10 text-primary/60" /><h2 className="h3">{page > 1 ? "No hay servicios en esta página" : "Todavía no ofrecés servicios"}</h2><p className="body-sm mt-3 text-muted-foreground">Sumá tu oficio para que te encuentren. Si exige matrícula, la cargás en el mismo formulario.</p></div>}<div className="mt-6"><Pagination page={page} count={count} base="/mis-servicios" /></div></div>;
}
