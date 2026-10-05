import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categories, type Product } from "./schema";
export const PAGE_SIZE = 12;
export async function listProducts({q = "", category = "", page = 1, ownerId}: {q?: string; category?: string; page?: number; ownerId?: string}) {
  const client = await createClient();
  let query = client.from("products").select("*", {count: "exact"}).order("created_at", {ascending: false}).order("id", {ascending: false});
  query = ownerId ? query.eq("owner_id", ownerId) : query.eq("status", "activo");
  if (q.trim()) query = query.ilike("title", `%${q.trim().slice(0, 120).replace(/[\\%_]/g, "\\$&")}%`);
  if (categories.includes(category as typeof categories[number])) query = query.eq("category", category);
  const {data, count, error} = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("No pudimos cargar los anuncios. Intentá nuevamente.");
  return {products: (data ?? []) as Product[], count: count ?? 0};
}
export async function getProduct(id: string) {
  const client = await createClient();
  const {data, error} = await client.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("No pudimos cargar el anuncio.");
  return data as Product | null;
}
