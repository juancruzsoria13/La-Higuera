import "server-only";
import { api, ApiError, query } from "@/lib/api";
import type { Product } from "./schema";
export const PAGE_SIZE = 12;
type Page<T> = {items: T[]; count: number};
export async function listProducts({q = "", category = "", page = 1, mine = false}: {q?: string; category?: string; page?: number; mine?: boolean}) {
  const result = await api<Page<Product>>(`/products?${query({q: q.trim().slice(0, 120), category, page, mine: mine || undefined})}`);
  return {products: result.items, count: result.count};
}
export async function getProduct(id: string) {
  try { return await api<Product & {seller: string | null}>(`/products/${id}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
