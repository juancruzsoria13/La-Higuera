import type { Offer } from "./offers";

/** Promos en badge de alto contraste, arriba del precio (ver "Diseño" en CLAUDE.md). */
export function OfferBadges({offer, credit = false}: {offer: Offer | null; credit?: boolean}) {
  if (!offer && !credit) return null;
  return <div className="flex flex-wrap gap-1.5">
    {offer?.drop ? <span className="pcard-badge">{offer.drop}% OFF</span> : null}
    {/* En tarjetas angostas (celular) entra en una línea sin "La Higuera"; lo explican la franja y el detalle. */}
    {offer?.exclusive ? <span className="pcard-badge">{offer.exclusive}% exclusivo<span className="max-sm:hidden"> La Higuera</span></span> : null}
    {credit && <span className="pcard-badge">Apto crédito</span>}
  </div>;
}
