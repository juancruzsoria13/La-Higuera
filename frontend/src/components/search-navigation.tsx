"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CarFront, ChevronDown, CircleHelp, House, Search, Store, Tag, Wrench } from "lucide-react";
import type { Option } from "@/lib/catalog";
import { getSubcategory, subcategories } from "@/modules/products/attributes";

/** Búsqueda y rubro actuales; solo cuentan en el inicio, que es el listado de anuncios. */
function useListing(categories: Option[]) {
  const params = useSearchParams();
  const isHome = usePathname() === "/";
  const q = isHome ? (params.get("q") ?? "").slice(0, 120) : "";
  const category = isHome ? categories.find(item => item.id === params.get("category"))?.id ?? "" : "";
  const subcategory = isHome ? getSubcategory(category, params.get("subcategory"))?.id ?? "" : "";
  return { isHome, q, category, subcategory };
}

export function HeaderSearch({ categories }: { categories: Option[] }) {
  const { q, category, subcategory } = useListing(categories);
  return (
    <form action="/" role="search" aria-label="Buscar anuncios" className="hdr-search">
      <input key={q} aria-label="Qué buscás" name="q" defaultValue={q} maxLength={120} placeholder="¿Qué estás buscando hoy?" />
      {category && <input type="hidden" name="category" value={category} />}
      {subcategory && <input type="hidden" name="subcategory" value={subcategory} />}
      <button type="submit" aria-label="Buscar"><Search className="size-5" aria-hidden="true" /></button>
    </form>
  );
}

type MenuId = "inmuebles" | "vehiculos" | "articulos" | "servicios";
const sections = [
  {id: "inmuebles", name: "Inmuebles", icon: House},
  {id: "vehiculos", name: "Vehículos", icon: CarFront},
  {id: "articulos", name: "Artículos", icon: Tag},
  {id: "servicios", name: "Servicios", icon: Wrench},
] as const;

export function HeaderTabs({ categories, trades }: { categories: Option[]; trades: Option[] }) {
  const { isHome, q, category, subcategory } = useListing(categories);
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedTrade = pathname === "/servicios" ? trades.find(trade => trade.id === params.get("category"))?.id ?? "" : "";
  const services = pathname.startsWith("/servicios") || pathname.startsWith("/mis-servicios");
  const [open, setOpen] = useState<MenuId | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const show = (id: MenuId) => { cancelClose(); setOpen(id); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(null), 180); };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") { setOpen(null); buttons.current[open!]?.focus(); }
      } else if (!container.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);

  const href = (id: string, child = "") => `/?${new URLSearchParams({ ...(q ? { q } : {}), category: id, ...(child ? {subcategory: child} : {}) })}`;
  const items = open === "servicios" ? [
    {id: "servicios", name: "Ver todos los servicios", href: "/servicios", active: pathname === "/servicios" && !selectedTrade},
    ...trades.map(trade => ({id: trade.id, name: trade.name, href: `/servicios?${new URLSearchParams({category: trade.id})}`, active: pathname === "/servicios" && selectedTrade === trade.id})),
  ] : open === "articulos"
    ? categories.filter(item => !["inmuebles", "vehiculos"].includes(item.id)).map(item => ({...item, href: href(item.id), active: category === item.id}))
    : open ? [
      {id: open, name: `Ver todos los ${open === "inmuebles" ? "inmuebles" : "vehículos"}`, href: href(open), active: category === open && !subcategory},
      ...subcategories.filter(item => item.category_id === open).map(item => ({...item, href: href(open, item.id), active: category === open && subcategory === item.id})),
    ] : [];
  const openName = sections.find(section => section.id === open)?.name;
  return (
    <div ref={container} className="hdr-navigation" onPointerEnter={cancelClose} onPointerLeave={event => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) scheduleClose(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(null); }}>
      <nav aria-label="Secciones" className="hdr-tabs">
        {sections.map(({id, name, icon: Icon}) => {
          const active = id === "servicios" ? services : isHome && (id === "articulos" ? !["inmuebles", "vehiculos"].includes(category) : category === id);
          const toggle = (event: React.MouseEvent<HTMLButtonElement>) => { cancelClose(); setOpen(current => event.detail > 0 && window.matchMedia("(hover: hover)").matches ? id : current === id ? null : id); };
          const hover = (event: React.PointerEvent) => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) show(id); };
          if (id === "articulos") return <button key={id} ref={element => { buttons.current[id] = element; }} type="button" className="hdr-tab"
            data-active={active} aria-expanded={open === id} aria-controls={`menu-${id}`} onPointerEnter={hover} onClick={toggle}>
            <Icon className="size-[18px]" aria-hidden="true" />{name}<ChevronDown className="size-3.5" aria-hidden="true" />
          </button>;
          return <div key={id} className="hdr-tab-group" onPointerEnter={hover}>
            <Link href={id === "servicios" ? "/servicios" : href(id)} className="hdr-tab hdr-tab-link" data-active={active} aria-current={active ? "page" : undefined}
              onClick={() => { cancelClose(); setOpen(null); }}>
              <Icon className="size-[18px]" aria-hidden="true" />{name}
            </Link>
            <button ref={element => { buttons.current[id] = element; }} type="button" className="hdr-tab hdr-tab-toggle" data-active={active}
              aria-label={id === "servicios" ? "Mostrar oficios" : `Mostrar subcategorías de ${name.toLowerCase()}`} aria-expanded={open === id} aria-controls={`menu-${id}`} onClick={toggle}>
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </div>;
        })}
        <button type="button" className="hdr-tab hdr-tab--pending" aria-disabled="true" title="Próximamente" onPointerEnter={() => setOpen(null)}>
          <Store className="size-[18px]" aria-hidden="true" />Tiendas Virtuales
        </button>
        <Link href="/ayuda" className="hdr-tab" aria-current={pathname === "/ayuda" ? "page" : undefined} onPointerEnter={() => setOpen(null)} onClick={() => setOpen(null)}>
          <CircleHelp className="size-[18px]" aria-hidden="true" />Ayuda
        </Link>
      </nav>
      {open && <div className="cat-dropdown" onPointerEnter={cancelClose}>
        <div className="shell relative">
          <nav id={`menu-${open}`} aria-label={open === "servicios" ? "Oficios disponibles" : open === "articulos" ? "Categorías de artículos" : `Subcategorías de ${openName?.toLowerCase()}`} className="cat-menu">
            {items.map(item => <Link key={item.id} href={item.href} onClick={() => setOpen(null)} aria-current={(open === "servicios" || isHome) && item.active ? "page" : undefined} className={`cat-item ${item.id === open ? "cat-item--all" : ""}`}>
              <span className="cat-text">{item.name}</span>
            </Link>)}
          </nav>
        </div>
      </div>}
    </div>
  );
}

export function HeaderSearchFallback() {
  return <div className="hdr-search" />;
}

export function HeaderTabsFallback() {
  return <div className="hdr-tabs min-h-[58px]" />;
}
