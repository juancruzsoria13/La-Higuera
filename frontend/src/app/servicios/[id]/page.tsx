import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, MessageCircle, ShieldCheck } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { getService } from "@/modules/services/queries";
import { uuidSchema } from "@/modules/products/schema";
import { deleteService } from "@/modules/services/actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { LicenseBadge } from "@/components/service-card";
import { ProductGallery } from "@/components/product-gallery";
import { buttonVariants } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
export default async function ServiceDetail({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{guardado?: string}>}) {
  const {id} = await params;
  if (!uuidSchema.safeParse(id).success || !isConfigured()) notFound();
  const service = await getService(id); if (!service) notFound();
  const user = await currentUser(); const owner = user?.id === service.owner_id;
  const search = await searchParams;
  return <div className="shell max-w-[1024px] py-7 sm:py-10"><Link href={owner ? "/mis-servicios" : "/servicios"} className="back mb-6"><ArrowLeft className="size-4" />{owner ? "Mis servicios" : "Volver a servicios"}</Link>{owner && search.guardado && <p role="status" className="notice notice-success mb-6">Tu servicio se guardó correctamente.</p>}
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10"><div className="flex min-w-0 flex-col gap-7"><div className="flex flex-col gap-4"><div className="flex flex-wrap gap-2"><span className="chip rounded-full bg-muted px-2.5 py-1 text-primary">{service.trade_name}</span>{service.requires_license && <LicenseBadge verified={service.verified} />}{owner && <span className="chip rounded-full border bg-card px-2.5 py-1 capitalize">{service.status}</span>}</div><div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada, fuera del cache compartido de Next */}
        {service.avatar && <img src={`/api/images/${service.avatar}`} alt={`Foto de ${service.name}`} className="size-20 shrink-0 rounded-full border border-border object-cover" />}<h1 className="h1 min-w-0 break-words">{service.name}</h1></div><p className="body-sm flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" />{service.locality_name}, San Juan</p></div>
      <section className="panel"><h2 className="h3">Acerca del servicio</h2><p className="body max-w-[65ch] whitespace-pre-wrap break-words text-muted-foreground">{service.description}</p></section>{service.work_images.length > 0 && <section className="panel" aria-labelledby="trabajos"><h2 id="trabajos" className="h3">Trabajos realizados</h2><ProductGallery images={service.work_images} title={`Trabajo de ${service.name}`} category="" /></section>}</div>
      <aside className="flex min-w-0 flex-col gap-5">{service.license_number && <section className="panel" aria-labelledby="matricula"><h2 id="matricula" className="h3">Matrícula</h2><div className="flex flex-col gap-1"><p className="title">N.º {service.license_number}</p><p className="body-sm text-muted-foreground">{service.license_body}</p></div><p className="caption font-normal text-muted-foreground">{service.verified ? "La Higuera comprobó esta matrícula." : "Dato declarado por el profesional; todavía no fue verificado por La Higuera. Pedí constancia antes de contratar."}</p></section>}
        <section className="panel" aria-labelledby="contacto"><h2 id="contacto" className="h3">Contacto</h2><div className="flex flex-col gap-2"><a href={`https://wa.me/${service.phone}`} target="_blank" rel="noopener noreferrer" className={buttonVariants()}><MessageCircle className="size-4" />WhatsApp</a><a href={`tel:+${service.phone}`} className={buttonVariants({variant: "outline"})}><Phone className="size-4" />+{service.phone}</a>{service.contact_email && <a href={`mailto:${service.contact_email}`} className={buttonVariants({variant: "outline"})}><Mail className="size-4" /><span className="truncate">{service.contact_email}</span></a>}</div></section>
        {owner && <div className="flex flex-wrap gap-3"><Link href={`/servicios/${id}/editar`} className={buttonVariants()}><Pencil className="size-4" />Editar</Link><DeleteDialog noun="servicio" action={deleteService.bind(null, id)} /></div>}
        <div className="safe"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p className="caption font-normal">La Higuera conecta personas. No procesa pagos ni garantiza la calidad de los trabajos.</p></div></aside></div></div>;
}
