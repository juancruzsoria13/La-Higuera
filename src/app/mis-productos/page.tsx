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
  const user = await requireUser(); const params = await searchParams;
  const page = Math.max(1, Math.min(10000, parseInt(params.page ?? "1") || 1));
  const {products, count} = await listProducts({ownerId: user.id, page});
  return <div className="shell py-10"><div className="flex flex-wrap items-center justify-between gap-4"><PageHeading title="Mis anuncios" description="Tus productos, cada uno en su momento. Editá, pausá o marcá como vendido." /><Link href="/productos/nuevo" className={buttonVariants({className: "mb-8"})}><Plus className="size-4" />Nuevo anuncio</Link></div>{params.eliminado && <p className="notice notice-success mb-6">El anuncio se eliminó correctamente.</p>}{params.limpieza && <p className="notice mb-6">El cambio se guardó. Quedó una imagen pendiente de limpieza; se reintentará con tu próxima operación o con la tarea de mantenimiento.</p>}{products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map(product => <ProductCard product={product} manage key={product.id} />)}</div> : <div className="rounded-2xl border border-dashed bg-card p-14 text-center"><PackageOpen className="mx-auto mb-4 size-10 text-primary/60" /><h2 className="text-xl font-semibold">{page > 1 ? "No hay anuncios en esta página" : "Todavía no publicaste anuncios"}</h2><p className="mt-3 text-sm text-muted-foreground">Empezá con eso que ya no usás. Puede ser justo lo que alguien busca.</p></div>}<Pagination page={page} count={count} base="/mis-productos" /></div>;
}
