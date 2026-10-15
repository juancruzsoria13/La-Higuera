import { attributeDefinitions, getSubcategory, validMapsUrl } from "./attributes";

export function AttributeDetails({category, subcategory, values}: {
  category: string; subcategory?: string | null; values?: Record<string, string>;
}) {
  const selected = getSubcategory(category, subcategory);
  const keys = selected?.attributes.filter(key => values?.[key]) ?? [];
  if (!keys.length) return null;
  return <section className="panel" aria-labelledby="caracteristicas">
    <h2 id="caracteristicas" className="h3">Características</h2>
    <dl className="grid gap-4 sm:grid-cols-2">{keys.map(key => {
      const field = attributeDefinitions[key];
      const value = values![key];
      if (field.type === "url" && !validMapsUrl(value)) return null;
      const label = field.options?.find(option => option.id === value)?.name ?? (field.type === "number" ? new Intl.NumberFormat("es-AR").format(Number(value)) : value);
      return <div key={key} className="min-w-0"><dt className="caption text-muted-foreground">{field.label}</dt>
        <dd className="body-sm break-words">{field.type === "url" ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline">Ver en Google Maps</a> : label}</dd></div>;
    })}</dl>
  </section>;
}
