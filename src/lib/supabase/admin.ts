import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes("YOUR_")) throw new Error("La eliminación de cuentas todavía no está configurada. Contactá al administrador.");
  return createClient(publicEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
