import Link from "next/link";
import { getSubcategory } from "@/modules/products/attributes";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { listProducts } from "@/modules/products/queries";
import { HomeCarousel } from "@/components/home-carousel";
import { CategoryShortcuts } from "@/components/category-shortcuts";
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
  const selectedSubcategory = getSubcategory(category, params.subcategory);
  const subcategory = selectedSubcategory?.id ?? "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  // Portada solo en la primera página sin filtros; con búsqueda o rubro, primero los resultados (como Mercado Libre).
  const storefront = !q && !category && page === 1;
  let result: Awaited<ReturnType<typeof listProducts>> = { products: [], count: 0 };
  let error = "";
  let featured: Awaited<ReturnType<typeof listServices>>["services"] = [];
  if (isConfigured()) {
    try { result = await listProducts({ q, category, subcategory, page }); }
    catch { error = "No pudimos cargar los anuncios. Revisá la conexión e intentá nuevamente."; }
    if (storefront) try { featured = (await listServices({ limit: 4 })).services; } catch { featured = []; }
  }

  return (
    <>
      <h1 className="sr-only">La Higuera: anuncios de productos en San Juan</h1>
      {storefront && <HomeCarousel />}
      <div className="shell flex flex-col gap-9 pt-6 sm:gap-11 sm:pt-8">
        {params.cuenta === "eliminada" && <p role="status" className="notice notice-success">Tu cuenta y sus datos se eliminaron.</p>}
        {storefront && <CategoryShortcuts categories={categories} />}
        {/* Servicios tiene prioridad: va antes que los anuncios (ver "Diseño" en CLAUDE.md). */}
        {storefront && <section className="band-navy" aria-labelledby="servicios-titulo">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex max-w-[640px] flex-col gap-2">
              <h2 id="servicios-titulo" className="h2">Profesionales de oficio en San Juan</h2>
              <p className="body-sm text-navy-foreground-muted">Gasistas y electricistas con matrícula, plomeros, pintores y más. Contacto directo, sin comisiones.</p>
            </div>
            <Link href="/servicios" className={buttonVariants({ variant: "onDark" })}>Ver todos los servicios <ArrowRight className="size-4" /></Link>
          </div>
          {trades.length > 0 && <div className="trade-row">{trades.map(t => <Link key={t.id} href={`/servicios?${new URLSearchParams({ category: t.id })}`} className="trade-chip">{t.name}</Link>)}</div>}
          {featured.length > 0 && <div className="service-row">{featured.map(s => <ServiceCard service={s} key={s.id} />)}</div>}
          {isConfigured() && featured.length === 0 && <p className="body-sm text-navy-foreground-muted">Todavía no hay profesionales publicados. <Link href="/servicios/nuevo" className="font-semibold text-white underline">Sé el primero en sumar tu oficio</Link>.</p>}
        </section>}
        <section className="flex flex-col gap-5" aria-labelledby="listado">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 id="listado" className="h2">{q ? `Resultados para “${q}”` : selectedSubcategory?.name || selected?.name || "Recién publicado en San Juan"}</h2>
            <p className="body-sm text-muted-foreground">{isConfigured() && !error ? `${result.count} ${result.count === 1 ? "anuncio disponible" : "anuncios disponibles"}` : "Encontrá algo para vos, acá en San Juan."}</p>
          </div>
          {!isConfigured() ? <SetupNotice /> : error ? (
            <div role="alert" className="notice notice-error">{error}<Link className="ml-2 underline" href="/">Reintentar</Link></div>
          ) : result.products.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{result.products.map(p => <ProductCard product={p} key={p.id} />)}</div>
              <Pagination page={page} count={result.count} q={q} category={category} subcategory={subcategory} />
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
        <section className="grid gap-4 md:grid-cols-2" aria-label="Publicá en La Higuera">
          <div className="cta-card">
            <div className="flex flex-col gap-1.5"><h2 className="h3">¿Tenés algo para vender?</h2><p className="body-sm text-muted-foreground">Publicalo gratis y recibí consultas de compradores de San Juan.</p></div>
            <Link className={buttonVariants()} href="/productos/nuevo">Publicar gratis</Link>
          </div>
          <div className="cta-card cta-card--services">
            <div className="flex flex-col gap-1.5"><h2 className="h3">¿Sos del oficio?</h2><p className="body-sm text-navy-foreground-muted">Sumá tu perfil y que te contacten directo, sin comisiones.</p></div>
            <Link className={buttonVariants({ variant: "onDark" })} href="/servicios/nuevo">Sumar mi servicio</Link>
          </div>
        </section>
      </div>
    </>
  );
}
