import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { offerOf, priceAt } from "../src/modules/products/offers";
import { OfferPrice } from "../src/modules/products/offer-price";

describe("Ofertas", () => {
  it("no es oferta sin precio anterior ni descuento exclusivo", () => {
    expect(offerOf({price: 1000, previous_price: null, exclusive_discount: null})).toBeNull();
  });
  it("precio rebajado: tacha el anterior y calcula el porcentaje", () => {
    expect(offerOf({price: 850, previous_price: 1000, exclusive_discount: null})).toEqual({list: 1000, final: 850, drop: 15, exclusive: 0});
    // Una rebaja mínima igual se muestra como oferta, con al menos 1%.
    expect(offerOf({price: 999, previous_price: 1000, exclusive_discount: null})?.drop).toBe(1);
  });
  it("descuento exclusivo: el precio final ya lo aplica, y se suma a una rebaja", () => {
    expect(offerOf({price: 1000, previous_price: null, exclusive_discount: 10})).toEqual({list: 1000, final: 900, drop: 0, exclusive: 10});
    expect(offerOf({price: 850, previous_price: 1000, exclusive_discount: 10})).toEqual({list: 1000, final: 765, drop: 15, exclusive: 10});
    expect(offerOf({price: 85000.5, previous_price: null, exclusive_discount: 15})?.final).toBe(72250.43);
  });
  it("la animación baja del precio anterior al final y termina exacta", () => {
    expect(priceAt(1000, 850, 0)).toBe(1000);
    const middle = priceAt(1000, 850, .5);
    expect(middle).toBeLessThan(1000);
    expect(middle).toBeGreaterThan(850);
    expect(priceAt(1000, 850, 1)).toBe(850);
    expect(priceAt(85000, 72250.43, 1)).toBe(72250.43);
  });
  it("sin JavaScript y para lectores de pantalla muestra el precio final", () => {
    const html = renderToStaticMarkup(<OfferPrice from={1000000} to={850000} currency="ARS" />);
    expect(html.match(/\$ 850\.000/g)).toHaveLength(2);
    expect(html).not.toContain("1.000.000");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("sr-only");
  });
});
