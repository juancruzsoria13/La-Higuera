import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { productSchema } from "../src/modules/products/schema";
import { registrationSchema, profileSchema } from "../src/modules/users/schema";
import { normalizeImage, MAX_IMAGE_BYTES } from "../src/modules/products/images";
const valid = {title: "Bicicleta urbana", description: "Bicicleta usada en buen estado", price: "120000,50", currency: "ARS", category: "Otros", condition: "usado", locality: "Capital", status: "activo"};
describe("Validación de productos y perfiles", () => {
  it("acepta decimales argentinos y el precio cero", () => {expect(productSchema.parse(valid).price).toBe(120000.5); expect(productSchema.parse({...valid, price: "0"}).price).toBe(0);});
  it.each(["-1", "1e3", "NaN", "Infinity", "", "1.234", "1.000,00", "1000000000000"])("rechaza precio %s", price => {expect(productSchema.safeParse({...valid, price}).success).toBe(false);});
  it.each([{title: " "}, {description: "corta"}, {category: "Empleo"}, {status: "borrado"}, {currency: "EUR"}, {condition: "roto"}, {locality: ""}])("rechaza campos inválidos %j", value => {expect(productSchema.safeParse({...valid, ...value}).success).toBe(false);});
  it("descarta los propietarios enviados por el cliente", () => {expect(productSchema.parse({...valid, owner_id: "attacker", business_id: "other"})).not.toHaveProperty("owner_id");});
  it("valida registro y perfil", () => {expect(registrationSchema.safeParse({display_name: "A", email: "bad", password: "123"}).success).toBe(false); expect(profileSchema.safeParse({display_name: "Ana", locality: "Capital"}).success).toBe(true);});
});
describe("Imágenes: contenido real y límites", () => {
  it("decodifica y convierte a WebP sin metadatos", async () => {const data = await sharp({create: {width: 20, height: 10, channels: 3, background: "red"}}).png().toBuffer(); const output = await normalizeImage(new File([new Uint8Array(data)], "foto.png", {type: "image/png"})); const info = await sharp(output).metadata(); expect(info.format).toBe("webp"); expect(info.exif).toBeUndefined();});
  it("rechaza un archivo de texto disfrazado", async () => {await expect(normalizeImage(new File(["no es una foto"], "fake.jpg", {type: "image/jpeg"}))).rejects.toThrow("No pudimos leer");});
  it("rechaza MIME falso incluso cuando la imagen es válida", async () => {const data = await sharp({create: {width: 2, height: 2, channels: 3, background: "red"}}).png().toBuffer(); await expect(normalizeImage(new File([new Uint8Array(data)], "fake.jpg", {type: "image/jpeg"}))).rejects.toThrow();});
  it("rechaza SVG y archivos de más de 5 MB", async () => {await expect(normalizeImage(new File(["<svg/>"], "test.svg", {type: "image/svg+xml"}))).rejects.toThrow("JPG"); await expect(normalizeImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", {type: "image/png"}))).rejects.toThrow("5 MB");});
});
