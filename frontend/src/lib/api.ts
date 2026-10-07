import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const base = () => (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

/** Llama a la API de Python con el token de la sesión de Supabase; RLS se aplica con esa identidad. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (isConfigured()) {
    const client = await createClient();
    const {data: {session}} = await client.auth.getSession();
    if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  try {
    return await fetch(`${base()}/api${path}`, {...init, headers, cache: "no-store"});
  } catch {
    throw new ApiError(503, "No pudimos conectar con el servidor. Intentá nuevamente en unos minutos.");
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let message = "Ocurrió un error inesperado. Intentá nuevamente.";
    try { message = (await response.json()).detail ?? message; } catch { /* respuesta sin JSON */ }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}
export const json = (body: unknown, method = "POST"): RequestInit => ({method, body: JSON.stringify(body), headers: {"Content-Type": "application/json"}});
export const query = (params: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
export type Profile = {display_name: string; locality: string; email: string};
export const getProfile = () => api<Profile>("/profile");
