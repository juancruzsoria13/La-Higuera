import Link from "next/link";
import { Plus, Search, Wrench } from "lucide-react";
import { trades } from "@/modules/services/schema";
import { listServices } from "@/modules/services/queries";
import { ServiceCard } from "@/components/service-card";
import { Pagination } from "@/components/pagination";
import { SetupNotice } from "@/components/setup-notice";
import { buttonVariants } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
export const metadata = {title: "Servicios y oficios matriculados"};
export default async function Services({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const trade = trades.find(t => t === params.category) ?? "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  let result: Awaited<ReturnType<typeof listServices>> = {services: [], count: 0};
  let error = "";
  if (isConfigured()) { try { result = await listServices({q, trade, page}); } catch { error = "No pudimos cargar los servicios. Revisá la conexión e intentá nuevamente."; } }
  const href = (t: string) => `/servicios${t ? `?${new URLSearchParams({category: t})}` : ""}`;
  return <div className="shell py-10">
    <section className="mb-8 rounded-2xl bg-[#0a2463] p-6 text-white sm:p-8"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">SERVICIOS · OFICIOS MATRICULADOS</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profesionales matriculados, cerca tuyo.</h1><p className="mt-3 max-w-2xl text-sm text-blue-100">Gasistas, plomeros, electricistas y más oficios en San Juan. Mirá la matrícula de cada profesional y contactalo directamente.</p>
      <form action="/servicios" role="search" aria-label="Buscar profesionales" className="mt-6 flex max-w-xl overflow-hidden rounded-xl bg-white">{trade && <input type="hidden" name="category" value={trade} />}<input aria-label="Buscar por nombre" name="q" defaultValue={q} maxLength={120} placeholder="Buscar por nombre…" className="min-w-0 flex-1 px-4 py-3 text-[15px] text-foreground outline-none" /><button type="submit" aria-label="Buscar" className="flex w-14 items-center justify-center text-primary"><Search className="size-5" /></button></form></section>
    <nav aria-label="Oficios" className="mb-7 flex flex-wrap gap-2">{["", ...trades].map(t => <Link key={t} href={href(t)} aria-current={trade === t ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm transition ${trade === t ? "border-primary bg-primary text-white" : "bg-white hover:border-primary"}`}>{t || "Todos"}</Link>)}</nav>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-bold tracking-tight">{q ? `Resultados para “${q}”` : trade || "Todos los oficios"}</h2><Link href="/servicios/nuevo" className={buttonVariants()}><Plus className="size-4" />Ofrecer mis servicios</Link></div>
    {!isConfigured() ? <SetupNotice /> : error ? <div role="alert" className="notice notice-error">{error}<Link className="ml-2 underline" href="/servicios">Reintentar</Link></div> : result.services.length ? <><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.services.map(s => <ServiceCard service={s} key={s.id} />)}</div><Pagination page={page} count={result.count} base="/servicios" q={q} category={trade} /></> : <div className="rounded-2xl border bg-white px-6 py-14 text-center"><span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary"><Wrench className="size-6" /></span><h3 className="text-lg font-semibold">{q || trade ? "Todavía no hay profesionales para esta búsqueda" : "Aún no hay profesionales publicados"}</h3><p className="mt-2 text-sm text-muted-foreground">¿Sos del oficio? Sumá tu perfil y que te encuentren.</p></div>}
  </div>;
}
