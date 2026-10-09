# Rediseño de La Higuera: handoff para implementar

Este paquete trae el rediseño hecho en Claude Design para pasarlo al frontend (`frontend/`, Next.js 16). Antes de tocar código de Next, leé `frontend/AGENTS.md`.

- Canvas de diseño (fuente de verdad visual): https://claude.ai/artifact/XCsyFtXVBKF1W6HEJbndkN
- Design system: https://claude.ai/artifact/KLedRX2yXTXvzxabdPCr88

## Qué hay en esta carpeta

| Ruta | Qué es |
|---|---|
| `design-system/brand-book.md` | Reglas de voz, escala tipográfica, color, espacio e íconos, con la tabla de reemplazos de Tailwind |
| `design-system/tokens.json` | Colores, tipografía, espacios, radios y sombras, con su uso |
| `design-system/componentes.css` | CSS de referencia de los componentes base (botón, campo, pill, tarjeta, header) |
| `design-system/*.svg` | Logo (símbolo azul y blanco), favicon y la exploración del símbolo "h con hoja" |
| `pantallas/*.dc.html` | Cada pantalla del canvas, con su markup, textos y layout |
| `pantallas/lh-pages.css` | Layout de páginas: grillas, breakpoints, header de dos niveles, mapa, reseñas, denuncias |

### Cómo leer los `.dc.html`

Son maquetas del canvas, no código para copiar. Se traducen así:
- `<dc-import name="Header">` es un componente compartido: va en `layout.tsx` o en `components/`.
- `<sc-for list="{{...}}">` es un `.map()` sobre datos reales; los datos de `renderVals()` son de ejemplo.
- `<sc-if value="{{...}}">` es un render condicional.
- Las clases `lh-*` vienen de `componentes.css` y las de layout de `lh-pages.css`. En el código van como utilidades de Tailwind o en `@layer components` de `globals.css`.
- Los `href="X.dc.html"` son las rutas de Next (ver la tabla de pantallas).
- Los nombres, precios, CUIT, reseñas y teléfonos son inventados. No van al código.

Si `brand-book.md` y una pantalla no coinciden, gana la pantalla: es la versión más nueva. Por ejemplo, los títulos de panel ("Contacto", "Publicado por") son `h3` y no `eyebrow`.

## Pantallas y archivos del repo

| Artboard | Ruta | Archivos a tocar |
|---|---|---|
| `Header` | todas | `app/layout.tsx`, `components/search-navigation.tsx`, `components/account-menu.tsx`, `components/brand.tsx` |
| `Footer` | todas | `app/layout.tsx` |
| `Main` | `/` | `app/page.tsx`, `components/home-carousel.tsx`, `components/product-card.tsx`, `components/service-card.tsx`, `components/pagination.tsx` |
| `DetalleAnuncio` | `/productos/[id]` | `app/productos/[id]/page.tsx`, `components/product-gallery.tsx` |
| `DetalleInmueble` | `/productos/[id]` (rubro inmuebles) | la misma página, con el bloque de ubicación aproximada |
| `Servicios` | `/servicios` | `app/servicios/page.tsx` |
| `DetalleServicio` | `/servicios/[id]` | `app/servicios/[id]/page.tsx` |
| `Ingresar` / `Registro` | `/ingresar`, `/registro` | páginas + `modules/users/auth-form.tsx` |
| `Publicar` | `/productos/nuevo` y `/productos/[id]/editar` | `modules/products/product-form.tsx`, `image-picker.tsx` |
| `OfrecerServicio` | `/servicios/nuevo` y `/servicios/[id]/editar` | `modules/services/service-form.tsx` |
| `MisAnuncios` / `MisServicios` | `/mis-productos`, `/mis-servicios` | páginas + `product-card.tsx`/`service-card.tsx` en modo `manage` |
| `MiPerfil` | `/mi-perfil` | página + `modules/users/profile-form.tsx` |
| `NoDisponible` | 404 | `app/not-found.tsx` (higo 3, espiral) |
| `Error` | error | `app/error.tsx` (higo 8, caras planas) |
| `Cargando` | carga | `app/loading.tsx` |
| `EliminarDialogo` | diálogo | `components/delete-dialog.tsx` |
| `Locales`, `PerfilLocal`, `AltaComercio`, `SolicitudRevision`, `PanelComercio`, `MapaSJ` | nuevas | requieren backend (etapa 4) |
| `Resenas`, `DejarResena`, `ResenaSinConfirmar` | nuevas | requieren backend (etapa 4) |
| `Denunciar`, `DenunciarResena`, `DenunciarPerfil`, `DenunciaEnviada`, `DenunciaSinSesion` | nuevas | requieren backend (etapa 4) |
| `HeaderCategorias` | menú Anuncios abierto | parte del header |

## Etapas

Hacelas en orden. Al terminar cada una: `make check`, levantar la web y comparar con el canvas. Un commit por etapa.

**1. Base visual**
- Cargar Figtree con `next/font/google` en `app/layout.tsx` (pesos 400 a 800) y usarla como `--font-sans`, con Segoe UI de respaldo.
- Pasar a `globals.css` los tokens de color de `tokens.json` que faltan: navy, sky, sky-line, header-foreground-muted, navy-foreground-muted, border-strong, ring-on-primary, error-*, success-* y los del carrusel.
- Crear las clases de la escala tipográfica en `@layer components` (`display`, `h1`, `h2`, `h3`, `title`, `lead`, `body`, `body-sm`, `caption`, `eyebrow`, `overline`, `label`, `chip`, `price`, `price-lg`), con sus variantes mobile, tal como están en `componentes.css` y al final de `lh-pages.css`.
- No cambiar todavía ninguna pantalla.

**2. Componentes compartidos**
- Header de dos niveles: barra azul (logo, buscador, cuenta, Publicar) y barra blanca con las pestañas Anuncios, Locales y Servicios, más "San Juan, Argentina". La pestaña activa sale de la ruta. Anuncios abre el menú de rubros (`HeaderCategorias`) con "Todos los anuncios" y los rubros del catálogo. Mientras no exista `/locales`, la pestaña Locales puede quedar oculta.
- Footer, `Button`, `ProductCard`, `ServiceCard`, `LicenseBadge`, `PageHeading`, `Notice`, `Field` con la jerarquía nueva.

**3. Pantallas existentes**
- Inicio: carrusel con `display`, los anuncios antes de la banda de servicios, la banda en navy plano (sin degradado), el cierre en celeste hielo y la grilla de 2 columnas en mobile.
- Detalle de anuncio y de servicio, formularios, mis anuncios y mis servicios, perfil, ingresar y registro, 404, error y carga.
- Los textos que ya existen se mantienen salvo donde el canvas los cambia.

**4. Funciones nuevas (necesitan backend, como features separadas)**
Para cada una: migración en `database/` aplicada en orden, endpoint en `backend/` FastAPI y después la pantalla.
- Comercios verificados: tabla de comercios (uno por cuenta) con el CUIT privado, dirección, coordenadas, horarios y estado de verificación. Pantallas: alta, solicitud, panel del dueño, perfil público y directorio con mapa (Leaflet o MapLibre con OpenStreetMap). Inmuebles muestra solo la zona aproximada, nunca la dirección.
- Reseñas: puntaje de 1 a 5, texto y respuesta de la persona reseñada. Solo reseñan cuentas con correo o teléfono confirmado.
- Denuncias: `reporter_id` obligatorio (usuario con sesión), tipo (anuncio, reseña o perfil), motivo según el tipo, detalle opcional y estado. Una denuncia por usuario y publicación. Ideal: un panel de administración para revisarlas.

## Prompt para Claude Code

Pegalo en Claude Code abierto en la raíz del repo, una etapa por vez:

```
Vamos a implementar el rediseño de La Higuera. Leé docs/rediseno/HANDOFF.md y
docs/rediseno/design-system/brand-book.md. Después leé frontend/AGENTS.md.

Hacé SOLO la etapa [1|2|3] del HANDOFF. Usá como referencia exacta los
archivos de docs/rediseno/pantallas/ (markup, textos, medidas y clases de
lh-pages.css y componentes.css) y docs/rediseno/design-system/tokens.json.

Reglas:
- No inventes datos: los de los .dc.html son de ejemplo; usá los datos reales
  que ya traen las páginas.
- Mantené la lógica, las server actions, la validación y la accesibilidad que
  ya existen; cambiá presentación y jerarquía.
- Traducí las clases de la maqueta a Tailwind o a @layer components de
  globals.css. No copies los .dc.html ni sus etiquetas especiales.
- Al terminar, corré make check y listame qué archivos cambiaste y qué quedó
  distinto del canvas.
```

## Decisiones tomadas

- **Denuncias con cuenta, no anónimas.** Solo denuncian usuarios registrados y cada denuncia queda guardada con el `user_id` de quien denuncia. Sin sesión, el botón "Denunciar" abre el estado `DenunciaSinSesion` (Crear cuenta / Ingresar) y después del login vuelve a la publicación. El endpoint rechaza denuncias sin sesión (401). Si se confirma el problema, se pausa la publicación y se avisa por correo a quien denunció.
- **"Anuncios" abre siempre el menú de rubros**, en desktop y en mobile. El listado completo está en la primera opción, "Todos los anuncios". El botón usa `aria-expanded` y cierra con Escape o con un clic afuera.
- **Anillo de foco `#0284c7`** (antes `#00a9e8`, que no llegaba a 3:1). Ya está actualizado en `tokens.json` y `componentes.css`.
- **Fotos de ejemplo** (`mockup-fotos/`): se usan en el canvas y además en un seed de desarrollo (`database/seed-dev`, solo para entornos locales). Las pantallas del código no las referencian.
