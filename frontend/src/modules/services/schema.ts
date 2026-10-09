import { z } from "zod";
import { optionalEmail, optionalText, phone, slug } from "@/lib/validation";
export const serviceStatuses = ["activo", "pausado"] as const;
// Si el oficio exige matrícula lo decide la tabla `trades`: lo comprueban la server action y la API.
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre con el que querés aparecer.").max(100),
  trade_id: slug("Elegí un oficio de la lista."),
  license_number: optionalText(40, "Ingresá tu número de matrícula."),
  license_body: optionalText(100, "Indicá qué entidad emitió la matrícula."),
  description: z.string().trim().min(10, "Contanos un poco más: al menos 10 caracteres.").max(3000),
  phone,
  locality_id: slug("Elegí una localidad de la lista."),
  contact_email: optionalEmail,
  status: z.enum(serviceStatuses),
});
export const LICENSE_REQUIRED = "Este oficio exige matrícula: ingresá el número y la entidad que la emitió.";
export type ServiceProvider = z.output<typeof serviceSchema> & {
  id: string; owner_id: string; verified: boolean; references_verified: boolean; trade_name: string | null; requires_license: boolean;
  locality_name: string | null; avatar: string | null; work_images: string[]; created_at: string; updated_at: string;
};
