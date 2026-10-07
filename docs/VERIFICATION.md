# Verificación de la entrega

## 0.2.0 — 7 de octubre de 2026

Verificado en Linux (Python 3.14.4, Node.js del sistema, Next.js 16.3.8) **sin un proyecto Supabase real**.

### Aprobado

- Frontend: `npm run lint`, `npm run typecheck` y `npm run build` sin errores.
- Frontend: `npm test` con 27 pruebas. Incluye las dos migraciones ejecutadas en PGlite con RLS: permisos de servicios, imposibilidad de autoverificar la matrícula, retiro de la verificación al cambiar la matrícula, visibilidad de perfiles pausados y propiedad.
- Frontend: `npx playwright test` con 8 pruebas aprobadas (escritorio y móvil). Las 2 del recorrido CRUD autenticado quedaron **omitidas**, no aprobadas.
- Backend: `ruff check`, `ruff format --check` y `pytest` con 40 pruebas: validación, imágenes con Pillow, cliente Supabase con `MockTransport` y endpoints con una base en memoria.
- Integración Next.js → API → Supabase con un servidor que **simula** PostgREST y devuelve listas vacías. Se comprobó que inicio, `/servicios`, una búsqueda sin resultados y un anuncio inexistente generan las consultas esperadas (filtros, orden, paginación y `apikey`) y muestran los estados vacíos. Hay capturas de la búsqueda vacía y del inicio.
- Las 9 variantes de `Fig` se renderizaron a PNG: ninguna se corta en el viewBox.

### Pendiente con Supabase real

- `python -m scripts.integration` contra un proyecto de pruebas.
- Recorrido Playwright autenticado (`crud.spec.ts`) con la API corriendo.
- Alta, edición y baja de anuncios y servicios con sesión real, carga de imágenes a Storage y eliminación de cuenta.
- Envío y recepción del correo de confirmación.

## 0.1.0 — 2 al 4 de octubre de 2026

Registro original, con las rutas y comandos de Windows de ese momento (antes de la reorganización en `frontend/` y `backend/`).

Código desarrollado en `C:\Users\juanc\OneDrive\Documentos\La Higuera`.

### Actualización de diseño — 4 de octubre de 2026

- Paleta renovada a azul intenso, celeste y blanco; logo y favicon vectoriales nuevos.
- Buscador en la cabecera, categorías debajo y navegación adaptable. Se conserva la búsqueda al cambiar de categoría y el filtro al enviar otra búsqueda.
- Carrusel de tres frases, con avance automático cada 6 segundos, indicadores, flechas, pausa y navegación por teclado. La rotación se detiene al pasar el puntero o usar la navegación; con movimiento reducido no arranca automáticamente.
- `npm.cmd run typecheck`, `npm.cmd run lint` y `npm.cmd run build`: aprobados.
- 8 pruebas públicas Playwright aprobadas entre escritorio y móvil: búsqueda/filtros, carrusel automático, pausa/reanudación, controles manuales, movimiento reducido y protección de rutas.
- Revisión visual de la portada y el carrusel. Las comprobaciones de esta actualización no usan cuentas ni datos simulados de Supabase.

### Comprobado en este equipo

- Instalación de dependencias con npm; lockfile versionado y auditoría de instalación sin vulnerabilidades reportadas.
- `npm.cmd run typecheck`: aprobado.
- `npm.cmd run lint`: aprobado, sin errores ni advertencias.
- `npm.cmd run build`: aprobado. Next.js 16.3.8, React 19.3.0, Node.js 22.17.1.
- `npm.cmd test`: 29 pruebas aprobadas. Validación de productos/perfiles/registro, precio y enums; rechazo de imágenes falsas, MIME incorrecto, SVG y exceso de tamaño; conversión real a WebP.
- La migración completa se ejecutó en PostgreSQL embebido mediante PGlite. Se verificaron triggers, restricciones, RLS y dos identidades: edición propia, bloqueo de propiedad falsa y comercio ajeno, privacidad de perfiles y anuncios pausados/vendidos, acceso a imágenes, cola transaccional y cascadas al borrar un usuario.
- `npm.cmd run test:e2e`: 4 pruebas aprobadas en Chromium (escritorio y dispositivo móvil emulado); búsqueda, categorías, navegación, ausencia de desbordamiento horizontal y protección de rutas.
- Revisión visual de capturas completas de inicio en escritorio y móvil, sin datos de demostración.

### Pendiente de Supabase real

El usuario confirmó que todavía no creó un proyecto Supabase. No se encontraron claves disponibles, y Docker Desktop no estaba iniciado. No se iniciaron servicios ni se desplegó la aplicación.

- 2 recorridos autenticados Playwright (uno por tamaño de pantalla) quedaron **omitidos explícitamente**, no aprobados.
- No se ejecutó `npm.cmd run test:integration` contra Supabase alojado o local.
- No se verificó envío/recepción de correo de confirmación.
- No se afirma haber verificado persistencia real al recargar, Storage remoto, eliminación real de Auth ni CRUD completo con dos cuentas Supabase. Los scripts y recorridos para hacerlo están incluidos.

PGlite ejecuta PostgreSQL y las políticas reales de la migración, pero sus tablas mínimas de Auth/Storage son fixtures. No comprueba el comportamiento de los servicios HTTP, las cookies, el correo ni el almacenamiento de objetos de Supabase. La guía para completar esa verificación está en `README.md`.
