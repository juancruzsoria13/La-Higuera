import Link from "next/link";
import { MapPin, ArrowUpRight, BadgeCheck, Wrench } from "lucide-react";
import type { ServiceProvider } from "@/modules/services/schema";
export function LicenseBadge({verified}: {verified: boolean}) {
  return verified
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><BadgeCheck className="size-3.5" />Matrícula verificada</span>
    : <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Matrícula declarada</span>;
}
export function ServiceCard({service, manage = false}: {service: ServiceProvider; manage?: boolean}) {
  return <article className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"><Link href={`/servicios/${service.id}`} className="block p-5"><div className="mb-4 flex items-start justify-between gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Wrench className="size-5" /></span>{service.requires_license && <LicenseBadge verified={service.verified} />}</div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-primary">{service.trade_name}{manage && ` · ${service.status}`}</p><h3 className="line-clamp-2 font-semibold">{service.name}</h3><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>{service.license_number && <p className="mt-3 text-xs text-muted-foreground">Mat. {service.license_number} · {service.license_body}</p>}<div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{service.locality_name}</span><ArrowUpRight className="size-4" /></div></Link>{manage && <Link className="block border-t px-5 py-3 text-sm font-semibold text-primary hover:bg-muted" href={`/servicios/${service.id}/editar`}>Editar servicio →</Link>}</article>;
}
