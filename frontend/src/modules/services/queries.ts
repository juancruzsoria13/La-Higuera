import "server-only";
import { api, ApiError, query } from "@/lib/api";
import { PAGE_SIZE } from "@/modules/products/queries";
import type { ServiceProvider } from "./schema";
export async function listServices({q = "", trade = "", page = 1, mine = false, limit = PAGE_SIZE}: {q?: string; trade?: string; page?: number; mine?: boolean; limit?: number}) {
  const result = await api<{items: ServiceProvider[]; count: number}>(`/services?${query({q: q.trim().slice(0, 120), trade, page, limit, mine: mine || undefined})}`);
  return {services: result.items, count: result.count};
}
export async function getService(id: string) {
  try { return await api<ServiceProvider>(`/services/${id}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
