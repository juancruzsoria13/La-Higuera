"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { serviceStatuses, type ServiceProvider } from "./schema";
import { saveService } from "./actions";
import { AvatarPicker } from "./avatar-picker";
import { ImagePicker, savedImages, type ImageItem } from "@/modules/products/image-picker";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import type { Catalog } from "@/lib/catalog";
export function ServiceForm({service, catalog, locality = "capital", name = ""}: {service?: ServiceProvider; catalog: Pick<Catalog, "trades" | "localities">; locality?: string; name?: string}) {
  const [state, action] = useActionState(saveService.bind(null, service?.id ?? null), {});
  const [values, setValues] = useState({name: service?.name ?? name, trade_id: service?.trade_id ?? catalog.trades[0]?.id ?? "", license_number: service?.license_number ?? "", license_body: service?.license_body ?? "", description: service?.description ?? "", phone: service?.phone ?? "", locality_id: service?.locality_id ?? locality, contact_email: service?.contact_email ?? "", status: service?.status ?? "activo"});
  const bind = (key: keyof typeof values) => ({name: key, id: key, value: values[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues({...values, [key]: e.target.value})});
  const [avatar, setAvatar] = useState<ImageItem | null>(() => service?.avatar ? savedImages([service.avatar])[0] : null);
  const [works, setWorks] = useState<ImageItem[]>(() => savedImages(service?.work_images ?? []));
  // Los archivos nuevos viven en el estado (se pueden quitar y reordenar) y se agregan al enviar.
  const submit = (form: FormData) => {
    form.delete("images"); form.delete("avatar_file");
    for (const item of works) if (item.file) form.append("images", item.file);
    if (avatar?.file) form.append("avatar_file", avatar.file);
    action(form);
  };
  const licensed = catalog.trades.find(t => t.id === values.trade_id)?.requires_license ?? false;
  const ready = catalog.trades.length > 0 && catalog.localities.length > 0;
  return <form action={submit} className="flex flex-col gap-6"><FormMessage state={state} />{!ready && <p role="alert" className="notice notice-error">No pudimos cargar los oficios y las localidades. Recargá la página para intentar de nuevo.</p>}<input type="hidden" name="version" value={service?.updated_at ?? ""} />
    <section className="form-panel" aria-labelledby="s-oficio"><h2 id="s-oficio" className="panel-title">Tu oficio</h2><Field label="Nombre o razón social" htmlFor="name"><input className="input" {...bind("name")} placeholder="Ej.: Juan Pérez · Gas y plomería" minLength={2} maxLength={100} required /></Field><Field label="Oficio" htmlFor="trade_id"><select className="input" {...bind("trade_id")}>{catalog.trades.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></Field><Field label="Descripción de tus servicios" htmlFor="description" hint="Trabajos que realizás, zonas, horarios y si atendés urgencias."><textarea className="input min-h-32 resize-y" {...bind("description")} placeholder="Ej.: Instalaciones y reparaciones de gas domiciliario, habilitaciones…" minLength={10} maxLength={3000} required /></Field></section>
    {licensed && <section className="form-panel" aria-labelledby="s-matricula"><div className="flex flex-col gap-1.5"><h2 id="s-matricula" className="panel-title">Matrícula</h2><p className="body-sm text-muted-foreground">Este oficio exige matrícula. Se muestra como declarada; la insignia “Matrícula verificada” la otorga La Higuera después de comprobarla, y se retira si cambiás el número, la entidad o el oficio.</p></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Número de matrícula" htmlFor="license_number"><input className="input" {...bind("license_number")} minLength={2} maxLength={40} required /></Field><Field label="Entidad que la emitió" htmlFor="license_body" hint="Ej.: ENARGAS, Colegio de Técnicos, ente municipal."><input className="input" {...bind("license_body")} minLength={2} maxLength={100} required /></Field></div></section>}
    <section className="form-panel" aria-labelledby="s-contacto"><h2 id="s-contacto" className="panel-title">Contacto y zona</h2><div className="grid gap-5 sm:grid-cols-2"><Field label="Teléfono / WhatsApp" htmlFor="phone" hint="Con código de área, sin 0 ni 15. Ej.: 2644123456. Es público."><input className="input" {...bind("phone")} inputMode="tel" maxLength={20} required /></Field><Field label="Correo de contacto (opcional)" htmlFor="contact_email" hint="Es público."><input className="input" {...bind("contact_email")} type="email" autoComplete="email" maxLength={254} /></Field></div><Field label="Localidad" htmlFor="locality_id"><select className="input" {...bind("locality_id")}>{catalog.localities.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></Field></section>
    <section className="form-panel" aria-labelledby="s-fotos"><div className="flex flex-col gap-1.5"><h2 id="s-fotos" className="panel-title">Fotos</h2><p className="body-sm text-muted-foreground">Opcionales. Una foto tuya ayuda a que te reconozcan; las de trabajos realizados muestran lo que hacés.</p></div><div className="flex flex-col gap-3"><h3 className="label">Tu foto</h3><AvatarPicker value={avatar} onChange={setAvatar} /></div><div className="flex flex-col gap-3"><h3 className="label">Trabajos realizados</h3><ImagePicker items={works} onChange={setWorks} title={values.name ? `Trabajo de ${values.name}` : "Trabajo realizado"} cover={false} noun="servicio" /></div></section>
    <section className="form-panel"><Field label="Estado del perfil" htmlFor="status" hint="Solo los perfiles activos son visibles para otras personas."><select className="input" {...bind("status")}>{serviceStatuses.map(s => <option value={s} key={s}>{s === "activo" ? "Activo · visible para todos" : "Pausado · solo lo ves vos"}</option>)}</select></Field></section>
    <div className="flex flex-wrap items-center gap-5"><SubmitButton disabled={!ready}>{service ? "Guardar cambios" : "Publicar servicio"}</SubmitButton><Link href="/mis-servicios" className={buttonVariants({variant: "ghost", className: "text-muted-foreground"})}>Cancelar</Link></div><p className="caption font-normal text-muted-foreground">La Higuera conecta personas. No procesa pagos ni garantiza los trabajos.</p>
  </form>;
}
