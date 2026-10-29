import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { PAGE_SIZE } from "@/modules/products/queries";
export function Pagination({page, count, base = "/", q = "", category = "", subcategory = "", offers = false}: {page: number; count: number; base?: string; q?: string; category?: string; subcategory?: string; offers?: boolean}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) => `${base}?${new URLSearchParams({q, category, ...(subcategory ? {subcategory} : {}), ...(offers ? {ofertas: "1"} : {}), page: String(p)})}`;
  if (pages === 1 && page === 1) return null;
  return <nav aria-label="Paginación" className="mt-2 flex items-center justify-center gap-4">{page > 1 && <Link className={buttonVariants({variant: "outline"})} href={href(page - 1)}>Anterior</Link>}<span className="body-sm text-muted-foreground">Página {page} de {pages}</span>{page < pages && <Link className={buttonVariants({variant: "outline"})} href={href(page + 1)}>Siguiente</Link>}</nav>;
}
