import type { Product } from "./schema";

export type Offer = {list: number; final: number; drop: number; exclusive: number};

/**
 * Una oferta es un precio rebajado (la base guarda el anterior cuando el dueño lo baja) o un descuento
 * exclusivo para quien llega desde La Higuera. `list` va tachado, `final` es lo que paga quien compra.
 */
export function offerOf(product: Pick<Product, "price" | "previous_price" | "exclusive_discount">): Offer | null {
  const exclusive = product.exclusive_discount ?? 0;
  const list = product.previous_price ?? product.price;
  const final = Math.round(product.price * (100 - exclusive)) / 100;
  if (final >= list) return null;
  const drop = product.previous_price ? Math.max(1, Math.round((1 - product.price / product.previous_price) * 100)) : 0;
  return {list, final, drop, exclusive};
}

/** Cuadro de la animación del precio: baja rápido y frena al llegar (ease-out). Termina exacto en el final. */
export function priceAt(from: number, to: number, progress: number) {
  if (progress >= 1) return to;
  return Math.round(from - (from - to) * (1 - (1 - progress) ** 3));
}
