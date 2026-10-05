import { z } from "zod";
export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  locality: z.string().trim().min(2, "Ingresá una localidad.").max(80),
});
export const loginSchema = z.object({ email: z.email("Ingresá un correo válido.").max(254), password: z.string().min(1, "Ingresá tu contraseña.").max(128) });
export const registrationSchema = loginSchema.extend({ display_name: profileSchema.shape.display_name, password: z.string().min(8, "Usá al menos 8 caracteres.").max(128) });
