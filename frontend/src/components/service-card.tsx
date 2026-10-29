import Link from "next/link";
import { ArrowRight, BadgeCheck, IdCard, MapPin } from "lucide-react";
import type { ServiceProvider } from "@/modules/services/schema";
import { ProductImage } from "./product-image";
export function LicenseBadge({verified}: {verified: boolean}) {
  return verified
    ? <span className="chip inline-flex items-center gap-1 rounded-full bg-success-surface px-2.5 py-1 font-semibold text-success-foreground"><BadgeCheck className="size-3.5" />Matrícula verificada</span>
    : <span className="chip inline-flex items-center gap-1 rounded-full bg-promo px-2.5 py-1 font-bold text-promo-foreground"><IdCard className="size-3.5" />Matrícula declarada</span>;
}
export function ServiceCard({service, manage = false}: {service: ServiceProvider; manage?: boolean}) {
  // Primero se ve el trabajo: la portada es la primera foto de trabajos y, si no hay, la de perfil.
  const cover = service.work_images[0] ?? service.avatar;
  const avatar = service.work_images.length > 0 ? service.avatar : null;
  return <article className="pcard group text-foreground"><Link href={`/servicios/${service.id}`} className="flex flex-1 flex-col">
    <div className="relative">
      <ProductImage path={cover} title={service.name} />
      {service.requires_license && <span className="absolute left-3 top-3"><LicenseBadge verified={service.verified} /></span>}
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada, fuera del cache compartido de Next */}
      {avatar && <img src={`/api/images/${avatar}`} alt="" loading="lazy" className="absolute -bottom-6 left-4 size-12 rounded-full border-[3px] border-card bg-muted object-cover" />}
    </div>
    <div className={`flex flex-1 flex-col p-4 sm:p-5 ${avatar ? "pt-8 sm:pt-8" : ""}`}>
      <p className="kicker w-fit text-primary underline decoration-2 underline-offset-4">{service.trade_name}{manage && ` · ${service.status}`}</p>
      <h3 className="title mt-2 line-clamp-2">{service.name}</h3>
      <p className="body-sm mt-2 line-clamp-2 text-muted-foreground">{service.description}</p>
      {manage ? service.license_number && <p className="caption mt-3 text-muted-foreground">Mat. {service.license_number} · {service.license_body}</p>
        : <div className="caption mt-auto flex items-center justify-between gap-3 pt-4 text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{service.locality_name}</span></span><span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">Ver perfil<ArrowRight className="size-3.5" /></span></div>}
    </div>
  </Link>{manage && <Link className="label flex items-center justify-between border-t px-5 py-3.5 text-primary hover:bg-muted" href={`/servicios/${service.id}/editar`}>Editar servicio<ArrowRight className="size-4" /></Link>}</article>;
}
