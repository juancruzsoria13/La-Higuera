import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttributeFields } from "../src/modules/products/attribute-fields";
import { AttributeDetails } from "../src/modules/products/attribute-details";
import { compatibleAttributes, subcategories, validateAttributes, validMapsUrl } from "../src/modules/products/attributes";
import { productSchema } from "../src/modules/products/schema";

describe("Subcategorías y características", () => {
  it("incluye las siete subcategorías de cada rubro", () => {
    expect(subcategories.filter(s => s.category_id === "inmuebles")).toHaveLength(7);
    expect(subcategories.filter(s => s.category_id === "vehiculos")).toHaveLength(7);
  });
  it("adapta los campos a terrenos, casas, bicicletas y repuestos", () => {
    const html = (category: string, subcategory: string) => renderToStaticMarkup(<AttributeFields category={category} subcategory={subcategory} values={{}} onChange={() => {}} />);
    expect(html("inmuebles", "casas")).toContain("Dormitorios");
    for (const label of ["Dormitorios", "Baños", "Cocheras"]) expect(html("inmuebles", "terrenos-lotes")).not.toContain(label);
    expect(html("vehiculos", "bicicletas")).toContain("Rodado");
    expect(html("vehiculos", "bicicletas")).not.toContain("Combustible");
    expect(html("vehiculos", "repuestos-accesorios")).toContain("Modelo de vehículo compatible");
  });
  it("descarta atributos incompatibles al cambiar de subcategoría", () => {
    expect(compatibleAttributes("vehiculos", "bicicletas", {brand: "Marca", mileage: "100", transmission: "manual"})).toEqual({brand: "Marca"});
    expect(compatibleAttributes("inmuebles", "terrenos-lotes", {bedrooms: "2", surface: "200"})).toEqual({surface: "200"});
  });
  it.each([
    ["vehiculos", "casas", {}], ["inmuebles", "terrenos-lotes", {bedrooms: "2"}],
    ["vehiculos", "autos", {year: "2020.5"}], ["vehiculos", "autos", {mileage: "-1"}],
    ["vehiculos", "bicicletas", {bike_type: "otra"}], ["inmuebles", "casas", {credit_eligible: true}],
    ["inmuebles", "casas", []], ["inmuebles", "casas", "invalid json"],
  ])("rechaza campos inválidos en %s/%s", (category, subcategory, values) => {
    expect(() => validateAttributes(category as string, subcategory as string, values)).toThrow();
  });
  it("valida los datos recibidos por la acción y conserva ceros y No", () => {
    const parsed = productSchema.parse({title: "Casa en venta", description: "Casa con patio amplio", price: "100", currency: "USD", category_id: "inmuebles", subcategory_id: "casas", condition: "nuevo", locality_id: "capital", operation: "venta", contact_phone: "2644123456", contact_email: "", status: "activo", attributes: JSON.stringify({age: "0", credit_eligible: "no", surface: "125,50"})});
    expect(parsed.attributes).toEqual({age: "0", credit_eligible: "no", surface: "125.50"});
    const html = renderToStaticMarkup(<AttributeDetails category="inmuebles" subcategory="casas" values={parsed.attributes} />);
    expect(html).toContain(">No<"); expect(html).toContain(">0<"); expect(html).toContain("125,5");
  });
  it.each(["https://maps.app.goo.gl/abc", "https://www.google.com/maps?q=San+Juan", "https://maps.google.com/?q=San+Juan", "https://goo.gl/maps/abc"])("acepta Maps %s", value => expect(validMapsUrl(value)).toBe(true));
  it.each(["javascript:alert(1)", "https://google.com.evil.test/maps", "https://evil.test@google.com/maps", "https://example.com"])("rechaza enlaces %s", value => expect(validMapsUrl(value)).toBe(false));
});
