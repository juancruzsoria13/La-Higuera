import { requireUser } from "@/modules/users/session";
import { getProfile } from "@/lib/api";
import { ProductForm } from "@/modules/products/product-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Publicar anuncio"};
export default async function NewProduct() {
  await requireUser(); const data = await getProfile().catch(() => null);
  return <div className="shell max-w-3xl py-10"><PageHeading title="Dale una nueva historia" description="Publicar es simple. Completá los datos de tu producto." back="/mis-productos" backLabel="Mis anuncios" /><ProductForm locality={data?.locality} /></div>;
}
