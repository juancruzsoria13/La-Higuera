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
  const user = await requireUser(); const params = await searchParams;
  const page = Math.max(1, Math.min(10000, parseInt(params.page ?? "1") || 1));
  const {services, count} = await listServices({ownerId: user.id, page});
  return <div className="shell py-10"><div className="flex flex-wrap items-center justify-between gap-4"><PageHeading title="Mis servicios" description="Tus perfiles de oficio. Editá tus datos o pausá la visibilidad." back="/servicios" backLabel="Servicios" /><Link href="/servicios/nuevo" className={buttonVariants({className: "mb-8"})}><Plus className="size-4" />Nuevo servicio</Link></div>{params.eliminado && <p className="notice notice-success mb-6">El servicio se eliminó correctamente.</p>}{services.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{services.map(s => <ServiceCard service={s} manage key={s.id} />)}</div> : <div className="rounded-2xl border border-dashed bg-card p-14 text-center"><Wrench className="mx-auto mb-4 size-10 text-primary/60" /><h2 className="text-xl font-semibold">{page > 1 ? "No hay servicios en esta página" : "Todavía no ofrecés servicios"}</h2><p className="mt-3 text-sm text-muted-foreground">Sumá tu oficio y tu matrícula para que te encuentren.</p></div>}<Pagination page={page} count={count} base="/mis-servicios" /></div>;
}
