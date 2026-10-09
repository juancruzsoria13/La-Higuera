"use client";
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { MAX_IMAGE_BYTES } from "@/modules/products/schema";
import { TYPES, type ImageItem } from "@/modules/products/image-picker";
/** Foto de perfil opcional. Envía `avatar`: la ruta guardada, "new" (con el archivo aparte) o vacío. */
export function AvatarPicker({value, onChange}: {value: ImageItem | null; onChange: (value: ImageItem | null) => void}) {
  const [error, setError] = useState("");
  const latest = useRef(value);
  useEffect(() => { latest.current = value; });
  useEffect(() => () => { if (latest.current?.file) URL.revokeObjectURL(latest.current.url); }, []);
  function replace(next: ImageItem | null) {
    if (value?.file) URL.revokeObjectURL(value.url);
    onChange(next);
  }
  function pick(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) { setError("La foto tiene que ser JPG, PNG o WebP, de hasta 5 MB."); return; }
    setError(""); replace({key: "avatar-new", file, url: URL.createObjectURL(file)});
  }
  return <div className="flex flex-col gap-3">
    <input type="hidden" name="avatar" value={value?.path ?? (value?.file ? "new" : "")} />
    <div className="flex flex-wrap items-center gap-5">
      <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-primary">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o imagen privada, fuera del cache de Next */}
        {value ? <img src={value.url} alt="Tu foto de perfil" className="size-full object-cover" /> : <UserRound className="size-10" aria-hidden="true" />}
      </span>
      <div className="flex flex-col items-start gap-2">
        <label className="field-label" htmlFor="avatar-file">{value ? "Cambiar foto" : "Elegir foto"}</label>
        <input className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-semibold file:text-primary" id="avatar-file" type="file" accept={TYPES.join(",")} onChange={event => { pick(event.target.files?.[0]); event.target.value = ""; }} />
        {value && <button type="button" className="label text-destructive hover:underline" onClick={() => { setError(""); replace(null); }}>Quitar foto</button>}
      </div>
    </div>
    {error && <p role="alert" className="notice notice-error">{error}</p>}
  </div>;
}
