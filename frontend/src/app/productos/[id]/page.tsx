import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, MessageCircle, Pencil, Phone, UserRound, ShieldCheck } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { getProduct } from "@/modules/products/queries";
import { REAL_ESTATE, isExpired, uuidSchema } from "@/modules/products/schema";
import { deleteProduct } from "@/modules/products/actions";
import { RenewButton } from "@/modules/products/renew-button";
import { Fig } from "@/components/fig";
import { ProductGallery } from "@/components/product-gallery";
import { DeleteDialog } from "@/components/delete-dialog";
import { buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { isConfigured } from "@/lib/env";
export default async function ProductDetail({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{guardado?: string; limpieza?: string}>}) {
  const {id} = await params;
  if (!uuidSchema.safeParse(id).success || !isConfigured()) notFound();
  const product = await getProduct(id); if (!product) notFound();
  const user = await currentUser(); const owner = user?.id === product.owner_id;
  const seller = product.seller;
  const search = await searchParams;
  const expired = owner && isExpired(product);
  const hasContact = Boolean(product.contact_phone || product.contact_email);
  return <div className="shell py-7 sm:py-10">
    <Link href={owner ? "/mis-productos" : "/"} className="back mb-6"><ArrowLeft className="size-4" />{owner ? "Mis anuncios" : "Volver a explorar"}</Link>
    {owner && search.guardado && <p role="status" className="notice notice-success mb-6 flex items-center gap-4"><Fig variant={9} className="size-14 shrink-0" />Tu anuncio se guardó correctamente.</p>}
    {owner && search.limpieza && <p className="notice mb-6">El anuncio se guardó. Alguna foto quitada quedó pendiente de limpieza y se reintentará.</p>}
    {expired && <div className="notice mb-6 flex flex-col gap-3"><p>Este anuncio venció y ya no aparece en el listado público.</p><div className="w-fit"><RenewButton id={id} /></div></div>}
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-7"><ProductGallery images={product.images} title={product.title} category={product.category_id} /><section className="panel"><h2 className="h3">{product.category_id === REAL_ESTATE ? "Acerca del inmueble" : "Acerca del producto"}</h2><p className="body max-w-[65ch] whitespace-pre-wrap break-words text-muted-foreground">{product.description}</p></section></div>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-4"><div className="flex flex-wrap gap-2"><span className="chip rounded-full bg-muted px-2.5 py-1 text-primary">{product.category_name}</span>{product.operation && <span className="chip rounded-full border bg-card px-2.5 py-1 capitalize">{product.operation}</span>}<span className="chip rounded-full border bg-card px-2.5 py-1 capitalize">{product.condition}</span>{owner && <span className={`chip rounded-full px-2.5 py-1 capitalize ${expired ? "bg-error-surface text-error-foreground" : "border bg-card"}`}>{expired ? "vencido" : product.status}</span>}</div><h1 className="h1 break-words">{product.title}</h1><p className="price-lg">{money(product.price, product.currency)}</p><p className="body-sm flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" />{product.locality_name}, San Juan</p></div>
        {hasContact && <section className="panel" aria-labelledby="contacto"><h2 id="contacto" className="h3">Contacto</h2><div className="flex flex-col gap-2">{product.contact_phone && <><a href={`https://wa.me/${product.contact_phone}`} target="_blank" rel="noopener noreferrer" className={buttonVariants()}><MessageCircle className="size-4" />WhatsApp</a><a href={`tel:+${product.contact_phone}`} className={buttonVariants({variant: "outline"})}><Phone className="size-4" />+{product.contact_phone}</a></>}{product.contact_email && <a href={`mailto:${product.contact_email}`} className={buttonVariants({variant: "outline"})}><Mail className="size-4" /><span className="truncate">{product.contact_email}</span></a>}</div></section>}
        <section className="panel" aria-labelledby="vendedor"><h2 id="vendedor" className="h3">Publicado por</h2><div className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><UserRound className="size-5" /></span><div className="flex flex-col gap-0.5"><p className="title">{seller || "Vendedor"}</p><p className="caption text-muted-foreground">Publicado el {new Intl.DateTimeFormat("es-AR", {dateStyle: "long", timeZone: "America/Argentina/San_Juan"}).format(new Date(product.created_at))}</p></div></div></section>
        {owner && <div className="flex flex-wrap gap-3"><Link href={`/productos/${id}/editar`} className={buttonVariants()}><Pencil className="size-4" />Editar anuncio</Link><DeleteDialog action={deleteProduct.bind(null, id)} /></div>}
        <div className="safe"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p className="caption font-normal">La Higuera es un espacio de anuncios locales. No procesa compras, pagos ni envíos.</p></div>
      </div>
    </div>
  </div>;
}
