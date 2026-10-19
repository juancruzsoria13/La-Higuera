"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, CarFront, ChevronDown, ChevronRight, House, Menu, Search, Tag, Wrench } from "lucide-react";
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

// Servicios va primero: es la sección con prioridad (ver "Diseño" en CLAUDE.md).
type SectionId = "servicios" | "inmuebles" | "vehiculos" | "articulos";
const sections = [
  {id: "servicios", name: "Servicios", icon: Wrench},
  {id: "inmuebles", name: "Inmuebles", icon: House},
  {id: "vehiculos", name: "Vehículos", icon: CarFront},
  {id: "articulos", name: "Artículos", icon: Tag},
] as const;
const hoverPointer = (event: React.PointerEvent) => event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches;

/** Fila de secciones al estilo Mercado Libre: "Categorías" abre un menú con pestañas y el resto son accesos directos. */
export function HeaderTabs({ categories, trades }: { categories: Option[]; trades: Option[] }) {
  const { isHome, q, category, subcategory } = useListing(categories);
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedTrade = pathname === "/servicios" ? trades.find(trade => trade.id === params.get("category"))?.id ?? "" : "";
  const inServices = pathname.startsWith("/servicios") || pathname.startsWith("/mis-servicios");
  const current: SectionId | null = inServices ? "servicios" : !category ? null : category === "inmuebles" || category === "vehiculos" ? category : "articulos";
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SectionId>("servicios");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tabs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Al pasar el mouse en diagonal hacia los links no se cambia de pestaña: solo si se queda un instante sobre ella.
  const tabTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTab = () => { if (tabTimer.current) clearTimeout(tabTimer.current); };
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 180); };
  const close = () => { cancelClose(); setOpen(false); };
  function openMenu() {
    cancelClose();
    if (!open) setSection(current ?? "servicios");
    setOpen(true);
  }

  useEffect(() => () => { cancelClose(); cancelTab(); }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      } else if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);

  const href = (id: string, child = "") => `/?${new URLSearchParams({ ...(q ? { q } : {}), category: id, ...(child ? {subcategory: child} : {}) })}`;
  const name = sections.find(item => item.id === section)!.name;
  const items = section === "servicios" ? [
    {id: "servicios", name: "Ver todos los servicios", href: "/servicios", active: pathname === "/servicios" && !selectedTrade},
    ...trades.map(trade => ({id: trade.id, name: trade.name, href: `/servicios?${new URLSearchParams({category: trade.id})}`, active: pathname === "/servicios" && selectedTrade === trade.id})),
  ] : section === "articulos"
    ? categories.filter(item => !["inmuebles", "vehiculos"].includes(item.id)).map(item => ({...item, href: href(item.id), active: category === item.id}))
    : [
      {id: section, name: `Ver todos los ${name.toLowerCase()}`, href: href(section), active: category === section && !subcategory},
      ...subcategories.filter(item => item.category_id === section).map(item => ({...item, href: href(section, item.id), active: category === section && subcategory === item.id})),
    ];
  const [all, ...links] = section === "articulos" ? [null, ...items] : items;

  function moveTab(event: React.KeyboardEvent, index: number) {
    const step = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[event.key];
    const next = step ? (index + step + sections.length) % sections.length : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setSection(sections[next].id);
    tabs.current[sections[next].id]?.focus();
  }

  const quick = (id: "inmuebles" | "vehiculos", label: string) => {
    const active = isHome && category === id;
    return <Link href={href(id)} className="hdr-link" aria-current={active ? "page" : undefined} onClick={close}>{label}</Link>;
  };
  return (
    <div ref={container} className="hdr-navigation" onPointerEnter={cancelClose} onPointerLeave={event => { if (hoverPointer(event)) scheduleClose(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <nav aria-label="Secciones" className="hdr-links">
        <button ref={trigger} type="button" className="hdr-link hdr-link--menu" aria-expanded={open} aria-controls="menu-categorias"
          onPointerEnter={event => { if (hoverPointer(event)) openMenu(); }}
          onClick={event => { if (open && !(event.detail > 0 && window.matchMedia("(hover: hover)").matches)) close(); else openMenu(); }}>
          <Menu className="size-4" aria-hidden="true" />Categorías<ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        <span className="hdr-divider" aria-hidden="true" />
        <Link href="/servicios" className="hdr-link hdr-link--featured" aria-current={inServices ? "page" : undefined} onClick={close}>
          <Wrench className="size-4" aria-hidden="true" />Servicios
        </Link>
        {quick("inmuebles", "Inmuebles")}
        {quick("vehiculos", "Vehículos")}
        <button type="button" className="hdr-link" aria-disabled="true" title="Próximamente">Tiendas Virtuales <span className="hdr-soon">Pronto</span></button>
        <Link href="/ayuda" className="hdr-link" aria-current={pathname === "/ayuda" ? "page" : undefined} onClick={close}>Ayuda</Link>
      </nav>
      {open && <div className="cat-dropdown" onPointerEnter={cancelClose}>
        <div className="shell">
          <div id="menu-categorias" className="mega">
            <div role="tablist" aria-label="Categorías" aria-orientation="vertical" className="mega-tabs">
              {sections.map(({id, name, icon: Icon}, index) => (
                <button key={id} ref={element => { tabs.current[id] = element; }} type="button" role="tab" id={`tab-${id}`} aria-selected={section === id} aria-controls="mega-panel"
                  tabIndex={section === id ? 0 : -1} className="mega-tab" onClick={() => { cancelTab(); setSection(id); }} onKeyDown={event => moveTab(event, index)}
                  onPointerEnter={event => { if (hoverPointer(event)) { cancelTab(); tabTimer.current = setTimeout(() => setSection(id), 120); } }} onPointerLeave={cancelTab}>
                  <Icon className="size-[18px]" aria-hidden="true" />{name}<ChevronRight className="mega-tab-arrow size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div role="tabpanel" id="mega-panel" aria-labelledby={`tab-${section}`} className="mega-panel">
              <p className="mega-title">{name}</p>
              <nav aria-label={section === "servicios" ? "Oficios disponibles" : section === "articulos" ? "Categorías de artículos" : `Subcategorías de ${name.toLowerCase()}`} className="flex flex-col gap-2">
                {all && <Link href={all.href} onClick={close} aria-current={(section === "servicios" || isHome) && all.active ? "page" : undefined} className="mega-all">{all.name}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
                <div className="mega-grid">
                  {links.map(item => item && <Link key={item.id} href={item.href} onClick={close} aria-current={(section === "servicios" || isHome) && item.active ? "page" : undefined} className="mega-link">{item.name}</Link>)}
                </div>
              </nav>
              {section === "servicios" && <Link href="/servicios/nuevo" onClick={close} className="mega-promo">
                <span>¿Sos del oficio? <strong>Sumá tu perfil</strong> y que te encuentren.</span><span className="mega-promo-badge">Gratis</span>
              </Link>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

export function HeaderSearchFallback() {
  return <div className="hdr-search" />;
}

export function HeaderTabsFallback() {
  return <div className="hdr-links min-h-[54px]" />;
}
