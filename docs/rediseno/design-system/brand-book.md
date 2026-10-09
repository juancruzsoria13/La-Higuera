La Higuera es el sitio de anuncios clasificados de San Juan, Argentina: productos nuevos y usados, servicios de oficio y comercios verificados. La marca es local, confiable y amigable. Visualmente: un azul fuerte (`primary`) que enmarca la navegación, superficies claras en azul hielo, una sola familia tipográfica (Figtree) y el higo como ilustración para los momentos vacíos.

## Voz y contenido

- Escribí en español rioplatense con voseo: "Encontrá", "Publicá", "Revisá la conexión", "Sé el primero". Nunca "tú" ni "usted".
- Hablale a la persona de "vos"; La Higuera habla en primera del plural cuando es la plataforma ("No pudimos cargar los anuncios").
- Mayúscula solo al inicio de la oración, también en títulos y botones: "Descubrí lo que hay cerca", "Publicar mi anuncio". Las únicas mayúsculas sostenidas son `eyebrow` y `overline`.
- El logotipo se escribe siempre "la higuera" en minúscula; en texto corrido, "La Higuera".
- Lo local va en el texto: "en San Juan", "cerca tuyo", localidades reales (los 19 departamentos: Capital, Rivadavia, Santa Lucía, Chimbas, Rawson…).
- Botones con verbo: "Publicar", "Ver anuncio", "Guardar cambios", "Volver a explorar". Errores que dicen qué pasó y qué hacer, sin disculpas.
- Sin emoji. Precios con "$ " y punto de miles (`$ 450.000`); "A convenir" cuando no hay precio.
- Recordá siempre que La Higuera no procesa compras, pagos ni envíos: comprador y vendedor coordinan por WhatsApp, teléfono o mail.

## Jerarquía tipográfica

Una sola familia: **Figtree** (Google Fonts, pesos 400–900), con `"Segoe UI", system-ui, sans-serif` de respaldo. La jerarquía sale de tamaño y peso, no de cambiar de fuente ni de color.

Reglas:
- **Un solo nivel máximo por pantalla.** Cada pantalla tiene exactamente un `display` (solo home) o un `h1` (todas las demás). Nunca los dos.
- **Tres niveles por bloque, no más.** Antetítulo (`eyebrow`, opcional) → título (`h2`/`h3`) → bajada (`body-sm` o `lead`). Ver `SectionHeading`.
- **Pesos con significado:** 800 para display, h1, precio y logotipo; 700 para h2, h3, eyebrow y overline; 600 para títulos de tarjeta, labels y botones; 500 para chips y captions; 400 para texto corrido. No uses 450, 750 ni otros intermedios.
- **Color de texto con dos valores:** `foreground` para lo que se lee primero, `muted-foreground` para todo lo secundario. `primary` como color de texto solo en eyebrows, links de acción y el oficio en tarjetas de servicio.
- **Tamaño mínimo 12px** (`eyebrow`); el texto que se lee de corrido nunca baja de 13px (`caption`). Lo que estaba en 10px y 11px sube.
- **Mayúsculas solo en `eyebrow` y `overline`**, con tracking positivo. Una sola etiqueta en mayúscula por bloque o tarjeta.
- **Tracking negativo en todo lo grande:** de -0.04em en `display` a -0.005em en `title`. Texto de 16px o menos, sin tracking.
- **Precio = dato más pesado de la tarjeta** (`price`, 22px 800 tabular), por encima del título (`title`, 16px 600).
- **Mobile (<640px)** usa las variantes `-sm`: `display-sm` 40px, `h1-sm` 30px, `h2-sm` 24px. El resto de la escala no cambia.
- Títulos con `text-wrap: balance`; texto corrido con un ancho máximo de ~65 caracteres.

| Estilo | Tamaño / interlínea | Peso | Dónde |
|---|---|---|---|
| `display` / `display-sm` | 64/64 · 40/44 | 800 | Titular del carrusel de la home |
| `h1` / `h1-sm` | 40/46 · 30/36 | 800 | Título de página, título del anuncio |
| `h2` / `h2-sm` | 28/34 · 24/30 | 700 | Secciones: listado, servicios, bloque de cierre |
| `h3` | 20/26 | 700 | Paneles: "Acerca del producto", estado vacío, formularios |
| `title` | 16/22 | 600 | Título dentro de tarjetas |
| `lead` | 18/28 | 400 | Bajada de h1 y del carrusel |
| `body` | 16/24 | 400 | Descripciones, párrafos |
| `body-sm` | 14/20 | 400 | Secundario: conteos, avisos, bajada de servicio |
| `caption` | 13/18 | 500 | Localidad, fecha, matrícula, ayudas de campo |
| `eyebrow` | 12/16 +0.08em MAYÚS | 700 | Antetítulo de sección |
| `overline` | 11/14 +0.06em MAYÚS | 700 | Rubro en tarjeta |
| `label` | 14/20 | 600 | Labels de formulario, botones, links de acción |
| `chip` | 13/16 | 500 | Categorías, filtros, pills de estado |
| `price` / `price-lg` | 22/28 · 40/44 | 800 tabular | Precio en tarjeta · en detalle |
| `logotype` | 25/28 (21 mobile) | 800 | "la higuera." |

### Del código actual a la escala

| Hoy (Tailwind / globals.css) | Pasa a |
|---|---|
| `--font-sans: "Segoe UI", Arial…` | Figtree con Segoe UI de respaldo |
| `.carousel-title` clamp(34px, 4.6vw, 62px) 750 | `display-sm` → `display` (40 → 64px, 800) |
| `.carousel-eyebrow` 10px 750 +.18em | `eyebrow` |
| `.carousel-description` 14–16px 450 | `lead` |
| `text-[10px] font-bold uppercase tracking-[.18em]` (eyebrows de sección) | `eyebrow` |
| `text-2xl sm:text-[28px] font-bold` / `text-2xl sm:text-4xl font-bold` (h2 de secciones) | `h2-sm` → `h2` |
| `text-3xl md:text-4xl font-semibold` (PageHeading, título de anuncio) | `h1-sm` → `h1` |
| `text-[11px] font-semibold uppercase tracking-[.12em]` (rubro en tarjeta) | `overline` |
| `font-semibold` sin tamaño (título de tarjeta) | `title` |
| `text-xl font-semibold` (precio en tarjeta) | `price` |
| `text-4xl font-semibold` (precio en detalle) | `price-lg` |
| `text-lg font-semibold` (`.panel-title`, "Acerca del producto", estado vacío) | `h3` |
| `text-xs uppercase tracking-wider` ("Contacto", "Publicado por") | `h3` como título del panel |
| `text-xs text-muted-foreground` (localidad, fecha) | `caption` |
| `text-sm text-muted-foreground` (bajadas) | `body-sm` |
| `.field-label` text-sm semibold | `label` |
| `text-blue-100`, `text-sky-200` sobre azul | `navy-foreground-muted` / `header-foreground-muted` |
| `font-weight: 450 / 750` | 400 / 800 |

## Color

- Fondo de página `background` (azul hielo); contenido en tarjetas y paneles `card` con borde `border` de 1px. No hay tema oscuro.
- `primary` es la marca: header completo, botón principal, links de acción, eyebrows. Una acción `primary` por bloque.
- `navy` para bloques de contraste dentro de la página (banda de servicios, cierre "Eso que no usás…"). Encima: `primary-foreground` y `navy-foreground-muted`. Reemplaza el degradado `from-[#0a2463] to-[#1d4ed8]` por `navy` plano.
- Las tres placas del carrusel tienen sus pares propios: `carousel-sky`/`carousel-sky-foreground`, `carousel-blue`/`carousel-blue-accent`, `carousel-ice`/`carousel-ice-foreground` con acento `primary`.
- `sky` solo para el punto del logotipo sobre azul y detalles de ilustración; `sky-line` para el subrayado de la categoría activa.
- Estados: error con `error-surface`/`error-foreground`/`error-border`; matrícula verificada con `success-surface`/`success-foreground`; eliminar con `destructive`. El texto siempre acompaña al color.
- `paper` y `fig-pink` son de piezas de marca e ilustración, no de la interfaz.
- Foco: `ring` (#0284c7) da 3.8:1 sobre `background`; reemplaza el #00a9e8 del código. `border` sigue siendo demasiado claro para marcar un control por sí solo: el foco tiene que cargar el estado.

## Espacio, radios y layout

- Contenedor `shell`: ancho máximo 1280px, gutter lateral `space-5` (20px) en mobile y `space-8` (32px) desde 640px.
- Separación entre secciones de la home: `space-9` (36px) en mobile, `space-11` (44px) desde 640px; `space-16` antes del footer.
- Grilla de anuncios: 1 / 2 (≥640) / 3 (≥1024) / 4 (≥1280) columnas con gap `space-5`.
- Radios: `radius-sm` categorías y botón del header; `radius-md` botones, inputs, avisos, tile del logo; `radius-lg` tarjetas y paneles; `radius-xl` banda de servicios; `radius-full` pills.
- Sin sombras en reposo. `shadow-card-hover` al pasar el mouse por tarjetas, `shadow-search` en el buscador, `shadow-menu` en el desplegable de cuenta.
- Alto táctil mínimo 44px en todo lo que se toca. Foco visible: outline 3px `ring`, offset 3px (`ring-on-primary` dentro del header).
- Movimiento: transiciones de 180–500ms solo en color, opacidad y el cambio de placa del carrusel; todo se desactiva con `prefers-reduced-motion`.

## Iconografía e ilustración

- Íconos: **lucide-react**, trazo 2, a 16px junto a texto chico, 20px en botones de ícono solo, 14px en metadatos. Toman el color del texto. Rubros: `House` Inmuebles, `Smartphone` Tecnología, `CarFront` Vehículos, `Shirt` Ropa, `Sofa` Muebles, `Refrigerator` Electrodomésticos, `BrickWall` Materiales de construcción, `Shapes` Otros, `LayoutGrid` Todo, `Wrench` Servicios.
- Sin emoji, ni en la interfaz ni en los textos.
- El **higo** (`components/fig.tsx`, 9 variantes) aparece solo en momentos vacíos o de espera: anuncio no disponible (espiral), búsqueda sin resultados (ovillo), anuncio sin foto (uno por rubro), anuncio publicado (semitono) y la carga (rotan los 9). Nunca reemplaza al logo ni compite con las fotos de productos.
- Logos en el grupo Logos: `brand-mark.svg` (tinta `primary`), `brand-mark-white.svg` (tinta blanca), `app-icon.svg` (favicon, tile `primary` de radio 17/64) y `simbolo-h-hoja.svg` (exploración de la dirección A, todavía no en producción).
