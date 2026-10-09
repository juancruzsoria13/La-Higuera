"use client";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Fig } from "@/components/fig";
export default function ErrorPage({reset}: {error: Error & {digest?: string}; reset: () => void}) {return <div className="shell flex flex-col items-center gap-3 py-14 text-center" role="alert"><Fig variant={8} className="size-[180px]" /><h1 className="h1 mt-2">No pudimos cargar esta página</h1><p className="lead text-muted-foreground">Revisá tu conexión e intentá nuevamente.</p><div className="mt-3 flex flex-wrap justify-center gap-3"><Button onClick={reset}><RotateCw className="size-4" />Reintentar</Button><Link href="/" className={buttonVariants({variant: "outline"})}>Volver al inicio</Link></div></div>;}
