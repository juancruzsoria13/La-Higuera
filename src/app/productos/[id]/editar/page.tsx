import { notFound } from "next/navigation";
import { requireUser } from "@/modules/users/session";
import { getProduct } from "@/modules/products/queries";
import { uuidSchema } from "@/modules/products/schema";
import { ProductForm } from "@/modules/products/product-form";
import { PageHeading } from "@/components/page-heading";
export const metadata = {title: "Editar anuncio"};
export default async function EditProduct({params}: {params: Promise<{id: string}>}) {
  const user = await requireUser(); const {id} = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const product = await getProduct(id);
  if (!product || product.owner_id !== user.id) notFound();
  return <div className="shell max-w-3xl py-10"><PageHeading title="Editar anuncio" description="Actualizá los detalles o cambiá el estado de tu publicación." back={`/productos/${id}`} backLabel="Volver al anuncio" /><ProductForm product={product} /></div>;
}
