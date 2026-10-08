import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, MessageCircle, ShieldCheck } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { getService } from "@/modules/services/queries";
import { uuidSchema } from "@/modules/products/schema";
import { deleteService } from "@/modules/services/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { LicenseBadge } from "@/components/service-card";
import { buttonVariants } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
export default async function ServiceDetail({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{guardado?: string}>}) {
  const {id} = await params;
  if (!uuidSchema.safeParse(id).success || !isConfigured()) notFound();
  const service = await getService(id); if (!service) notFound();
  const user = await currentUser(); const owner = user?.id === service.owner_id;
  const search = await searchParams;
  return <div className="shell max-w-4xl py-10"><Link href={owner ? "/mis-servicios" : "/servicios"} className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{owner ? "Mis servicios" : "Volver a servicios"}</Link>{owner && search.guardado && <p role="status" className="notice notice-success mb-6">Tu servicio se guardó correctamente.</p>}
    <div className="grid items-start gap-8 md:grid-cols-[1.4fr_1fr]"><div><div className="mb-4 flex flex-wrap gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs text-primary">{service.trade_name}</span>{service.requires_license && <LicenseBadge verified={service.verified} />}{owner && <span className="rounded-full border px-3 py-1.5 text-xs capitalize">{service.status}</span>}</div><h1 className="break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{service.name}</h1><p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{service.locality_name}, San Juan</p>
      <section className="mt-7 rounded-2xl border bg-card p-6"><h2 className="text-lg font-semibold">Acerca del servicio</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{service.description}</p></section></div>
      <aside className="space-y-4">{service.license_number && <div className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Matrícula</p><p className="mt-2 font-semibold">N.º {service.license_number}</p><p className="text-sm text-muted-foreground">{service.license_body}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{service.verified ? "La Higuera comprobó esta matrícula." : "Dato declarado por el profesional; todavía no fue verificado por La Higuera. Pedí constancia antes de contratar."}</p></div>}
        <div className="rounded-2xl border bg-card p-5"><p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Contacto</p><div className="flex flex-col gap-2"><a href={`https://wa.me/${service.phone}`} target="_blank" rel="noopener noreferrer" className={buttonVariants()}><MessageCircle className="size-4" />WhatsApp</a><a href={`tel:+${service.phone}`} className={buttonVariants({variant: "outline"})}><Phone className="size-4" />+{service.phone}</a>{service.contact_email && <a href={`mailto:${service.contact_email}`} className={buttonVariants({variant: "outline"})}><Mail className="size-4" /><span className="truncate">{service.contact_email}</span></a>}</div></div>
        {owner && <div className="flex flex-wrap gap-3"><Link href={`/servicios/${id}/editar`} className={buttonVariants()}><Pencil className="size-4" />Editar</Link><DeleteDialog noun="servicio" action={deleteService.bind(null, id)} /></div>}
        <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 size-5 shrink-0 text-primary" /><p>La Higuera conecta personas. No procesa pagos ni garantiza la calidad de los trabajos.</p></div></aside></div></div>;
}
