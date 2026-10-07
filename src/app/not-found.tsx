import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Fig } from "@/components/fig";
export default function NotFound() {return <div className="shell py-20 text-center"><Fig variant={3} className="mx-auto mb-4 size-40" /><h1 className="text-3xl font-semibold">Este anuncio no está disponible</h1><p className="my-5 text-muted-foreground">Puede haberse eliminado o no estar publicado.</p><Link href="/" className={buttonVariants()}>Volver a explorar</Link></div>;}
