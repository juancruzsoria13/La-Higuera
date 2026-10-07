import { z } from "zod";
export const trades = ["Gasista", "Plomero", "Electricista", "Albañil", "Pintor", "Carpintero", "Herrero", "Refrigeración", "Cerrajero", "Otros oficios"] as const;
export const serviceStatuses = ["activo", "pausado"] as const;
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre con el que querés aparecer.").max(100),
  trade: z.enum(trades),
  license_number: z.string().trim().min(2, "Ingresá tu número de matrícula.").max(40),
  license_body: z.string().trim().min(2, "Indicá qué entidad emitió la matrícula.").max(100),
  description: z.string().trim().min(10, "Contanos un poco más: al menos 10 caracteres.").max(3000),
  phone: z.string().trim().transform(v => v.replace(/[\s().-]/g, "").replace(/^\+/, "")).pipe(z.string().regex(/^\d{8,15}$/, "Ingresá un teléfono válido, con código de área y sin letras.")),
  locality: z.string().trim().min(2, "Ingresá tu localidad.").max(80),
  status: z.enum(serviceStatuses),
});
export type ServiceProvider = z.output<typeof serviceSchema> & {id: string; owner_id: string; verified: boolean; created_at: string; updated_at: string};
