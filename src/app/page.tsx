import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { categories } from "@/modules/products/schema";
import { listProducts } from "@/modules/products/queries";
import { HomeCarousel } from "@/components/home-carousel";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/env";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const category = categories.find(c => c === params.category) ?? "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  let result: Awaited<ReturnType<typeof listProducts>> = { products: [], count: 0 };
  let error = "";
  if (isConfigured()) {
    try { result = await listProducts({ q, category, page }); }
    catch { error = "No pudimos cargar los anuncios. Revisá la conexión e intentá nuevamente."; }
  }

  return (
    <>
      <h1 className="sr-only">La Higuera: anuncios de productos en San Juan</h1>
      <HomeCarousel />
      <div className="shell">
        {params.cuenta === "eliminada" && <p role="status" className="notice notice-success mt-6">Tu cuenta y sus datos se eliminaron.</p>}
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
              <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary"><Search className="size-6" /></span>
              <h3 className="text-lg font-semibold">{q || category ? "Todavía no hay coincidencias" : "El próximo anuncio puede ser el tuyo"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{q || category ? "Probá con otra palabra o explorá todas las categorías." : "Publicá tu primer producto y compartilo con San Juan."}</p>
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
