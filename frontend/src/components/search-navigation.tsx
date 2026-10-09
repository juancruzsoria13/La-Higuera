"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrickWall, CarFront, ChevronDown, House, LayoutGrid, Refrigerator, Search, Shapes, Shirt, Smartphone, Sofa, Tag, Wrench } from "lucide-react";
import type { Option } from "@/lib/catalog";

const categoryIcons: Record<string, typeof Shapes> = {
  inmuebles: House, tecnologia: Smartphone, vehiculos: CarFront, ropa: Shirt, muebles: Sofa,
  electrodomesticos: Refrigerator, "materiales-construccion": BrickWall,
};

/** Búsqueda y rubro actuales; solo cuentan en el inicio, que es el listado de anuncios. */
function useListing(categories: Option[]) {
  const params = useSearchParams();
  const isHome = usePathname() === "/";
  const q = isHome ? (params.get("q") ?? "").slice(0, 120) : "";
  const category = isHome ? categories.find(item => item.id === params.get("category"))?.id ?? "" : "";
  return { isHome, q, category };
}

export function HeaderSearch({ categories }: { categories: Option[] }) {
  const { q, category } = useListing(categories);
  return (
    <form action="/" role="search" aria-label="Buscar anuncios" className="hdr-search">
      <input key={q} aria-label="Qué buscás" name="q" defaultValue={q} maxLength={120} placeholder="¿Qué estás buscando hoy?" />
      {category && <input type="hidden" name="category" value={category} />}
      <button type="submit" aria-label="Buscar"><Search className="size-5" aria-hidden="true" /></button>
    </form>
  );
}

export function HeaderTabs({ categories }: { categories: Option[] }) {
  const { isHome, q, category } = useListing(categories);
  const pathname = usePathname();
  const services = pathname.startsWith("/servicios") || pathname.startsWith("/mis-servicios");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  // El menú de rubros cierra con Escape (y devuelve el foco al botón) o con un clic afuera.
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
      } else if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);

  const href = (id: string) => `/?${new URLSearchParams({ ...(q ? { q } : {}), ...(id ? { category: id } : {}) })}`;
  return (
    <>
      <nav aria-label="Secciones" className="hdr-tabs">
        <button ref={button} type="button" className="hdr-tab" data-active={isHome} aria-expanded={open} aria-controls="menu-categorias" onClick={() => setOpen(value => !value)}>
          <Tag className="size-[18px]" aria-hidden="true" />Anuncios<ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        <Link href="/servicios" className="hdr-tab" aria-current={services ? "page" : undefined}>
          <Wrench className="size-[18px]" aria-hidden="true" />Servicios
        </Link>
      </nav>
      {open && (
        <div className="absolute inset-x-0 top-full">
          <div className="shell relative">
            <nav ref={menu} id="menu-categorias" aria-label="Rubros" className="cat-menu">
              {[{ id: "", name: "Todos los anuncios" }, ...categories].map(item => {
                const Icon = item.id ? categoryIcons[item.id] ?? Shapes : LayoutGrid;
                return (
                  <Link key={item.id} href={href(item.id)} onClick={() => setOpen(false)} aria-current={isHome && category === item.id ? "page" : undefined} className={`cat-item ${item.id ? "" : "cat-item--all"}`}>
                    <span className="cat-icon"><Icon aria-hidden="true" /></span><span className="cat-text">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export function HeaderSearchFallback() {
  return <div className="hdr-search" />;
}

export function HeaderTabsFallback() {
  return <div className="hdr-tabs min-h-[58px]" />;
}
