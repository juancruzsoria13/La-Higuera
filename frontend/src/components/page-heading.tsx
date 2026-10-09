import Link from "next/link";
import { ArrowLeft } from "lucide-react";
/** Encabezado de página: volver, `h1` y bajada `lead`. Con `action`, el botón va a la derecha (page-head). */
export function PageHeading({title, description, back = "/", backLabel = "Volver al inicio", action}: {title: string; description: string; back?: string; backLabel?: string; action?: React.ReactNode}) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div className="flex max-w-[640px] flex-col gap-3"><Link href={back} className="mb-3 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />{backLabel}</Link><h1 className="h1">{title}</h1><p className="lead text-muted-foreground">{description}</p></div>{action}</div>;
}
