import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Wrench } from "lucide-react";
import type { ServiceProvider } from "@/modules/services/schema";
export function LicenseBadge({verified}: {verified: boolean}) {
  return verified
    ? <span className="chip inline-flex items-center gap-1 rounded-full bg-success-surface px-2.5 py-1 font-semibold text-success-foreground"><BadgeCheck className="size-3.5" />Matrícula verificada</span>
    : <span className="chip inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Matrícula declarada</span>;
}
export function ServiceCard({service, manage = false}: {service: ServiceProvider; manage?: boolean}) {
  return <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground transition-shadow hover:shadow-[0_10px_15px_-3px_rgba(22,75,250,.05),0_4px_6px_-4px_rgba(22,75,250,.05)]"><Link href={`/servicios/${service.id}`} className="flex flex-1 flex-col p-5">
    <div className="mb-4 flex items-start justify-between gap-3"><span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-primary">{service.avatar
      // eslint-disable-next-line @next/next/no-img-element -- imagen privada, fuera del cache compartido de Next
      ? <img src={`/api/images/${service.avatar}`} alt="" loading="lazy" className="size-full object-cover" />
      : <Wrench className="size-5" />}</span>{service.requires_license && <LicenseBadge verified={service.verified} />}</div>
    <p className="overline text-primary">{service.trade_name}{manage && ` · ${service.status}`}</p>
    <h3 className="title mt-2 line-clamp-2">{service.name}</h3>
    <p className="body-sm mt-2 line-clamp-2 text-muted-foreground">{service.description}</p>
    {manage ? service.license_number && <p className="caption mt-3 text-muted-foreground">Mat. {service.license_number} · {service.license_body}</p>
      : <div className="caption mt-auto flex items-center pt-4 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{service.locality_name}</span></div>}
  </Link>{manage && <Link className="label flex items-center justify-between border-t px-5 py-3.5 text-primary hover:bg-muted" href={`/servicios/${service.id}/editar`}>Editar servicio<ArrowRight className="size-4" /></Link>}</article>;
}
