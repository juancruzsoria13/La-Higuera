"use client";
import { useState } from "react";
import { Fig, categoryFig } from "./fig";
import { cn } from "@/lib/utils";
export function ProductImage({path, title, className, category}: {path: string | null; title: string; className?: string; category?: string}) {
  const [failed, setFailed] = useState(false);
  return <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted", className)}>{path && !failed ?
    // Private images deliberately bypass the shared Next Image optimization cache.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/images/${path}`} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={() => setFailed(true)} />
    : <div className="flex w-full flex-col items-center gap-2 text-muted-foreground"><Fig variant={categoryFig[category ?? ""] ?? 6} className="size-[38%] max-w-40" /><span className="text-xs">Sin foto</span></div>}</div>;
}
