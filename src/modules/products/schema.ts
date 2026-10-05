import { z } from "zod";
export const categories = ["Tecnología", "Hogar", "Vehículos", "Otros"] as const;
export const statuses = ["activo", "pausado", "vendido"] as const;
export const productSchema = z.object({
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(120),
  description: z.string().trim().min(10, "Contanos un poco más: al menos 10 caracteres.").max(5000),
  price: z.string().trim().regex(/^\d{1,12}([.,]\d{1,2})?$/, "Ingresá un precio válido, sin miles y con hasta 2 decimales.").transform(v => Number(v.replace(",", "."))),
  currency: z.enum(["ARS", "USD"]),
  category: z.enum(categories),
  condition: z.enum(["nuevo", "usado"]),
  locality: z.string().trim().min(2, "Ingresá tu localidad.").max(80),
  status: z.enum(statuses),
});
export const uuidSchema = z.string().uuid();
export type Product = z.output<typeof productSchema> & {id: string; owner_id: string; business_id: string | null; image_path: string | null; created_at: string; updated_at: string};
