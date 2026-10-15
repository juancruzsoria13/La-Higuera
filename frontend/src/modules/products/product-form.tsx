"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { REAL_ESTATE, statuses, type Product } from "./schema";
import { saveProduct } from "./actions";
import { ImagePicker, savedImages, type ImageItem } from "./image-picker";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { subcategories, compatibleAttributes } from "./attributes";
import { AttributeFields } from "./attribute-fields";
import { getSubcategory } from "./attributes";
import type { Catalog } from "@/lib/catalog";
export function ProductForm({product, catalog, locality = "capital"}: {product?: Product; catalog: Pick<Catalog, "categories" | "localities">; locality?: string}) {
  const [state, action] = useActionState(saveProduct.bind(null, product?.id ?? null), {});
  const [step, setStep] = useState<1 | 2>(1);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultCategory = catalog.categories.some(c => c.id === "otros") ? "otros" : catalog.categories[0]?.id ?? "";
  const [values, setValues] = useState({title: product?.title ?? "", description: product?.description ?? "", price: product?.price.toString() ?? "", currency: product?.currency ?? "ARS", category_id: product?.category_id ?? defaultCategory, subcategory_id: product?.subcategory_id ?? "", condition: product?.condition ?? "usado", locality_id: product?.locality_id ?? locality, operation: product?.operation ?? "", contact_phone: product?.contact_phone ?? "", contact_email: product?.contact_email ?? "", status: product?.status ?? "activo"});
  const [attributes, setAttributes] = useState<Record<string, string>>(product?.attributes ?? {});
  const [images, setImages] = useState<ImageItem[]>(() => savedImages(product?.images ?? []));
  const options = subcategories.filter(item => item.category_id === values.category_id);
  const selectedCategory = catalog.categories.find(item => item.id === values.category_id)?.name ?? "";
  const selectedSubcategory = getSubcategory(values.category_id, values.subcategory_id)?.name;
  const selectedLocality = catalog.localities.find(item => item.id === values.locality_id)?.name ?? "";
  const ready = catalog.categories.length > 0 && catalog.localities.length > 0;
  // Un error del servidor corresponde a los datos enviados, no a los que la persona editó después.
  const messageMatchesForm = !state.values || Object.entries({...values, attributes: JSON.stringify(attributes)}).every(([name, value]) => state.values?.[name] === value);
  const bind = (key: keyof typeof values) => ({name: key, id: key, value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    if (key === "category_id") { setValues({...values, category_id: value, subcategory_id: "", operation: ""}); setAttributes({}); }
    else if (key === "subcategory_id") { setValues({...values, subcategory_id: value}); setAttributes(compatibleAttributes(values.category_id, value, attributes)); }
    else setValues({...values, [key]: value});
  }});
  function goTo(next: 1 | 2) {
    setStep(next);
    formRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
  }
  function next() {
    if (formRef.current?.reportValidity()) goTo(2);
  }
  // Los archivos nuevos viven en el estado y se agregan al enviar, conservando el orden elegido.
  const submit = (form: FormData) => {
    if (step === 1) { next(); return; }
    form.delete("images");
    for (const item of images) if (item.file) form.append("images", item.file);
    action(form);
  };

  return <form ref={formRef} action={submit} className="flex flex-col gap-5 scroll-mt-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 sm:px-7">
      <div><p className="eyebrow">Paso {step} de 2</p><h2 className="panel-title">{step === 1 ? "Datos del anuncio" : "Fotos y publicación"}</h2></div>
      <ol aria-label="Progreso de la publicación" className="flex items-center gap-2 text-sm font-semibold">
        <li aria-current={step === 1 ? "step" : undefined} className={`flex items-center gap-2 rounded-full px-3 py-2 ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}>{step === 2 ? <Check className="size-4" aria-hidden="true" /> : "1"}<span className="hidden sm:inline">Datos</span></li>
        <li className="h-px w-6 bg-border-strong" aria-hidden="true" />
        <li aria-current={step === 2 ? "step" : undefined} className={`flex items-center gap-2 rounded-full px-3 py-2 ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><ImagePlus className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Fotos y contacto</span></li>
      </ol>
    </div>
    <FormMessage state={messageMatchesForm ? state : {}} />
    {!ready && <p role="alert" className="notice notice-error">No pudimos cargar los rubros y las localidades. Recargá la página para intentar de nuevo.</p>}
    <input type="hidden" name="attributes" value={JSON.stringify(attributes)} />
    <input type="hidden" name="version" value={product?.updated_at ?? ""} />

    <div hidden={step !== 1} className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="form-panel" aria-labelledby="p-que">
          <h2 id="p-que" className="panel-title">¿Qué vas a publicar?</h2>
          <Field label="Título del anuncio" htmlFor="title"><input className="input" {...bind("title")} placeholder="Ej.: Bicicleta urbana rodado 28" minLength={3} maxLength={120} required={step === 1} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rubro" htmlFor="category_id"><select className="input" {...bind("category_id")}>{catalog.categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Estado del producto" htmlFor="condition"><select className="input" {...bind("condition")}><option value="usado">Usado</option><option value="nuevo">Nuevo</option></select></Field>
          </div>
          {options.length > 0 && <Field label="Subcategoría" htmlFor="subcategory_id"><select className="input" {...bind("subcategory_id")} required={step === 1}><option value="">Elegí una subcategoría</option>{options.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>}
          <Field label="Descripción" htmlFor="description" hint="Contá lo más importante en pocas palabras; podés sumar detalles si hacen falta."><textarea className="input min-h-28 resize-y" {...bind("description")} placeholder="¿Qué debería saber la persona interesada?" minLength={10} maxLength={5000} required={step === 1} /></Field>
        </section>
        <section className="form-panel" aria-labelledby="p-precio">
          <h2 id="p-precio" className="panel-title">Precio y ubicación</h2>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_130px]"><Field label="Precio" htmlFor="price" hint="Sin separadores de miles."><input className="input" {...bind("price")} inputMode="decimal" placeholder="0,00" maxLength={15} required={step === 1} /></Field><Field label="Moneda" htmlFor="currency"><select className="input" {...bind("currency")}><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></Field></div>
          {values.category_id === REAL_ESTATE && <Field label="Operación" htmlFor="operation"><select className="input" {...bind("operation")} required={step === 1}><option value="">Elegí una opción</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></Field>}
          <Field label={values.category_id === REAL_ESTATE ? "Departamento / localidad" : "Localidad"} htmlFor="locality_id"><select className="input" {...bind("locality_id")}>{catalog.localities.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <p className="body-sm text-muted-foreground">El precio y la ubicación se muestran en el anuncio para ayudar a encontrarlo.</p>
        </section>
      </div>
      <div className="[&_.form-panel]:gap-4 [&_.form-panel]:sm:p-6 [&_.form-panel>div:last-child]:lg:grid-cols-3">
        <AttributeFields category={values.category_id} subcategory={values.subcategory_id} values={attributes} onChange={setAttributes} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3"><Link href={product ? `/productos/${product.id}` : "/mis-productos"} className={buttonVariants({variant: "ghost", className: "text-muted-foreground"})}>Cancelar</Link><Button type="button" disabled={!ready} onClick={next}>Siguiente <ArrowRight className="size-4" /></Button></div>
    </div>

    <div hidden={step !== 2} className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <section className="form-panel" aria-labelledby="p-fotos"><div><h2 id="p-fotos" className="panel-title">Fotos</h2><p className="body-sm text-muted-foreground">Opcionales. La primera será la portada.</p></div><ImagePicker items={images} onChange={setImages} title={values.title} /></section>
        <div className="space-y-5">
          <section className="form-panel" aria-labelledby="p-contacto"><div><h2 id="p-contacto" className="panel-title">Contacto</h2><p className="body-sm text-muted-foreground">Para publicar activo, completá al menos un dato.</p></div><Field label="Teléfono / WhatsApp" htmlFor="contact_phone" hint="Con código de área, sin 0 ni 15."><input className="input" {...bind("contact_phone")} inputMode="tel" autoComplete="tel" maxLength={20} /></Field><Field label="Correo de contacto" htmlFor="contact_email"><input className="input" {...bind("contact_email")} type="email" autoComplete="email" maxLength={254} /></Field></section>
          <section className="form-panel" aria-labelledby="p-resumen"><h2 id="p-resumen" className="panel-title">Antes de publicar</h2><p className="body-sm font-semibold">{values.title || "Tu anuncio"}</p><p className="body-sm text-muted-foreground">{[selectedSubcategory || selectedCategory, selectedLocality].filter(Boolean).join(" · ")}</p><Field label="Estado del anuncio" htmlFor="status"><select className="input" {...bind("status")}>{statuses.map(status => <option value={status} key={status}>{status === "activo" ? "Activo · visible para todos" : status === "pausado" ? "Pausado · solo lo ves vos" : "Vendido · solo lo ves vos"}</option>)}</select></Field><p className="caption text-muted-foreground">Los anuncios activos vencen a los 60 días y se pueden renovar.</p></section>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => goTo(1)}><ArrowLeft className="size-4" />Volver</Button><div className="flex flex-wrap items-center gap-3"><Link href={product ? `/productos/${product.id}` : "/mis-productos"} className={buttonVariants({variant: "ghost", className: "text-muted-foreground"})}>Cancelar</Link><SubmitButton disabled={!ready}>{product ? "Guardar cambios" : "Publicar anuncio"}</SubmitButton></div></div>
      <p className="caption font-normal text-muted-foreground">La Higuera es un sitio de anuncios. No procesa compras ni pagos.</p>
    </div>
  </form>;
}
