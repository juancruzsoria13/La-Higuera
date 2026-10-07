import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export function PageHeading({title, description, back = "/", backLabel = "Volver al inicio"}: {title: string; description: string; back?: string; backLabel?: string}) {
  return <div className="mb-9"><Link href={back} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />{backLabel}</Link><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1><p className="mt-3 text-muted-foreground">{description}</p></div>;
}
