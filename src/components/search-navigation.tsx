"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CarFront, Wrench, House, LayoutGrid, Search, Shapes, Smartphone } from "lucide-react";
import { categories } from "@/modules/products/schema";

const categoryIcons = [Smartphone, House, CarFront, Shapes];

export function SearchNavigation() {
  const params = useSearchParams();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const q = isHome ? (params.get("q") ?? "").slice(0, 120) : "";
  const category = isHome ? categories.find(item => item === params.get("category")) ?? "" : "";

  return (
    <>
      <form action="/" role="search" aria-label="Buscar anuncios" className="header-search">
        <input key={q} aria-label="Buscar por título" name="q" defaultValue={q} maxLength={120} placeholder="¿Qué estás buscando hoy?" className="min-w-0 flex-1 rounded-l-xl bg-white px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-slate-500 sm:px-5" />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" aria-label="Buscar" className="my-2 flex w-14 shrink-0 items-center justify-center border-l border-slate-200 text-primary transition hover:text-blue-800"><Search className="size-5" aria-hidden="true" /></button>
      </form>
      <nav aria-label="Categorías" className="header-categories">
        {["", ...categories].map((item, index) => {
          const Icon = index === 0 ? LayoutGrid : categoryIcons[index - 1];
          const active = isHome && category === item;
          return (
            <Link key={item} href={`/?${new URLSearchParams({ ...(q ? { q } : {}), ...(item ? { category: item } : {}) })}`} aria-current={active ? "page" : undefined} className={`category-link ${active ? "category-link-active" : ""}`}>
              <Icon className="size-4 shrink-0" aria-hidden="true" />{item || "Todo"}
            </Link>
          );
        })}
        <Link href="/servicios" aria-current={pathname.startsWith("/servicios") ? "page" : undefined} className={`category-link ml-auto font-semibold ${pathname.startsWith("/servicios") ? "category-link-active" : "bg-white/15"}`}>
          <Wrench className="size-4 shrink-0" aria-hidden="true" />Servicios
        </Link>
      </nav>
    </>
  );
}

export function SearchNavigationFallback() {
  return <><div className="header-search h-[52px]" /><div className="header-categories h-11" /></>;
}
