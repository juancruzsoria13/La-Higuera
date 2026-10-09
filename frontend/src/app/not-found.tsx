import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Fig } from "@/components/fig";
export default function NotFound() {return <div className="shell flex flex-col items-center gap-3 py-14 text-center"><Fig variant={3} className="size-40" /><h1 className="h1 mt-2">Este anuncio no está disponible</h1><p className="lead text-muted-foreground">Puede haberse eliminado o no estar publicado.</p><Link href="/" className={buttonVariants({className: "mt-3"})}>Volver a explorar</Link></div>;}
