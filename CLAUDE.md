# La Higuera — monorepo

- `frontend/`: Next.js 16 (ver `frontend/AGENTS.md` antes de tocar código de Next).
- `backend/`: API FastAPI en Python; venv en `backend/.venv`.
- `database/`: migraciones SQL de Supabase (aplicar en orden).
- `docs/`: arquitectura y verificación.

Comandos frecuentes en el `Makefile` de la raíz (`make check`).

## Diseño: siempre orientado a la venta

Todo lo que sea diseño (pantallas, banners, componentes, textos de interfaz) se decide pensando en que el usuario encuentre, contacte o publique. La historia de la marca va en segundo plano.

- **Referencia: Mercado Libre.** Ante la duda sobre layout, jerarquía o patrones (banners, cards, filtros, precios), mirar cómo lo resuelve Mercado Libre y adaptarlo a nuestra marca.
- **Producto primero.** Cada pieza muestra qué se ofrece (producto, inmueble, servicio) con imagen real o de muestra, no ilustraciones abstractas ni frases de marca.
- **Promos con atención extra.** Gratis, sin comisión, apto crédito, matriculado, descuentos: van en un badge de alto contraste (`--promo`), arriba del titular y nunca escondidos en el cuerpo del texto. Solo prometer lo que la plataforma cumple.
- **Un CTA claro por pieza.** Verbo + destino concreto ("Ver electricistas", "Publicar gratis"), que lleve al listado ya filtrado. En banners, toda la pieza es clickeable.
- **Textos cortos y directos.** Titular de beneficio en una o dos líneas; voseo rioplatense.
- **Sin perder accesibilidad.** Contraste AA, foco visible, objetivos táctiles de 44px y respeto a `prefers-reduced-motion`.

@frontend/AGENTS.md
