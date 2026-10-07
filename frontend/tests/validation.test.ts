import { describe, it, expect } from "vitest";
import { productSchema } from "../src/modules/products/schema";
import { registrationSchema, profileSchema } from "../src/modules/users/schema";
const valid = {title: "Bicicleta urbana", description: "Bicicleta usada en buen estado", price: "120000,50", currency: "ARS", category: "Otros", condition: "usado", locality: "Capital", status: "activo"};
describe("Validación de productos y perfiles", () => {
  it("acepta decimales argentinos y el precio cero", () => {expect(productSchema.parse(valid).price).toBe(120000.5); expect(productSchema.parse({...valid, price: "0"}).price).toBe(0);});
  it.each(["-1", "1e3", "NaN", "Infinity", "", "1.234", "1.000,00", "1000000000000"])("rechaza precio %s", price => {expect(productSchema.safeParse({...valid, price}).success).toBe(false);});
  it.each([{title: " "}, {description: "corta"}, {category: "Empleo"}, {status: "borrado"}, {currency: "EUR"}, {condition: "roto"}, {locality: ""}])("rechaza campos inválidos %j", value => {expect(productSchema.safeParse({...valid, ...value}).success).toBe(false);});
  it("descarta los propietarios enviados por el cliente", () => {expect(productSchema.parse({...valid, owner_id: "attacker", business_id: "other"})).not.toHaveProperty("owner_id");});
  it("valida registro y perfil", () => {expect(registrationSchema.safeParse({display_name: "A", email: "bad", password: "123"}).success).toBe(false); expect(profileSchema.safeParse({display_name: "Ana", locality: "Capital"}).success).toBe(true);});
});
// Las pruebas de imágenes (decodificación, MIME, SVG, tamaño, conversión a WebP) están en backend/tests/test_images.py.
