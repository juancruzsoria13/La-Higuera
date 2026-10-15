import catalog from "./product_catalog.json";

export type AttributeDefinition = {
  label: string; type: string; maxLength?: number; min?: number; max?: number; step?: string;
  options?: {id: string; name: string}[];
};
export const subcategories = catalog.subcategories;
export const attributeDefinitions: Record<string, AttributeDefinition> = catalog.attributes;
export const getSubcategory = (category: string, subcategory?: string | null) =>
  subcategories.find(item => item.category_id === category && item.id === subcategory);

export function validMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (
      ["maps.app.goo.gl", "maps.google.com"].includes(url.hostname) ||
      (url.hostname === "goo.gl" && url.pathname.startsWith("/maps/")) ||
      (["google.com", "www.google.com", "google.com.ar", "www.google.com.ar"].includes(url.hostname) &&
        (url.pathname === "/maps" || url.pathname.startsWith("/maps/")))
    );
  } catch { return false; }
}

export function validateAttributes(category: string, subcategory: string | null, input: unknown): Record<string, string> {
  const selected = getSubcategory(category, subcategory);
  if (subcategory && !selected) throw new Error("Elegí una subcategoría del rubro seleccionado.");
  let values = input;
  if (typeof values === "string") {
    try { values = JSON.parse(values || "{}"); }
    catch { throw new Error("Revisá las características del anuncio."); }
  }
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Revisá las características del anuncio.");
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!selected?.attributes.includes(key)) throw new Error("Hay características que no corresponden a la subcategoría.");
    if (typeof raw !== "string") throw new Error("Revisá las características del anuncio.");
    let value = raw.trim();
    if (!value) continue;
    const definition = attributeDefinitions[key];
    let valid = value.length <= (definition.maxLength ?? 120);
    if (definition.type === "select") valid = !!definition.options?.some(option => option.id === value);
    else if (definition.type === "number") {
      const pattern = definition.step === "0.01" ? /^\d{1,12}([.,]\d{1,2})?$/ : /^\d{1,12}$/;
      const number = Number(value.replace(",", "."));
      valid = pattern.test(value) && number >= definition.min! && number <= definition.max!;
      value = value.replace(",", ".");
    } else if (definition.type === "url") valid = valid && validMapsUrl(value);
    if (!valid) throw new Error(`Revisá el campo ${definition.label}.`);
    result[key] = value;
  }
  return result;
}

/** Conserva solo los campos compatibles al cambiar de subcategoría. */
export function compatibleAttributes(category: string, subcategory: string, values: Record<string, string>) {
  const allowed = getSubcategory(category, subcategory)?.attributes ?? [];
  return Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
}
