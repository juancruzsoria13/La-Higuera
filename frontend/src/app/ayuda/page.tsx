import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {title: "Ayuda"};

export default function HelpPage() {
  return <div className="shell py-7 sm:py-10">
    <PageHeading title="Ayuda" description="Respuestas rápidas para usar La Higuera." />
    <div className="grid max-w-4xl gap-5 sm:grid-cols-2">
      <section className="panel">
        <h2 className="h3">¿Cómo publico un anuncio?</h2>
        <p className="body-sm text-muted-foreground">Ingresá a tu cuenta y elegí Publicar. Completá el título, la descripción, el rubro, el precio y la ubicación. Podés agregar fotos y, para publicar un anuncio activo, tenés que dejar un teléfono o correo de contacto.</p>
        <Link className="text-primary underline" href="/productos/nuevo">Publicar un anuncio</Link>
      </section>
      <section className="panel">
        <h2 className="h3">¿Cómo encuentro lo que busco?</h2>
        <p className="body-sm text-muted-foreground">Usá el buscador o las categorías de la barra. Inmuebles y Vehículos abren sus listados al hacer clic. Para elegir una subcategoría, pasá el mouse por encima o tocá la flecha en el celular. En Artículos encontrás las demás categorías.</p>
        <Link className="text-primary underline" href="/">Explorar anuncios</Link>
      </section>
      <section className="panel">
        <h2 className="h3">¿Cómo edito mis publicaciones?</h2>
        <p className="body-sm text-muted-foreground">Desde Mis anuncios podés editar tus publicaciones y cambiar su estado. Los anuncios activos vencen a los 60 días y podés renovarlos desde tu cuenta.</p>
        <Link className="text-primary underline" href="/mis-productos">Ir a Mis anuncios</Link>
      </section>
      <section className="panel">
        <h2 className="h3">¿Cómo contacto a quien publica?</h2>
        <p className="body-sm text-muted-foreground">Abrí el anuncio o servicio y usá los datos de contacto disponibles. La Higuera conecta personas: no procesa compras, pagos ni envíos.</p>
        <Link className="text-primary underline" href="/servicios">Explorar servicios</Link>
      </section>
    </div>
  </div>;
}
