"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
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
  {id: "inmuebles", name: "Inmuebles"},
  {id: "vehiculos", name: "Vehículos"},
  {id: "articulos", name: "Artículos"},
  {id: "servicios", name: "Servicios"},
] as const;

type MenuItem = {id: string; name: string; href: string; active: boolean};

/** Secciones, sus menús y cuál está elegida. Las comparten la barra de escritorio y el menú ☰ del celular. */
function useSections(categories: Option[], trades: Option[]) {
  const { isHome, q, category, subcategory } = useListing(categories);
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedTrade = pathname === "/servicios" ? trades.find(trade => trade.id === params.get("category"))?.id ?? "" : "";
  const services = pathname.startsWith("/servicios") || pathname.startsWith("/mis-servicios");
  const href = (id: string, child = "") => `/?${new URLSearchParams({ ...(q ? { q } : {}), category: id, ...(child ? {subcategory: child} : {}) })}`;
  const isActive = (id: MenuId) => id === "servicios" ? services : isHome && (id === "articulos" ? !!category && !["inmuebles", "vehiculos"].includes(category) : category === id);
  const itemsFor = (id: MenuId): MenuItem[] => id === "servicios" ? [
    {id: "servicios", name: "Ver todos los servicios", href: "/servicios", active: pathname === "/servicios" && !selectedTrade},
    ...trades.map(trade => ({id: trade.id, name: trade.name, href: `/servicios?${new URLSearchParams({category: trade.id})}`, active: pathname === "/servicios" && selectedTrade === trade.id})),
  ] : id === "articulos"
    ? categories.filter(item => !["inmuebles", "vehiculos"].includes(item.id)).map(item => ({...item, href: href(item.id), active: category === item.id}))
    : [
      {id, name: `Ver todos los ${id === "inmuebles" ? "inmuebles" : "vehículos"}`, href: href(id), active: category === id && !subcategory},
      ...subcategories.filter(item => item.category_id === id).map(item => ({...item, href: href(id, item.id), active: category === id && subcategory === item.id})),
    ];
  const label = (id: MenuId) => id === "servicios" ? "Oficios disponibles" : id === "articulos" ? "Categorías de artículos" : `Subcategorías de ${sections.find(section => section.id === id)!.name.toLowerCase()}`;
  // Los rubros de anuncios se marcan solo en el inicio, que es su listado.
  const isCurrent = (id: MenuId, item: MenuItem) => (id === "servicios" || isHome) && item.active;
  return { pathname, href, isActive, itemsFor, label, isCurrent };
}

export function HeaderTabs({ categories, trades }: { categories: Option[]; trades: Option[] }) {
  const { pathname, href, isActive, itemsFor, label, isCurrent } = useSections(categories, trades);
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

  const items = open ? itemsFor(open) : [];
  return (
    <div ref={container} className="hdr-navigation" onPointerEnter={cancelClose} onPointerLeave={event => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) scheduleClose(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(null); }}>
      <nav aria-label="Secciones" className="hdr-tabs">
        {sections.map(({id, name}) => {
          const active = isActive(id);
          const toggle = (event: React.MouseEvent<HTMLButtonElement>) => { cancelClose(); setOpen(current => event.detail > 0 && window.matchMedia("(hover: hover)").matches ? id : current === id ? null : id); };
          const hover = (event: React.PointerEvent) => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) show(id); };
          if (id === "articulos") return <button key={id} ref={element => { buttons.current[id] = element; }} type="button" className="hdr-tab"
            data-active={active} aria-expanded={open === id} aria-controls={`menu-${id}`} onPointerEnter={hover} onClick={toggle}>
            {name}<ChevronDown className="size-3.5" aria-hidden="true" />
          </button>;
          return <div key={id} className="hdr-tab-group" onPointerEnter={hover}>
            <Link href={id === "servicios" ? "/servicios" : href(id)} className="hdr-tab hdr-tab-link" data-active={active} aria-current={active ? "page" : undefined}
              onClick={() => { cancelClose(); setOpen(null); }}>
              {name}
            </Link>
            <button ref={element => { buttons.current[id] = element; }} type="button" className="hdr-tab hdr-tab-toggle" data-active={active}
              aria-label={id === "servicios" ? "Mostrar oficios" : `Mostrar subcategorías de ${name.toLowerCase()}`} aria-expanded={open === id} aria-controls={`menu-${id}`} onClick={toggle}>
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </div>;
        })}
        {/* Secundarias a la derecha, para que las categorías no queden amontonadas solas a la izquierda. */}
        <div className="hdr-aside">
          <button type="button" className="hdr-tab hdr-tab--pending" aria-disabled="true" title="Próximamente" onPointerEnter={() => setOpen(null)}>
            Tiendas Virtuales <span className="hdr-soon">Pronto</span>
          </button>
          <Link href="/ayuda" className="hdr-tab" aria-current={pathname === "/ayuda" ? "page" : undefined} onPointerEnter={() => setOpen(null)} onClick={() => setOpen(null)}>
            Ayuda
          </Link>
        </div>
      </nav>
      {open && <div className="cat-dropdown" onPointerEnter={cancelClose}>
        <div className="shell relative">
          <nav id={`menu-${open}`} aria-label={label(open)} className="cat-menu">
            {items.map(item => <Link key={item.id} href={item.href} onClick={() => setOpen(null)} aria-current={isCurrent(open, item) ? "page" : undefined} className={`cat-item ${item.id === open ? "cat-item--all" : ""}`}>
              <span className="cat-text">{item.name}</span>
            </Link>)}
          </nav>
        </div>
      </div>}
    </div>
  );
}

/** Menú ☰: por debajo de 1024px reemplaza a la barra de secciones, como en Mercado Libre. */
export function HeaderMenu({ categories, trades }: { categories: Option[]; trades: Option[] }) {
  const { pathname, itemsFor, label, isCurrent } = useSections(categories, trades);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<MenuId | null>(null);
  const close = () => dialog.current?.close();
  return <>
    <button type="button" className="hdr-menu-button" aria-label="Abrir menú de categorías" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Menu className="size-6" aria-hidden="true" />
    </button>
    {/* Diálogo modal nativo: encierra el foco, cierra con Escape y devuelve el foco al botón. Tocar el fondo también cierra. */}
    <dialog ref={dialog} aria-labelledby="menu-titulo" className="menu-sheet" onClose={() => setOpen(null)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="menu-sheet-in">
        <div className="menu-sheet-head">
          <h2 id="menu-titulo" className="title">Categorías</h2>
          <button type="button" className="menu-close" aria-label="Cerrar menú" onClick={close}><X className="size-5" aria-hidden="true" /></button>
        </div>
        {sections.map(({id, name}) => <div key={id}>
          <button type="button" className="menu-section" aria-expanded={open === id} aria-controls={`menu-movil-${id}`} onClick={() => setOpen(current => current === id ? null : id)}>
            {name}<ChevronDown className="size-4" aria-hidden="true" />
          </button>
          {open === id && <nav id={`menu-movil-${id}`} aria-label={label(id)} className="menu-links">
            {itemsFor(id).map(item => <Link key={item.id} href={item.href} onClick={close} aria-current={isCurrent(id, item) ? "page" : undefined} className={`menu-link ${item.id === id ? "menu-link--all" : ""}`}>{item.name}</Link>)}
          </nav>}
        </div>)}
        <div className="menu-aside">
          <button type="button" className="menu-section" aria-disabled="true" title="Próximamente">Tiendas Virtuales <span className="hdr-soon">Pronto</span></button>
          <Link href="/ayuda" className="menu-section" aria-current={pathname === "/ayuda" ? "page" : undefined} onClick={close}>Ayuda</Link>
        </div>
      </div>
    </dialog>
  </>;
}

export function HeaderMenuFallback() {
  return <span className="hdr-menu-button" aria-hidden="true"><Menu className="size-6" /></span>;
}

export function HeaderSearchFallback() {
  return <div className="hdr-search" />;
}

export function HeaderTabsFallback() {
  return <div className="hdr-tabs min-h-[58px]" />;
}
