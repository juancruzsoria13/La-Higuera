import { z } from "zod";
import { optionalEmail, optionalPhone, slug } from "@/lib/validation";
export const statuses = ["activo", "pausado", "vendido"] as const;
export const operations = ["venta", "alquiler"] as const;
export const REAL_ESTATE = "inmuebles";
export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const productSchema = z.object({
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(120),
  description: z.string().trim().min(10, "Contanos un poco más: al menos 10 caracteres.").max(5000),
  price: z.string().trim().regex(/^\d{1,12}([.,]\d{1,2})?$/, "Ingresá un precio válido, sin miles y con hasta 2 decimales.").transform(v => Number(v.replace(",", "."))),
  currency: z.enum(["ARS", "USD"]),
  category_id: slug("Elegí un rubro de la lista."),
  condition: z.enum(["nuevo", "usado"]),
  locality_id: slug("Elegí una localidad de la lista."),
  operation: z.enum(["", ...operations], {error: "Elegí si es venta o alquiler."}),
  contact_phone: optionalPhone,
  contact_email: optionalEmail,
  status: z.enum(statuses),
}).superRefine((value, context) => {
  // Mismas reglas que products_operation_by_category y products_active_contact.
  if (value.category_id === REAL_ESTATE && !value.operation) context.addIssue({code: "custom", path: ["operation"], message: "Indicá si el inmueble es para venta o alquiler."});
  if (value.status === "activo" && !value.contact_phone && !value.contact_email) context.addIssue({code: "custom", path: ["contact_phone"], message: "Dejá un teléfono o un correo de contacto para publicar el anuncio."});
}).transform(value => ({...value, operation: value.category_id === REAL_ESTATE && value.operation ? value.operation : null}));
export const uuidSchema = z.string().uuid();
export type Product = z.output<typeof productSchema> & {
  id: string; owner_id: string; business_id: string | null; images: string[]; category_name: string | null; locality_name: string | null;
  expires_at: string; hidden: boolean; created_at: string; updated_at: string;
};
/** Activo pero fuera del listado público por vencimiento: solo lo ve su dueño hasta renovarlo. */
export const isExpired = (product: Pick<Product, "status" | "expires_at">, now = Date.now()) => product.status === "activo" && Date.parse(product.expires_at) <= now;
