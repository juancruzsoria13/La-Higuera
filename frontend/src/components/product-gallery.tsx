"use client";
import { useState } from "react";
import { ProductImage } from "./product-image";
export function ProductGallery({images, title, category}: {images: string[]; title: string; category: string}) {
  const [active, setActive] = useState(0);
  const path = images[active] ?? null;
  return <div><ProductImage key={path} path={path} title={title} category={category} className="rounded-2xl border" />
    {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">{images.map((image, index) => <button key={image} type="button" onClick={() => setActive(index)} aria-label={`Ver foto ${index + 1} de ${images.length}`} aria-pressed={index === active} className={`overflow-hidden rounded-lg border-2 bg-muted ${index === active ? "border-primary" : "border-transparent hover:border-primary/40"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada, fuera del cache compartido de Next */}
      <img src={`/api/images/${image}`} alt="" loading="lazy" className="aspect-square w-full object-cover" />
    </button>)}</div>}
  </div>;
}
