"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { MAX_IMAGE_BYTES, MAX_IMAGES } from "./schema";
/** Foto del formulario: `path` si ya está guardada, `file` si se agrega ahora. */
export type ImageItem = {key: string; url: string; path?: string; file?: File};
const TYPES = ["image/jpeg", "image/png", "image/webp"];
export const savedImages = (paths: string[]): ImageItem[] => paths.map(path => ({key: path, path, url: `/api/images/${path}`}));

export function ImagePicker({items, onChange, title}: {items: ImageItem[]; onChange: (items: ImageItem[]) => void; title: string}) {
  const [error, setError] = useState("");
  const counter = useRef(0);
  const latest = useRef(items);
  useEffect(() => { latest.current = items; });
  useEffect(() => () => latest.current.forEach(item => { if (item.file) URL.revokeObjectURL(item.url); }), []);
  // Orden final para la API: la ruta de cada foto guardada o `new:<i>` para el i-ésimo archivo nuevo.
  const tokens = items.map((item, index) => item.path ?? `new:${items.slice(0, index).filter(other => !other.path).length}`);
  function add(list: FileList | null) {
    const files = Array.from(list ?? []);
    const valid = files.filter(file => TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES);
    const room = MAX_IMAGES - items.length;
    setError(valid.length < files.length ? "Alguna foto no es JPG, PNG o WebP, o supera los 5 MB: no la agregamos." : valid.length > room ? `Podés subir hasta ${MAX_IMAGES} fotos por anuncio.` : "");
    onChange([...items, ...valid.slice(0, Math.max(0, room)).map(file => ({key: `new-${counter.current++}`, file, url: URL.createObjectURL(file)}))]);
  }
  function move(index: number, delta: number) {
    const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next);
  }
  function remove(index: number) {
    if (items[index].file) URL.revokeObjectURL(items[index].url);
    setError(""); onChange(items.filter((_, i) => i !== index));
  }
  const control = "flex size-8 items-center justify-center rounded-full bg-card/95 text-foreground shadow hover:bg-white disabled:opacity-40";
  return <div className="space-y-4">
    {tokens.map(token => <input key={token} type="hidden" name="image_order" value={token} />)}
    {items.length > 0 && <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map((item, index) => <li key={item.key} className="relative overflow-hidden rounded-xl border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o imagen privada, fuera del cache de Next */}
      <img src={item.url} alt={`${title || "Anuncio"}, foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
      {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">Portada</span>}
      <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
        <span className="flex gap-1"><button type="button" className={control} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover la foto ${index + 1} antes`}><ArrowLeft className="size-4" /></button><button type="button" className={control} onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Mover la foto ${index + 1} después`}><ArrowRight className="size-4" /></button></span>
        <button type="button" className={`${control} text-destructive`} onClick={() => remove(index)} aria-label={`Quitar la foto ${index + 1}`}><X className="size-4" /></button>
      </div>
    </li>)}</ol>}
    {error && <p role="alert" className="notice notice-error">{error}</p>}
    {items.length < MAX_IMAGES && <div className="rounded-xl border border-dashed border-primary/30 bg-muted/40 p-6"><ImagePlus className="mb-3 size-6 text-primary" /><label className="field-label" htmlFor="image-files">Agregar fotos</label><input className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary" id="image-files" type="file" multiple accept={TYPES.join(",")} onChange={event => { add(event.target.files); event.target.value = ""; }} /><p className="mt-2 text-xs leading-5 text-muted-foreground">Hasta {MAX_IMAGES} fotos · JPG, PNG o WebP · Hasta 5 MB y 20 megapíxeles cada una · Sin animación. La primera es la portada.</p></div>}
  </div>;
}
