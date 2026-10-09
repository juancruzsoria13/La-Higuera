import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { LogOut, MapPin, Package, Wrench, Plus, UserRound } from "lucide-react";
import { currentUser } from "@/modules/users/session";
import { logout } from "@/modules/users/actions";
import { Brand } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import { SearchNavigation, SearchNavigationFallback } from "@/components/search-navigation";
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
          <div className="shell header-grid">
            <Link href="/" className="header-logo w-fit" aria-label="La Higuera, inicio"><Brand inverted /></Link>
            <Suspense fallback={<SearchNavigationFallback />}><SearchNavigation categories={categories} /></Suspense>
            <nav aria-label="Navegación principal" className="header-actions">
              {user ? (
                <AccountMenu>
                    <Link href="/mis-productos" className="account-link"><Package className="size-4" />Mis anuncios</Link>
                    <Link href="/mis-servicios" className="account-link"><Wrench className="size-4" />Mis servicios</Link>
                    <Link href="/mi-perfil" className="account-link"><UserRound className="size-4" />Mi perfil</Link>
                    <form action={logout}><button type="submit" className="account-link w-full"><LogOut className="size-4" />Salir</button></form>
                </AccountMenu>
              ) : <Link className="flex min-h-11 items-center gap-2 text-sm font-medium hover:text-sky-200" href="/ingresar"><UserRound className="size-4" /><span className="hidden sm:inline">Ingresar</span><span className="sr-only sm:hidden">Ingresar</span></Link>}
              <Link href="/productos/nuevo" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-primary transition hover:bg-sky-100 sm:min-h-11 sm:px-4"><Plus className="size-4" />Publicar</Link>
            </nav>
            <div className="header-location"><MapPin className="size-4 shrink-0 text-sky-200" /><span>San Juan, Argentina</span></div>
          </div>
        </header>
        <main id="contenido" className="flex-1">{children}</main>
        <footer className="mt-16 border-t bg-white">
          <div className="shell flex flex-col justify-between gap-5 py-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4"><Brand compact /><div><p className="text-sm font-semibold">La Higuera</p><p className="mt-1 text-xs text-muted-foreground">Hecho para encontrarnos en San Juan.</p></div></div>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">Conectamos personas.<br />No procesamos compras ni pagos.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
