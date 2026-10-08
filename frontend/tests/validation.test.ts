import { describe, it, expect } from "vitest";
import { isExpired, productSchema } from "../src/modules/products/schema";
import { serviceSchema } from "../src/modules/services/schema";
import { registrationSchema, profileSchema } from "../src/modules/users/schema";
const valid = {title: "Bicicleta urbana", description: "Bicicleta usada en buen estado", price: "120000,50", currency: "ARS", category_id: "otros", condition: "usado", locality_id: "capital", operation: "", contact_phone: "+54 (264) 412-3456", contact_email: "", status: "activo"};
const service = {name: "Juan Gas", trade_id: "gasista", license_number: "1234", license_body: "ENARGAS", description: "Instalaciones de gas domiciliario", phone: "2644123456", locality_id: "capital", contact_email: "", status: "activo"};
const message = (result: {success: boolean; error?: {issues: {message: string}[]}}) => result.error?.issues[0].message;
describe("Validación de productos y perfiles", () => {
  it("acepta decimales argentinos y el precio cero", () => {expect(productSchema.parse(valid).price).toBe(120000.5); expect(productSchema.parse({...valid, price: "0"}).price).toBe(0);});
  it.each(["-1", "1e3", "NaN", "Infinity", "", "1.234", "1.000,00", "1000000000000"])("rechaza precio %s", price => {expect(productSchema.safeParse({...valid, price}).success).toBe(false);});
  it.each([{title: " "}, {description: "corta"}, {category_id: "Otros"}, {category_id: "a".repeat(41)}, {status: "borrado"}, {currency: "EUR"}, {condition: "roto"}, {locality_id: ""}, {operation: "permuta"}, {contact_phone: "llamame"}, {contact_email: "a@b"}])("rechaza campos inválidos %j", value => {expect(productSchema.safeParse({...valid, ...value}).success).toBe(false);});
  it("normaliza el contacto y lo exige solo en anuncios activos", () => {
    expect(productSchema.parse(valid)).toMatchObject({contact_phone: "542644123456", contact_email: null});
    expect(message(productSchema.safeParse({...valid, contact_phone: ""}))).toBe("Dejá un teléfono o un correo de contacto para publicar el anuncio.");
    expect(productSchema.parse({...valid, contact_phone: "", contact_email: " ana@example.com "}).contact_email).toBe("ana@example.com");
    expect(productSchema.safeParse({...valid, contact_phone: "", status: "pausado"}).success).toBe(true);
  });
  it("pide venta o alquiler solo para inmuebles", () => {
    expect(message(productSchema.safeParse({...valid, category_id: "inmuebles"}))).toBe("Indicá si el inmueble es para venta o alquiler.");
    expect(productSchema.parse({...valid, category_id: "inmuebles", operation: "alquiler"}).operation).toBe("alquiler");
    expect(productSchema.parse({...valid, operation: "venta"}).operation).toBeNull();
  });
  it("descarta columnas que el cliente no puede escribir", () => {
    const parsed = productSchema.parse({...valid, owner_id: "attacker", business_id: "other", hidden: false, expires_at: "2099-01-01"});
    for (const key of ["owner_id", "business_id", "hidden", "expires_at", "image_path"]) expect(parsed).not.toHaveProperty(key);
  });
  it("marca vencido solo un anuncio activo con la fecha pasada", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(isExpired({status: "activo", expires_at: "2026-10-08T11:59:59Z"}, now)).toBe(true);
    expect(isExpired({status: "activo", expires_at: "2026-12-07T12:00:00Z"}, now)).toBe(false);
    expect(isExpired({status: "pausado", expires_at: "2026-01-01T00:00:00Z"}, now)).toBe(false);
  });
  it("valida servicios con matrícula y correo opcionales", () => {
    expect(serviceSchema.parse({...service, license_number: " ", license_body: ""})).toMatchObject({license_number: null, license_body: null, contact_email: null});
    expect(serviceSchema.safeParse({...service, license_number: "1"}).success).toBe(false);
    expect(serviceSchema.safeParse({...service, trade_id: "Gasista"}).success).toBe(false);
    expect(serviceSchema.safeParse({...service, contact_email: "sin-arroba"}).success).toBe(false);
  });
  it("valida registro y perfil", () => {expect(registrationSchema.safeParse({display_name: "A", email: "bad", password: "123"}).success).toBe(false); expect(profileSchema.safeParse({display_name: "Ana", locality_id: "capital"}).success).toBe(true); expect(profileSchema.safeParse({display_name: "Ana", locality_id: "San Juan"}).success).toBe(false);});
});
// Las pruebas de imágenes (decodificación, MIME, SVG, tamaño, conversión a WebP) están en backend/tests/test_images.py.
