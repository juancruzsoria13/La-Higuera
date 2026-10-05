import { BrandMark } from "./brand";

export function SetupNotice() {
  return (
    <div className="rounded-2xl border bg-white px-6 py-10 text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary"><BrandMark className="size-10" /></span>
      <h2 className="text-xl font-semibold tracking-tight">Estamos preparando La Higuera</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">La conexión con Supabase todavía no está configurada. Los anuncios y las cuentas estarán disponibles cuando se complete la configuración del proyecto.</p>
      <p className="mt-3 text-xs text-muted-foreground">No hay datos de demostración.</p>
    </div>
  );
}
