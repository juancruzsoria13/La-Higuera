import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { isExpired, type Product } from "@/modules/products/schema";
import { RenewButton } from "@/modules/products/renew-button";
import { money } from "@/lib/utils";
import { ProductImage } from "./product-image";
export function ProductCard({product, manage = false}: {product: Product; manage?: boolean}) {
  const expired = manage && isExpired(product);
  return <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_10px_15px_-3px_rgba(22,75,250,.05),0_4px_6px_-4px_rgba(22,75,250,.05)]"><Link href={`/productos/${product.id}`} className="flex flex-1 flex-col">
    <div className="relative"><ProductImage path={product.images[0] ?? null} title={product.title} category={product.category_id} /><span className={`chip absolute left-3 top-3 rounded-full px-2.5 py-1 capitalize ${expired ? "bg-error-surface text-error-foreground" : "bg-card/95 text-foreground"}`}>{expired ? "Vencido" : manage ? product.status : product.condition}</span></div>
    <div className="flex flex-1 flex-col px-3 pb-3.5 pt-3 sm:p-5"><p className="overline">{product.category_name}{product.operation && ` · ${product.operation}`}</p><h3 className="title mt-2 line-clamp-2">{product.title}</h3><p className="price mt-3 text-lg leading-6 sm:text-[22px] sm:leading-7">{money(product.price, product.currency)}</p><div className="caption mt-auto flex items-center pt-3 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{product.locality_name}</span></div></div>
  </Link>{expired && <div className="flex flex-col gap-2.5 border-t px-3 pb-3.5 pt-3 sm:px-5 sm:pb-4 sm:pt-3.5"><p className="caption font-normal text-muted-foreground">Venció y ya no aparece en el listado. Renovalo para volver a publicarlo.</p><RenewButton id={product.id} /></div>}{manage && <Link className="label flex items-center justify-between border-t px-3 pb-3.5 pt-3 text-primary hover:bg-muted sm:px-5 sm:pb-4 sm:pt-3.5" href={`/productos/${product.id}/editar`}>Editar anuncio<ArrowRight className="size-4" /></Link>}</article>;
}
