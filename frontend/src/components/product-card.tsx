import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { isExpired, REAL_ESTATE, type Product } from "@/modules/products/schema";
import { RenewButton } from "@/modules/products/renew-button";
import { offerOf } from "@/modules/products/offers";
import { OfferBadges } from "@/modules/products/offer-badges";
import { OfferPrice } from "@/modules/products/offer-price";
import { money } from "@/lib/utils";
import { ProductImage } from "./product-image";

const number = new Intl.NumberFormat("es-AR");

/** Lo que más pesa al decidir, en una línea: "Venta · 3 dorm. · 240 m²" o "2016 · 98.000 km". */
function highlights(product: Product): string {
  const value = (product.attributes ?? {}) as Record<string, string | undefined>;
  const parts: (string | false | undefined)[] = product.category_id === REAL_ESTATE ? [
    product.operation === "venta" ? "Venta" : product.operation === "alquiler" && "Alquiler",
    value.bedrooms && `${value.bedrooms} dorm.`,
    value.bathrooms && `${value.bathrooms} ${value.bathrooms === "1" ? "baño" : "baños"}`,
    value.surface && `${number.format(Number(value.surface))} m²`,
  ] : product.category_id === "vehiculos" ? [
    value.year,
    value.mileage && `${number.format(Number(value.mileage))} km`,
    value.wheel_size && `Rodado ${value.wheel_size}`,
    value.compatible_brand && `Para ${[value.compatible_brand, value.compatible_model].filter(Boolean).join(" ")}`,
  ] : [];
  return parts.filter(Boolean).join(" · ");
}

// Tarjeta estilo Mercado Libre: precio primero, datos clave, título y zona. Las promos (oferta, apto crédito) van en badge.
export function ProductCard({product, manage = false}: {product: Product; manage?: boolean}) {
  const expired = manage && isExpired(product);
  const details = highlights(product);
  const offer = offerOf(product);
  const credit = (product.attributes as Record<string, string> | undefined)?.credit_eligible === "si";
  const condition = product.category_id === REAL_ESTATE ? product.condition === "nuevo" && "A estrenar" : product.condition === "nuevo" ? "Nuevo" : "Usado";
  return <article className="pcard group"><Link href={`/productos/${product.id}`} className="flex flex-1 flex-col">
    <div className="relative"><ProductImage path={product.images[0] ?? null} title={product.title} category={product.category_id} />{manage && <span className={`chip absolute left-3 top-3 rounded-full px-2.5 py-1 capitalize ${expired ? "bg-error-surface text-error-foreground" : "bg-card/95 text-foreground"}`}>{expired ? "Vencido" : product.status}</span>}</div>
    <div className="pcard-body">
      <OfferBadges offer={offer} credit={credit} />
      {offer && <p className="pcard-before"><span className="sr-only">Precio anterior: </span><s>{money(offer.list, product.currency)}</s></p>}
      <p className="pcard-price">{offer ? <OfferPrice from={offer.list} to={offer.final} currency={product.currency} /> : money(product.price, product.currency)}</p>
      {details && <p className="pcard-details">{details}</p>}
      <h3 className="pcard-title line-clamp-2">{product.title}</h3>
      <p className="pcard-meta"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{product.locality_name}{condition && ` · ${condition}`}</span></p>
    </div>
  </Link>{expired && <div className="flex flex-col gap-2.5 border-t px-3 pb-3.5 pt-3 sm:px-5 sm:pb-4 sm:pt-3.5"><p className="caption font-normal text-muted-foreground">Venció y ya no aparece en el listado. Renovalo para volver a publicarlo.</p><RenewButton id={product.id} /></div>}{manage && <Link className="label flex items-center justify-between border-t px-3 pb-3.5 pt-3 text-primary hover:bg-muted sm:px-5 sm:pb-4 sm:pt-3.5" href={`/productos/${product.id}/editar`}>Editar anuncio<ArrowRight className="size-4" /></Link>}</article>;
}
