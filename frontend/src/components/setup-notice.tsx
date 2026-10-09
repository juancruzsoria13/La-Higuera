import { BrandMark } from "./brand";

export function SetupNotice() {
  return (
    <div className="rounded-2xl border bg-card px-6 py-10 text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-primary"><BrandMark className="size-10" /></span>
      <h2 className="h3">Estamos preparando La Higuera</h2>
      <p className="body-sm mx-auto mt-3 max-w-lg text-muted-foreground">La conexión con Supabase todavía no está configurada. Los anuncios y las cuentas estarán disponibles cuando se complete la configuración del proyecto.</p>
      <p className="caption mt-3 text-muted-foreground">No hay datos de demostración.</p>
    </div>
  );
}
