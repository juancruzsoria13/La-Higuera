import { requireUser } from "@/modules/users/session";
import { getProfile } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { ProductForm } from "@/modules/products/product-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Publicar anuncio"};
export default async function NewProduct() {
  await requireUser(); const [data, catalog] = await Promise.all([getProfile().catch(() => null), getCatalog()]);
  return <div className="shell max-w-3xl py-7 sm:py-10"><PageHeading title="Dale una nueva historia" description="Publicar es simple. Completá los datos de tu producto." back="/mis-productos" backLabel="Mis anuncios" /><ProductForm catalog={catalog} locality={data?.locality_id} /></div>;
}
