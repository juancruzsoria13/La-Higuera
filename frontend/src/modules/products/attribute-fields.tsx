import { Field } from "@/components/forms";
import { attributeDefinitions, getSubcategory } from "./attributes";

export function AttributeFields({category, subcategory, values, onChange}: {
  category: string; subcategory: string; values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  const selected = getSubcategory(category, subcategory);
  if (!selected) return null;
  return <section className="form-panel" aria-labelledby="p-caracteristicas">
    <div><h2 id="p-caracteristicas" className="panel-title">Características</h2>
      <p className="body-sm text-muted-foreground">Opcionales. Completá los datos que conozcas.</p></div>
    <div className="grid gap-5 sm:grid-cols-2">
      {selected.attributes.map(key => {
        const field = attributeDefinitions[key];
        const bind = {id: `attribute-${key}`, value: values[key] ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({...values, [key]: event.target.value})};
        return <Field key={key} label={field.label} htmlFor={bind.id} hint={key === "maps_url" ? "Pegá el enlace de Compartir de Google Maps." : key === "age" ? "Ingresá 0 si es a estrenar." : undefined}>
          {field.type === "select" ? <select className="input" {...bind}>
            <option value="">Sin especificar</option>
            {field.options?.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select> : <input className="input" {...bind} type={field.type === "number" ? "text" : field.type}
            inputMode={field.type === "number" ? field.step === "0.01" ? "decimal" : "numeric" : undefined}
            maxLength={field.maxLength ?? 15} placeholder={key === "maps_url" ? "https://maps.app.goo.gl/…" : undefined} />}
        </Field>;
      })}
    </div>
  </section>;
}
