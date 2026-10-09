import Link from "next/link";
import { Plus, PackageOpen } from "lucide-react";
import { requireUser } from "@/modules/users/session";
import { listProducts } from "@/modules/products/queries";
import { ProductCard } from "@/components/product-card";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
export const metadata = {title: "Mis anuncios"};
export default async function MyProducts({searchParams}: {searchParams: Promise<{page?: string; eliminado?: string; limpieza?: string}>}) {
  await requireUser(); const params = await searchParams;
  const page = Math.max(1, Math.min(10000, parseInt(params.page ?? "1") || 1));
  const {products, count} = await listProducts({mine: true, page});
  return <div className="shell py-7 sm:py-10"><PageHeading title="Mis anuncios" description="Tus productos, cada uno en su momento. Editá, pausá, marcá como vendido o renová los vencidos." action={<Link href="/productos/nuevo" className={buttonVariants()}><Plus className="size-4" />Nuevo anuncio</Link>} />{params.eliminado && <p className="notice notice-success mb-6">El anuncio se eliminó correctamente.</p>}{params.limpieza && <p className="notice mb-6">El cambio se guardó. Quedó una foto pendiente de limpieza; se reintentará con tu próxima operación o con la tarea de mantenimiento.</p>}{products.length ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{products.map(product => <ProductCard product={product} manage key={product.id} />)}</div> : <div className="rounded-2xl border border-dashed border-border-strong bg-card p-14 text-center"><PackageOpen className="mx-auto mb-4 size-10 text-primary/60" /><h2 className="h3">{page > 1 ? "No hay anuncios en esta página" : "Todavía no publicaste anuncios"}</h2><p className="body-sm mt-3 text-muted-foreground">Empezá con eso que ya no usás. Puede ser justo lo que alguien busca.</p></div>}<div className="mt-6"><Pagination page={page} count={count} base="/mis-productos" /></div></div>;
}
