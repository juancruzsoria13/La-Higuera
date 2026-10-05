import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import type { Product } from "@/modules/products/schema";
import { money } from "@/lib/utils";
import { ProductImage } from "./product-image";
export function ProductCard({product, manage = false}: {product: Product; manage?: boolean}) {
  return <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"><Link href={`/productos/${product.id}`} className="block"><div className="relative"><ProductImage path={product.image_path} title={product.title} /><span className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-medium capitalize">{manage ? product.status : product.condition}</span></div><div className="p-5"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{product.category}</p><h3 className="line-clamp-2 font-semibold">{product.title}</h3><p className="mt-3 text-xl font-semibold tracking-tight">{money(product.price, product.currency)}</p><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{product.locality}</span><ArrowUpRight className="size-4" /></div></div></Link>{manage && <Link className="block border-t px-5 py-3 text-sm font-semibold text-primary hover:bg-muted" href={`/productos/${product.id}/editar`}>Editar anuncio →</Link>}</article>;
}
