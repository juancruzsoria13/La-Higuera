"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({reset}: {error: Error & {digest?: string}; reset: () => void}) {return <div className="shell py-20 text-center"><h1 className="text-2xl font-semibold">No pudimos cargar esta página</h1><p className="my-5 text-muted-foreground">Revisá tu conexión e intentá nuevamente.</p><Button onClick={reset}>Reintentar</Button></div>;}
