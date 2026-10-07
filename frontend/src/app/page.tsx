import Link from "next/link";
import { ArrowUpRight, SlidersHorizontal, Wrench } from "lucide-react";
import { categories } from "@/modules/products/schema";
import { listProducts } from "@/modules/products/queries";
import { HomeCarousel } from "@/components/home-carousel";
import { Fig } from "@/components/fig";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/env";
import { listServices } from "@/modules/services/queries";
import { trades } from "@/modules/services/schema";
import { ServiceCard } from "@/components/service-card";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const category = categories.find(c => c === params.category) ?? "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  let result: Awaited<ReturnType<typeof listProducts>> = { products: [], count: 0 };
  let error = "";
  let featured: Awaited<ReturnType<typeof listServices>>["services"] = [];
  if (isConfigured()) {
    try { result = await listProducts({ q, category, page }); }
    catch { error = "No pudimos cargar los anuncios. Revisá la conexión e intentá nuevamente."; }
    try { featured = (await listServices({ limit: 3 })).services; } catch { featured = []; }
  }

  return (
    <>
      <h1 className="sr-only">La Higuera: anuncios de productos en San Juan</h1>
      <HomeCarousel />
      <div className="shell">
        {params.cuenta === "eliminada" && <p role="status" className="notice notice-success mt-6">Tu cuenta y sus datos se eliminaron.</p>}
        <section className="mt-9 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2463] to-[#1d4ed8] p-6 text-white sm:mt-11 sm:p-9" aria-labelledby="servicios-titulo">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-xl">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200"><Wrench className="size-3.5" />SERVICIOS · OFICIOS MATRICULADOS</p>
              <h2 id="servicios-titulo" className="text-2xl font-bold tracking-tight sm:text-4xl">Gasistas, plomeros y más, con matrícula.</h2>
              <p className="mt-3 text-sm text-blue-100">Encontrá profesionales de oficio en San Juan, mirá su matrícula y contactalos directo.</p>
            </div>
            <Link href="/servicios" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-white px-5 text-sm font-semibold text-primary transition hover:bg-sky-100">Ver todos los servicios <ArrowUpRight className="size-4" /></Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{trades.map(t => <Link key={t} href={`/servicios?${new URLSearchParams({ category: t })}`} className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/25">{t}</Link>)}</div>
          {featured.length > 0 && <div className="mt-7 grid gap-4 text-foreground sm:grid-cols-2 lg:grid-cols-3">{featured.map(s => <ServiceCard service={s} key={s.id} />)}</div>}
          {isConfigured() && featured.length === 0 && <p className="mt-6 text-sm text-blue-100">Todavía no hay profesionales publicados. <Link href="/servicios/nuevo" className="font-semibold underline">Sé el primero en sumar tu oficio</Link>.</p>}
        </section>
        <section className="mt-9 sm:mt-11" aria-label="Anuncios disponibles">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-primary">EXPLORÁ LA HIGUERA</p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">{q ? `Resultados para “${q}”` : category || "Descubrí lo que hay cerca"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{isConfigured() && !error ? `${result.count} ${result.count === 1 ? "anuncio disponible" : "anuncios disponibles"}` : "Encontrá algo para vos, acá en San Juan."}</p>
            </div>
            <span className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" />Más recientes primero</span>
          </div>
          {!isConfigured() ? <SetupNotice /> : error ? (
            <div role="alert" className="notice notice-error">{error}<Link className="ml-2 underline" href="/">Reintentar</Link></div>
          ) : result.products.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{result.products.map(p => <ProductCard product={p} key={p.id} />)}</div>
              <Pagination page={page} count={result.count} q={q} category={category} />
            </>
          ) : (
            <div className="rounded-2xl border bg-white px-6 py-14 text-center">
              <Fig variant={q || category ? 5 : 1} className="mx-auto mb-4 size-36" />
              <h3 className="text-lg font-semibold">{q || category ? "Todavía no hay coincidencias" : "El próximo anuncio puede ser el tuyo"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{q || category ? "Probá con otra palabra o explorá todas las categorías." : "Publicá tu primer producto y compartilo con San Juan."}</p>
              {(q || category) && <div className="mt-5 flex flex-wrap justify-center gap-2">{categories.map(item => <Link key={item} href={`/?${new URLSearchParams({ category: item })}`} className="inline-flex min-h-9 items-center rounded-lg border bg-white px-3 text-sm hover:border-primary">{item}</Link>)}</div>}
              <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={q || category || page > 1 ? "/" : "/productos/nuevo"}>{q || category || page > 1 ? "Ver todos los anuncios" : "Crear un anuncio"}<ArrowUpRight className="size-4" /></Link>
            </div>
          )}
        </section>
        <div className="mt-9 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#0a2463] p-6 text-white sm:flex-row sm:items-center sm:px-8 sm:py-7">
          <div><h2 className="text-lg font-semibold tracking-tight">Eso que no usás puede ser un gran hallazgo.</h2><p className="mt-1.5 text-sm text-blue-100">Publicalo. Alguien en San Juan lo está buscando.</p></div>
          <Link className="inline-flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg bg-white px-5 text-sm font-semibold text-primary transition hover:bg-sky-100" href="/productos/nuevo">Publicar mi anuncio <ArrowUpRight className="size-4" /></Link>
        </div>
      </div>
    </>
  );
}
