# Changelog

Todos los cambios relevantes de La Higuera se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [0.3.0] - 2026-10-08

Adapta la API y el frontend al modelo de `database/migrations/202610070003_marketplace_model.sql`. Esta versión no funciona contra una base sin esa migración, y la anterior no funciona con ella.

### Agregado

- `GET /api/catalog`: rubros, localidades y oficios activos, leídos de las tablas `categories`, `localities` y `trades`.
- **Varias fotos por anuncio** (hasta 8): el formulario permite agregar, quitar y reordenar; la primera es la portada. El detalle muestra todas con miniaturas y las tarjetas, la portada. La API las aplica con `set_product_images()` en una sola transacción.
- **Contacto en anuncios**: teléfono (con botón de WhatsApp) y correo. Un anuncio activo exige al menos uno.
- **Venta o alquiler** para el rubro Inmuebles.
- **Vencimiento a 60 días**: *Mis anuncios* y el detalle marcan los vencidos, con botón **Renovar** (`POST /api/products/{id}/renew`).
- Correo de contacto opcional en servicios.
- Íconos para los 8 rubros en la cabecera.

### Cambiado

- Rubro, localidad y oficio son selectores cargados desde la API, en anuncios, servicios y perfil. La API valida que existan y estén activos.
- La matrícula se pide solo si el oficio la exige (`requires_license`); en los demás no se muestra ni se guarda.
- Textos de Servicios (inicio, `/servicios`, *Mis servicios*, título de la página y README): la sección ya no se presenta como "oficios matriculados", porque incluye oficios con y sin matrícula.
- El listado público de anuncios filtra explícitamente activos, sin ocultar y sin vencer; el de servicios, activos y sin ocultar, ordenados por matrícula verificada, referencias comprobadas, puntaje y fecha.
- `Supabase.select()` acepta `columns` para traer fotos y nombres embebidos.
- Las respuestas de anuncios traen `images`, `category_name` y `locality_name`; las de servicios, `trade_name`, `requires_license` y `locality_name`.
- `scripts/cleanup.py` busca las fotos vinculadas en `product_images`.
- `scripts/integration.py` y las pruebas de PGlite cubren el modelo nuevo y cargan las cuatro migraciones.
- Límite de cuerpo de las server actions: de 6 MB a 41 MB, para 8 fotos de 5 MB.
- README y `docs/ARCHITECTURE.md` describen las cuatro migraciones y `database/supabase_setup.sql`.

### Eliminado

- Constantes de rubros y oficios en `backend/app/schemas.py` y en `frontend/src/modules/*/schema.ts`.
- Campos `image` y `remove_image` del formulario de anuncios, reemplazados por `images` e `image_order`.

## [0.2.0] - 2026-10-07

### Agregado

- **Sección Servicios** para trabajadores de oficio matriculados: gasistas, plomeros, electricistas, albañiles, pintores, carpinteros, herreros, técnicos en refrigeración, cerrajeros y otros oficios.
  - Bloque destacado en el inicio con accesos por oficio y hasta 3 perfiles, y botón **Servicios** en la cabecera.
  - Páginas `/servicios` (búsqueda por nombre, filtro por oficio, paginación), `/servicios/[id]` (matrícula, entidad emisora, WhatsApp y teléfono), `/servicios/nuevo`, `/servicios/[id]/editar` y `/mis-servicios`. Acceso a *Mis servicios* desde el menú de cuenta.
  - Migración `database/migrations/202610070001_services.sql`: tabla `service_providers` con RLS, índices y protección contra escrituras durante la eliminación de cuenta.
  - Insignias **Matrícula declarada** y **Matrícula verificada**. Solo la administración puede marcar una matrícula como verificada, y la verificación se retira sola si cambian el número, la entidad o el oficio.
- **Estudios de higo**: componente `Fig` con 9 ilustraciones SVG deterministas en la paleta de marca, usadas solo en momentos vacíos o de espera:
  - espiral en la página 404;
  - ovillo y chips de categorías en búsquedas sin resultados; trazo vectorial en el inicio vacío;
  - una variante por categoría en anuncios sin foto (pixel art, capas, caras planas, anillos de puntos);
  - semitono en el aviso de anuncio guardado;
  - loader con las 9 variantes, que respeta la preferencia de movimiento reducido.
- **Backend en Python** (`backend/`): API FastAPI que concentra la lógica de datos.
  - Endpoints para anuncios, servicios, perfil, imágenes y eliminación de cuenta, con mensajes de error en español de Argentina.
  - Verifica cada token contra Supabase Auth y consulta PostgREST, Storage y Auth con la identidad de quien llama, así que RLS se sigue aplicando.
  - Normalización de imágenes con Pillow: valida MIME y decodificación real, limita a 20 megapíxeles, rechaza animaciones, quita metadatos y convierte a WebP de hasta 1600 px.
  - Scripts `scripts/cleanup.py` (limpieza de Storage) y `scripts/integration.py` (prueba contra un proyecto Supabase real), portados desde TypeScript.
  - 40 pruebas con pytest y lint con ruff.
- Entorno virtual de Python en `backend/.venv`, con `requirements.txt` y `requirements-dev.txt`.
- **CI** con GitHub Actions: lint, tipos, Vitest y build del frontend; Playwright e2e; ruff y pytest del backend.
- `Makefile` con atajos (`make install`, `make dev-frontend`, `make dev-backend`, `make check`).
- Archivos `.env.example` para frontend y backend.
- `docs/ARCHITECTURE.md` y este `CHANGELOG.md`.
- Tests de permisos de servicios sobre PostgreSQL embebido.

### Cambiado

- **Estructura del repositorio** reorganizada en `frontend/`, `backend/`, `database/` y `docs/`.
  - La aplicación Next.js pasó a `frontend/`.
  - Las migraciones y la plantilla de correo pasaron de `supabase/` a `database/`.
  - `VERIFICATION.md` pasó a `docs/`.
- El frontend ya no consulta tablas ni Storage de Supabase directamente: las páginas y las server actions llaman a la API (`frontend/src/lib/api.ts`). Supabase en el frontend queda solo para la sesión (registro, ingreso, confirmación y cierre).
- La ruta `/api/images/…` del frontend ahora reenvía a la API.
- La eliminación de cuenta se ejecuta en la API; la clave secreta de Supabase ya no se usa en el frontend.
- `DeleteDialog` acepta el nombre del elemento a eliminar (`anuncio`, `servicio`).
- Los anuncios sin foto muestran "Sin foto" con un higo según la categoría, en lugar de un ícono genérico.
- README reescrito para la nueva estructura, con instrucciones para Linux.

### Eliminado

- Dependencia `sharp` del frontend: el procesamiento de imágenes ahora está en el backend.
- `frontend/src/lib/supabase/admin.ts`, `frontend/src/modules/products/storage.ts` y `frontend/src/modules/products/images.ts`, reemplazados por la API.
- Scripts `npm run test:integration` y `npm run storage:cleanup`, reemplazados por los scripts de Python.

### Seguridad

- La clave `SUPABASE_SERVICE_ROLE_KEY` solo existe en el backend.
- La columna `verified` de servicios no se puede escribir con la clave pública ni con la sesión de un usuario: no tiene permisos de columna y un trigger la fuerza a `false`.

## [0.1.0] - 2026-10-05

Primera versión.

### Agregado

- Sitio de anuncios con Next.js 16 (App Router), TypeScript, Tailwind CSS 4 y componentes shadcn/ui sobre Radix.
- Supabase como base de datos, Auth y Storage, con migración inicial: perfiles, comercios, anuncios, cola de limpieza de imágenes, RLS, permisos por columna y bucket privado `product-images`.
- Registro, confirmación de correo (`token_hash` y PKCE), ingreso, cierre de sesión y plantilla de correo de confirmación.
- Perfil propio editable y eliminación de cuenta con confirmación escrita.
- Anuncios propios con alta, edición, eliminación y estados activo, pausado y vendido. Una imagen opcional por anuncio, convertida a WebP y servida en forma privada.
- Inicio público con búsqueda por título, categorías (Tecnología, Hogar, Vehículos, Otros) y paginación de 12.
- Identidad visual en azul intenso, celeste y blanco; logo y favicon vectoriales.
- Carrusel de tres mensajes con avance cada 6 segundos, pausa, flechas, teclado y movimiento reducido.
- Pruebas con Vitest (validación, imágenes y migración en PGlite con RLS) y Playwright (navegación pública en escritorio y móvil).
