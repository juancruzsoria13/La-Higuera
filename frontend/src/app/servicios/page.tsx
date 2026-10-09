import Link from "next/link";
import { Plus, Search, Wrench } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { listServices } from "@/modules/services/queries";
import { ServiceCard } from "@/components/service-card";
import { Pagination } from "@/components/pagination";
import { SetupNotice } from "@/components/setup-notice";
import { buttonVariants } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
export const metadata = {title: "Servicios y oficios"};
export default async function Services({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const {trades} = await getCatalog();
  const selected = trades.find(t => t.id === params.category);
  const trade = selected?.id ?? "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  let result: Awaited<ReturnType<typeof listServices>> = {services: [], count: 0};
  let error = "";
  if (isConfigured()) { try { result = await listServices({q, trade, page}); } catch { error = "No pudimos cargar los servicios. Revisá la conexión e intentá nuevamente."; } }
  const href = (t: string) => `/servicios${t ? `?${new URLSearchParams({category: t})}` : ""}`;
  return <div className="shell flex flex-col gap-7 py-7 sm:py-10">
    <section className="band-navy" aria-labelledby="servicios-h1"><div className="flex max-w-[680px] flex-col gap-3"><h1 id="servicios-h1" className="h1">Profesionales de oficio, cerca tuyo.</h1><p className="lead text-navy-foreground-muted">Gasistas, electricistas, pintores, albañiles y más oficios en San Juan. En los oficios que exigen matrícula, mirá si está verificada, y contactá directamente a cada profesional.</p></div>
      <form action="/servicios" role="search" aria-label="Buscar profesionales" className="hdr-search max-w-[560px] text-foreground">{trade && <input type="hidden" name="category" value={trade} />}<input aria-label="Buscar por nombre" name="q" defaultValue={q} maxLength={120} placeholder="Buscar por nombre…" /><button type="submit" aria-label="Buscar"><Search className="size-5" /></button></form></section>
    <nav aria-label="Oficios" className="flex flex-wrap gap-2">{[{id: "", name: "Todos"}, ...trades].map(t => <Link key={t.id} href={href(t.id)} aria-current={trade === t.id ? "page" : undefined} className="filter-chip">{t.name}</Link>)}</nav>
    <section className="flex flex-col gap-6" aria-labelledby="oficios"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-col gap-2"><h2 id="oficios" className="h2">{q ? `Resultados para “${q}”` : selected?.name || "Todos los oficios"}</h2>{isConfigured() && !error && <p className="body-sm text-muted-foreground">{result.count} {result.count === 1 ? "profesional" : "profesionales"} en San Juan</p>}</div><Link href="/servicios/nuevo" className={buttonVariants()}><Plus className="size-4" />Ofrecer mis servicios</Link></div>
    {!isConfigured() ? <SetupNotice /> : error ? <div role="alert" className="notice notice-error">{error}<Link className="ml-2 underline" href="/servicios">Reintentar</Link></div> : result.services.length ? <><div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{result.services.map(s => <ServiceCard service={s} key={s.id} />)}</div><Pagination page={page} count={result.count} base="/servicios" q={q} category={trade} /></> : <div className="rounded-2xl border bg-card px-6 py-14 text-center"><span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted text-primary"><Wrench className="size-6" /></span><h3 className="h3">{q || trade ? "Todavía no hay profesionales para esta búsqueda" : "Aún no hay profesionales publicados"}</h3><p className="body-sm mt-2 text-muted-foreground">¿Sos del oficio? Sumá tu perfil y que te encuentren.</p></div>}</section>
  </div>;
}
