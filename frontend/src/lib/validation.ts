import { z } from "zod";
/** Mismos formatos que las restricciones de la base y que backend/app/schemas.py. */
export const slug = (message: string) => z.string().trim().max(40, message).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, message);
const digits = (value: string) => value.trim().replace(/[\s().-]/g, "").replace(/^\+/, "");
const phoneMessage = "Ingresá un teléfono válido, con código de área y sin letras.";
export const phone = z.string().transform(digits).pipe(z.string().regex(/^\d{8,15}$/, phoneMessage));
export const optionalPhone = z.string().transform(digits).pipe(z.string().regex(/^(\d{8,15})?$/, phoneMessage)).transform(v => v || null);
export const optionalEmail = z.string().trim().max(254, "Ingresá un correo válido.").regex(/^([^@\s]+@[^@\s]+\.[^@\s]+)?$/, "Ingresá un correo válido.").transform(v => v || null);
export const optionalText = (max: number, message: string) => z.string().trim().refine(v => !v || v.length >= 2, message).pipe(z.string().max(max)).transform(v => v || null);
