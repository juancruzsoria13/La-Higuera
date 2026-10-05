"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
export function ProductImage({path, title, className}: {path: string | null; title: string; className?: string}) {
  const [failed, setFailed] = useState(false);
  return <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted", className)}>{path && !failed ?
    // Private images deliberately bypass the shared Next Image optimization cache.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/images/${path}`} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={() => setFailed(true)} />
    : <div className="flex flex-col items-center gap-3 text-muted-foreground"><ImageIcon className="size-10 stroke-1" /><span className="text-xs">Sin imagen</span></div>}</div>;
}
