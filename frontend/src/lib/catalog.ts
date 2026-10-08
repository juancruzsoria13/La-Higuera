import "server-only";
import { cache } from "react";
import { api } from "./api";
import { isConfigured } from "./env";
export type Option = {id: string; name: string};
export type Trade = Option & {requires_license: boolean};
export type Catalog = {categories: Option[]; localities: Option[]; trades: Trade[]};
const empty: Catalog = {categories: [], localities: [], trades: []};
/** Rubros, localidades y oficios activos. Una sola consulta por request; vacío si la API no responde. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!isConfigured()) return empty;
  try { return await api<Catalog>("/catalog"); } catch { return empty; }
});
