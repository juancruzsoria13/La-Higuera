import "server-only";
import { cache } from "react";
import { api } from "./api";
import { isConfigured } from "./env";
export type Option = {id: string; name: string};
export type Trade = Option & {requires_license: boolean};
export type Catalog = {categories: Option[]; localities: Option[]; trades: Trade[]};
const defaultCategories: Option[] = [
  {id: "inmuebles", name: "Inmuebles"},
  {id: "tecnologia", name: "Tecnología"},
  {id: "vehiculos", name: "Vehículos"},
  {id: "ropa", name: "Ropa"},
  {id: "muebles", name: "Muebles"},
  {id: "electrodomesticos", name: "Electrodomésticos"},
  {id: "materiales-construccion", name: "Materiales de construcción"},
  {id: "otros", name: "Otros"},
];
const empty: Catalog = {categories: defaultCategories, localities: [], trades: []};
/** Rubros, localidades y oficios activos. Una sola consulta por request; vacío si la API no responde. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!isConfigured()) return empty;
  try {
    const catalog = await api<Catalog>("/catalog");
    return catalog.categories.length ? catalog : {...catalog, categories: defaultCategories};
  } catch { return empty; }
});
