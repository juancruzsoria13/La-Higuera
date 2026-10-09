import Link from "next/link";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { listProducts } from "@/modules/products/queries";
import { HomeCarousel } from "@/components/home-carousel";
import { Fig } from "@/components/fig";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/env";
import { listServices } from "@/modules/services/queries";
import { ServiceCard } from "@/components/service-card";
import { buttonVariants } from "@/components/ui/button";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const {categories, trades} = await getCatalog();
  const selected = categories.find(c => c.id === params.category);
  const category = selected?.id ?? "";
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
      <div className="shell pt-7 sm:pt-10">
        {params.cuenta === "eliminada" && <p role="status" className="notice notice-success mb-6">Tu cuenta y sus datos se eliminaron.</p>}
        <section className="flex flex-col gap-6" aria-labelledby="listado">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id="listado" className="h2">{q ? `Resultados para “${q}”` : selected?.name || "Descubrí lo que hay cerca"}</h2>
              <p className="body-sm text-muted-foreground">{isConfigured() && !error ? `${result.count} ${result.count === 1 ? "anuncio disponible" : "anuncios disponibles"}` : "Encontrá algo para vos, acá en San Juan."}</p>
            </div>
            <span className="filter-chip gap-2 text-muted-foreground hover:border-border-strong"><SlidersHorizontal className="size-4" />Más recientes primero</span>
          </div>
          {!isConfigured() ? <SetupNotice /> : error ? (
            <div role="alert" className="notice notice-error">{error}<Link className="ml-2 underline" href="/">Reintentar</Link></div>
          ) : result.products.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{result.products.map(p => <ProductCard product={p} key={p.id} />)}</div>
              <Pagination page={page} count={result.count} q={q} category={category} />
            </>
          ) : (
            <div className="rounded-2xl border bg-card px-6 py-14 text-center">
              <Fig variant={q || category ? 5 : 1} className="mx-auto mb-4 size-36" />
              <h3 className="h3">{q || category ? "Todavía no hay coincidencias" : "El próximo anuncio puede ser el tuyo"}</h3>
              <p className="body-sm mt-2 text-muted-foreground">{q || category ? "Probá con otra palabra o explorá todas las categorías." : "Publicá tu primer producto y compartilo con San Juan."}</p>
              {(q || category) && <div className="mt-5 flex flex-wrap justify-center gap-2">{categories.map(item => <Link key={item.id} href={`/?${new URLSearchParams({ category: item.id })}`} className="filter-chip">{item.name}</Link>)}</div>}
              <Link className="label mt-5 inline-flex items-center gap-2 text-primary" href={q || category || page > 1 ? "/" : "/productos/nuevo"}>{q || category || page > 1 ? "Ver todos los anuncios" : "Crear un anuncio"}<ArrowUpRight className="size-4" /></Link>
            </div>
          )}
        </section>
        <section className="band-navy mt-9 sm:mt-11" aria-labelledby="servicios-titulo">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex max-w-[620px] flex-col gap-2">
              <h2 id="servicios-titulo" className="h2">Gasistas, pintores, plomeros y más, cerca tuyo.</h2>
              <p className="body-sm text-navy-foreground-muted">Encontrá profesionales de oficio en San Juan, con y sin matrícula, y contactalos directo.</p>
            </div>
            <Link href="/servicios" className={buttonVariants({ variant: "onDark" })}>Ver todos los servicios <ArrowUpRight className="size-4" /></Link>
          </div>
          {trades.length > 0 && <div className="flex flex-wrap gap-2">{trades.map(t => <Link key={t.id} href={`/servicios?${new URLSearchParams({ category: t.id })}`} className="trade-chip">{t.name}</Link>)}</div>}
          {featured.length > 0 && <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{featured.map(s => <ServiceCard service={s} key={s.id} />)}</div>}
          {isConfigured() && featured.length === 0 && <p className="body-sm text-navy-foreground-muted">Todavía no hay profesionales publicados. <Link href="/servicios/nuevo" className="font-semibold text-white underline">Sé el primero en sumar tu oficio</Link>.</p>}
        </section>
        <section className="band-ice mt-9 sm:mt-11" aria-labelledby="cierre">
          <div className="flex flex-col gap-1.5"><h2 id="cierre" className="h3">Eso que no usás puede ser un gran hallazgo.</h2><p className="body-sm">Publicalo. Alguien en San Juan lo está buscando.</p></div>
          <Link className={buttonVariants()} href="/productos/nuevo">Publicar mi anuncio</Link>
        </section>
      </div>
    </>
  );
}
