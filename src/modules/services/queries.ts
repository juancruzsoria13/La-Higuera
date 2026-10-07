import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/modules/products/queries";
import { trades, type ServiceProvider } from "./schema";
export async function listServices({q = "", trade = "", page = 1, ownerId, limit = PAGE_SIZE}: {q?: string; trade?: string; page?: number; ownerId?: string; limit?: number}) {
  const client = await createClient();
  let query = client.from("service_providers").select("*", {count: "exact"}).order("verified", {ascending: false}).order("created_at", {ascending: false}).order("id", {ascending: false});
  query = ownerId ? query.eq("owner_id", ownerId) : query.eq("status", "activo");
  if (q.trim()) query = query.ilike("name", `%${q.trim().slice(0, 120).replace(/[\\%_]/g, "\\$&")}%`);
  if (trades.includes(trade as typeof trades[number])) query = query.eq("trade", trade);
  const {data, count, error} = await query.range((page - 1) * limit, page * limit - 1);
  if (error) throw new Error("No pudimos cargar los servicios. Intentá nuevamente.");
  return {services: (data ?? []) as ServiceProvider[], count: count ?? 0};
}
export async function getService(id: string) {
  const client = await createClient();
  const {data, error} = await client.from("service_providers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("No pudimos cargar el servicio.");
  return data as ServiceProvider | null;
}
