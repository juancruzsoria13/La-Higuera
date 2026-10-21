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

## Dependencias

Prioridad: que funcione y que tenga soporte. No hace falta estar en la última versión.

- Usar librerías y versiones estables, probadas y con soporte vigente. Evitar los releases recién salidos.
- Al actualizar (por ejemplo, por un aviso de `pip-audit` o `npm audit`), subir lo mínimo que resuelve el problema, dentro de una línea que siga recibiendo arreglos. Un salto de versión mayor sólo si el arreglo lo exige, y avisando antes.
- Antes de proponer una actualización, revisar si el aviso aplica al uso real que hace el proyecto.
- Toda actualización se valida con los tests del backend, `tsc`, ESLint (`npm run lint`) y el build del frontend, y con la app corriendo.

## Cómo trabajar

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

@frontend/AGENTS.md
