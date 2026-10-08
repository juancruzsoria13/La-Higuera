import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, MessageCircle, Pencil, Phone, UserRound, ShieldCheck } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { getProduct } from "@/modules/products/queries";
import { isExpired, uuidSchema } from "@/modules/products/schema";
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
  return <div className="shell py-10"><Link href={owner ? "/mis-productos" : "/"} className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{owner ? "Mis anuncios" : "Volver a explorar"}</Link>{owner && search.guardado && <p role="status" className="notice notice-success mb-6 flex items-center gap-4"><Fig variant={9} className="size-14 shrink-0" />Tu anuncio se guardó correctamente.</p>}{owner && search.limpieza && <p className="notice mb-6">El anuncio se guardó. Alguna foto quitada quedó pendiente de limpieza y se reintentará.</p>}{expired && <div className="notice mb-6 space-y-3"><p>Este anuncio venció y ya no aparece en el listado público.</p><RenewButton id={id} /></div>}<div className="grid items-start gap-9 lg:grid-cols-[1.25fr_1fr]"><div><ProductGallery images={product.images} title={product.title} category={product.category_id} /><section className="mt-7 rounded-2xl border bg-card p-6"><h2 className="text-lg font-semibold">Acerca del producto</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{product.description}</p></section></div><div><div className="mb-4 flex flex-wrap gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs text-primary">{product.category_name}</span>{product.operation && <span className="rounded-full border px-3 py-1.5 text-xs capitalize">{product.operation}</span>}<span className="rounded-full border px-3 py-1.5 text-xs capitalize">{product.condition}</span>{owner && <span className="rounded-full border px-3 py-1.5 text-xs capitalize">{expired ? "vencido" : product.status}</span>}</div><h1 className="break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{product.title}</h1><p className="mt-6 text-4xl font-semibold tracking-tight">{money(product.price, product.currency)}</p><p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{product.locality_name}, San Juan</p>
    {hasContact && <div className="mt-7 rounded-2xl border bg-card p-5"><p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Contacto</p><div className="flex flex-col gap-2">{product.contact_phone && <><a href={`https://wa.me/${product.contact_phone}`} target="_blank" rel="noopener noreferrer" className={buttonVariants()}><MessageCircle className="size-4" />WhatsApp</a><a href={`tel:+${product.contact_phone}`} className={buttonVariants({variant: "outline"})}><Phone className="size-4" />+{product.contact_phone}</a></>}{product.contact_email && <a href={`mailto:${product.contact_email}`} className={buttonVariants({variant: "outline"})}><Mail className="size-4" /><span className="truncate">{product.contact_email}</span></a>}</div></div>}
    <div className="my-7 rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Publicado por</p><p className="mt-3 flex items-center gap-3 font-semibold"><span className="rounded-full bg-muted p-2"><UserRound className="size-5 text-primary" /></span>{seller || "Vendedor"}</p><p className="mt-4 text-xs text-muted-foreground">Publicado el {new Intl.DateTimeFormat("es-AR", {dateStyle: "long", timeZone: "America/Argentina/San_Juan"}).format(new Date(product.created_at))}</p></div>{owner && <div className="flex flex-wrap gap-3"><Link href={`/productos/${id}/editar`} className={buttonVariants()}><Pencil className="size-4" />Editar anuncio</Link><DeleteDialog action={deleteProduct.bind(null, id)} /></div>}<div className="mt-7 flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 size-5 shrink-0 text-primary" /><p>La Higuera es un espacio de anuncios locales. No procesa compras, pagos ni envíos.</p></div></div></div></div>;
}
