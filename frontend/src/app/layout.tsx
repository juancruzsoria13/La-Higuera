import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { LogOut, MapPin, Package, Wrench, Plus, UserRound } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { logout } from "@/modules/users/actions";
import { Brand } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import { HeaderSearch, HeaderSearchFallback, HeaderTabs, HeaderTabsFallback } from "@/components/search-navigation";
import { buttonVariants } from "@/components/ui/button";
import { getCatalog } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "La Higuera · Anuncios en San Juan", template: "%s · La Higuera" },
  description: "Encontrá y publicá productos en San Juan, Argentina. Un lugar para conectar con lo que tenés cerca.",
};
export const dynamic = "force-dynamic";

// Única familia de la marca (variable: cubre los pesos 400 a 800 de la escala). globals.css la usa como --font-sans.
const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, {categories}] = await Promise.all([currentUser(), getCatalog()]);
  return (
    <html lang="es-AR" className={figtree.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Saltar al contenido</a>
        <header className="site-header">
          <div className="hdr-bar">
            <div className="shell hdr-row">
              <Link href="/" className="hdr-logo" aria-label="La Higuera, inicio"><Brand inverted /></Link>
              <Suspense fallback={<HeaderSearchFallback />}><HeaderSearch categories={categories} /></Suspense>
              <nav aria-label="Tu cuenta" className="hdr-actions">
                {user ? (
                  <AccountMenu>
                    <Link href="/mis-productos" className="account-link"><Package className="size-4" />Mis anuncios</Link>
                    <Link href="/mis-servicios" className="account-link"><Wrench className="size-4" />Mis servicios</Link>
                    <Link href="/mi-perfil" className="account-link"><UserRound className="size-4" />Mi perfil</Link>
                    <form action={logout}><button type="submit" className="account-link w-full"><LogOut className="size-4" />Salir</button></form>
                  </AccountMenu>
                ) : <Link className="hdr-account" href="/ingresar"><UserRound className="size-5" /><span className="hdr-account-text">Ingresar</span><span className="sr-only sm:hidden">Ingresar</span></Link>}
                <Link href="/productos/nuevo" className={buttonVariants({ variant: "onDark", className: "hdr-publish" })}><Plus className="size-4" />Publicar</Link>
              </nav>
            </div>
          </div>
          <div className="hdr-sub relative">
            <div className="shell hdr-sub-in">
              <Suspense fallback={<HeaderTabsFallback />}><HeaderTabs categories={categories} /></Suspense>
              <span className="hdr-loc"><MapPin className="size-3.5" />San Juan, Argentina</span>
            </div>
          </div>
        </header>
        <main id="contenido" className="flex-1">{children}</main>
        <footer className="mt-16 border-t bg-card">
          <div className="shell flex flex-wrap items-center justify-between gap-5 py-8">
            <div className="flex items-center gap-4"><Brand compact /><div className="flex flex-col gap-0.5"><p className="label">La Higuera</p><p className="caption text-muted-foreground">Hecho para encontrarnos en San Juan.</p></div></div>
            <p className="caption max-w-xs text-muted-foreground">Conectamos personas. No procesamos compras ni pagos.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
