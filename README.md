# La Higuera

Sitio de anuncios de productos y de servicios de oficio, con y sin matrícula, para San Juan, Argentina. Conecta personas: no procesa compras, pagos ni envíos.

| Parte | Tecnología | Carpeta |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, componentes shadcn/ui sobre Radix | [`frontend/`](frontend/) |
| Backend | Python 3.12+, FastAPI, httpx, Pillow | [`backend/`](backend/) |
| Base de datos, Auth y Storage | Supabase (PostgreSQL con RLS) | [`database/`](database/) |
| CI | GitHub Actions | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

La arquitectura completa está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y el historial de cambios en [`CHANGELOG.md`](CHANGELOG.md).

## Estructura

```text
.
├── frontend/               Aplicación Next.js
│   ├── src/app/            Rutas y páginas
│   ├── src/components/     Interfaz compartida (ui/ = shadcn/ui, fig.tsx = ilustraciones)
│   ├── src/modules/        Productos, servicios y usuarios: validación, consultas, acciones, formularios
│   ├── src/lib/            Cliente de la API, cliente Supabase (sesión) y utilidades
│   └── tests/              Vitest (validación + migraciones en PGlite) y Playwright (e2e)
├── backend/                API FastAPI
│   ├── app/                main, configuración, dependencias, cliente Supabase, imágenes, routers
│   ├── scripts/            Limpieza de Storage y prueba de integración contra Supabase real
│   └── tests/              pytest
├── database/
│   ├── migrations/         Esquema, funciones, RLS y Storage, en orden de aplicación
│   ├── supabase_setup.sql  Las cuatro migraciones en un solo archivo, para un proyecto nuevo
│   └── templates/          Plantilla HTML del correo de confirmación
├── docs/                   Arquitectura y registro de verificación
├── .github/workflows/      CI
├── Makefile                Atajos (make install, make check, …)
├── CHANGELOG.md
└── README.md
```

## Requisitos

- Node.js 22 o superior y npm.
- Python 3.12 o superior con el módulo `venv`. En Debian/Ubuntu: `sudo apt install python3-venv` (o `python3.X-venv` según la versión).
- Un proyecto Supabase para usar la app con datos. Sin él, el sitio arranca y muestra un aviso de configuración pendiente.

## Puesta en marcha

### 1. Instalar dependencias

```bash
make install
```

Equivale a:

```bash
cd frontend && npm ci && cd ..
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
```

El entorno virtual de Python vive en `backend/.venv` y no se versiona. Para activarlo en una terminal: `source backend/.venv/bin/activate`.

### 2. Variables de entorno

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

| Variable | Dónde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | frontend | Clave publishable (o `anon` heredada). Solo para la sesión de Auth |
| `NEXT_PUBLIC_SITE_URL` | frontend | URL del sitio; arma el enlace de confirmación de correo |
| `API_URL` | frontend | Dirección de la API. Por defecto `http://127.0.0.1:8000` |
| `SUPABASE_URL` | backend | Misma URL del proyecto |
| `SUPABASE_PUBLISHABLE_KEY` | backend | Misma clave publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Clave `sb_secret_…` (o `service_role` heredada). Solo para eliminar cuentas y para los scripts. **Nunca** con prefijo `NEXT_PUBLIC_` |
| `CORS_ORIGINS` | backend | Opcional. Next llama a la API desde el servidor, así que normalmente queda vacío |

Los archivos `.env*` están excluidos de Git, salvo los `.env.example`.

### 3. Levantar los dos servidores

En dos terminales:

```bash
make dev-backend    # API en http://127.0.0.1:8000  (docs interactivas en /docs)
make dev-frontend   # Sitio en http://localhost:3000
```

Los cambios de código se recargan solos. Hay que reiniciar solo al cambiar variables de entorno.

## Configurar Supabase

1. Crear un proyecto y copiar la URL, la clave **publishable** y la clave **secret** a las variables de arriba.
2. Aplicar las migraciones de [`database/migrations/`](database/migrations/) **en orden**, desde el **SQL Editor**:
   1. `202610020001_initial.sql`: perfiles, comercios, anuncios, imágenes, RLS y Storage.
   2. `202610070001_services.sql`: servicios de oficio.
   3. `202610070002_supabase_hardening.sql`: permisos explícitos para `service_role`, límite de imágenes en trámite y ajustes de funciones.
   4. `202610070003_marketplace_model.sql`: rubros, localidades y oficios en tablas; contacto, operación, vencimiento a 60 días y hasta 8 fotos por anuncio; matrícula solo para los oficios que la exigen; perfiles públicos con puntaje; y las tablas de comercios verificados, reseñas, denuncias y administración (todavía sin pantallas).

   En un proyecto **nuevo** se puede pegar en cambio [`database/supabase_setup.sql`](database/supabase_setup.sql), que reúne las cuatro en una sola transacción. Si el proyecto ya tiene alguna aplicada, ejecutar solo las que falten, en orden.

   Cada una corre en una transacción. No repetirlas sobre el mismo proyecto: los cambios futuros van en migraciones nuevas. La cuarta cambia columnas que usa el código: requiere la versión 0.3.0 de la API y del frontend.
3. En **Authentication → URL Configuration**, establecer Site URL en `http://localhost:3000` y permitir `http://localhost:3000/auth/confirm`. Al desplegar, agregar la URL de producción.
4. En **Authentication → Providers → Email**, habilitar correo y contraseña con una longitud mínima de 8 caracteres. La app funciona con o sin confirmación de correo.
5. Para registros públicos hace falta **Custom SMTP** (Authentication → Emails → SMTP Settings), con remitente `La Higuera` y una dirección propia verificada. No guardar credenciales SMTP en el repositorio.
6. En **Authentication → Emails → Templates → Confirm sign up**, poner como asunto `Confirmá tu correo | La Higuera` y pegar [`database/templates/confirm-signup.html`](database/templates/confirm-signup.html). El archivo no se sincroniza solo.
7. La migración inicial crea el bucket **privado** `product-images` (5 MB, solo `image/webp`). No hacerlo público.

### Con Supabase CLI (alternativa al SQL Editor)

La CLI busca las migraciones en `supabase/migrations`. Desde la raíz:

```bash
npx supabase init
mkdir -p supabase && cp database/migrations/*.sql supabase/migrations/
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

La carpeta `supabase/` de la raíz está en `.gitignore`: la fuente de verdad sigue siendo `database/migrations/`. Elegir un solo método por proyecto: el SQL Editor no actualiza el historial de migraciones de la CLI. Para desarrollo local con Docker: `npx supabase start` y luego `npx supabase db reset`, usando las URL y claves locales en los `.env`.

### Verificar matrículas de servicios

En los oficios que la exigen (gasista, electricista y plomero, según `trades.requires_license`), quien publica declara su matrícula; la insignia **Matrícula verificada** solo la otorga la administración, después de comprobarla. Desde el SQL Editor:

```sql
update public.service_providers set verified = true where id = '<id del servicio>';
```

Si el profesional cambia el número, la entidad o el oficio, la verificación se retira sola. La migración 4 agrega además la función `admin_set_service_badges()` para un futuro panel de administración.

## Funcionalidad

- Inicio con carrusel, bloque destacado de **Servicios**, buscador por título, rubros y páginas de 12 anuncios.
- Rubros, localidades (los 19 departamentos de San Juan) y oficios vienen de tablas de la base y se eligen de una lista.
- Detalle de anuncio con todas sus fotos, precio en ARS o USD, condición, venta o alquiler (inmuebles), localidad, nombre público del vendedor y contacto: WhatsApp, teléfono y correo.
- Registro, confirmación de correo, ingreso y cierre de sesión.
- Perfil propio: nombre y localidad; el correo de acceso queda privado en Auth.
- Anuncios propios: alta, edición, eliminación confirmada y estados activo, pausado y vendido. Hasta 8 fotos opcionales, convertidas a WebP, que se pueden quitar y reordenar (la primera es la portada). Teléfono o correo de contacto obligatorio para publicar.
- Vencimiento: un anuncio activo deja de verse a los 60 días. *Mis anuncios* marca los vencidos y permite renovarlos.
- **Servicios de oficio**: gasistas, plomeros, electricistas, pintores y más, con teléfono, botón de WhatsApp y correo opcional. La matrícula y su entidad emisora se piden solo en los oficios que la exigen. Búsqueda, filtro por oficio y gestión en *Mis servicios*.
- **Estudios de higo**: 9 ilustraciones SVG para momentos vacíos o de espera (sin foto, sin resultados, 404, carga y guardado).
- Eliminación de cuenta con confirmación escrita y borrado real del usuario de Auth.
- Interfaz adaptable en español de Argentina, accesible y con preferencia de movimiento reducido.

Fuera de alcance por ahora: pantallas de comercios y su verificación, reseñas y respuestas, denuncias, referencias de servicios y panel de administración (las tablas y funciones ya existen en la base), además de stock, chat, pagos y envíos.

## Seguridad

- El navegador nunca habla con la base de datos directamente: el servidor de Next llama a la API con el token de la sesión, y la API consulta Supabase **con esa misma identidad**. Las políticas RLS deciden qué puede leer o modificar cada usuario.
- La API verifica cada token contra Supabase Auth. Nunca acepta un `owner_id` ni un `user_id` enviado por el cliente.
- Los permisos por columna impiden cambiar el dueño de un registro, marcar una matrícula como verificada u ocultar, desocultar o extender el vencimiento de un anuncio. `products` y `businesses` solo aceptan INSERT en las columnas listadas en la migración 4.
- La clave secreta solo existe en el backend y solo se usa para eliminar cuentas.
- Las imágenes se sirven por `/api/images/…` con `private, no-store`, pasando por las políticas de Storage. La API valida tamaño, MIME y decodificación real, limita a 20 megapíxeles, rechaza animaciones, quita metadatos y convierte a WebP de hasta 1600 px.

### Imágenes y fallas parciales

Storage y PostgreSQL son servicios separados y no comparten transacción. Por eso:

1. Antes de subir cada foto nueva, se reserva una ruta en `storage_cleanup` (`reserve_image()`).
2. Se suben las fotos y se guarda el anuncio. Después, `set_product_images(product_id, paths)` deja las fotos exactamente como la lista final: en una sola transacción SQL consume las reservas nuevas, reordena y encola las fotos quitadas.
3. Se borran los archivos pendientes. Si Storage falla, la tarea queda y se reintenta en la próxima operación del usuario.
4. Si falla algo, cada carga nueva se marca para borrar (`abandon_image()`). En un alta, el anuncio recién creado se elimina para no dejarlo publicado sin sus fotos; en una edición, la API avisa que los datos se guardaron pero las fotos no. Las reservas abandonadas se recuperan tras 24 horas.
5. Las ediciones usan `updated_at` como control de concurrencia: una pestaña desactualizada no pisa cambios de otra.

El formulario envía las fotos por la server action de Next, cuyo límite de cuerpo es de 41 MB (`frontend/next.config.ts`) para admitir 8 fotos de 5 MB.

Mantenimiento periódico, o después de una falla de Storage:

```bash
cd backend && .venv/bin/python -m scripts.cleanup
```

## Pruebas y calidad

```bash
make check          # lint + tipos + tests de frontend y backend
```

| Comando | Qué cubre |
| --- | --- |
| `cd frontend && npm run lint && npm run typecheck` | ESLint y TypeScript |
| `cd frontend && npm test` | Validación de formularios y migraciones ejecutadas en PostgreSQL embebido (PGlite) con dos identidades y RLS real |
| `cd frontend && npm run build` | Build de producción |
| `cd frontend && npx playwright install chromium && npm run test:e2e` | Navegación pública, búsqueda, carrusel, protección de rutas, escritorio y móvil |
| `cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .` | Lint y formato de Python |
| `cd backend && .venv/bin/pytest` | Validación, imágenes, cliente Supabase y endpoints con una base en memoria |

PGlite ejecuta las políticas reales de la migración, pero sus tablas de Auth y Storage son mínimas: **no reemplaza una prueba contra Supabase**.

### Contra un proyecto Supabase de pruebas

Con las migraciones aplicadas y las claves en `backend/.env`:

```bash
cd backend && ALLOW_INTEGRATION_TESTS=true .venv/bin/python -m scripts.integration
```

Crea dos usuarios temporales y verifica listas de referencia, perfiles públicos, persistencia, CRUD, contacto y operación, ocultos y vencidos, renovación, varias fotos con `set_product_images`, RLS, matrícula según el oficio, Storage privado y borrado de cuenta en cascada. Limpia sus usuarios al terminar.

El recorrido Playwright autenticado (`frontend/tests/e2e/crud.spec.ts`) necesita además `ALLOW_INTEGRATION_TESTS=true` y `SUPABASE_SERVICE_ROLE_KEY` en `frontend/.env.local`, y la API corriendo. Sin eso se omite explícitamente.

El envío de correos se prueba a mano: registrarse con una dirección real, confirmar, ingresar, salir y volver a entrar.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada push a `main` o a ramas `commit-inicial-*`, y en cada pull request:

- **frontend**: `npm ci`, lint, typecheck, Vitest y build (Node 22).
- **e2e**: Playwright con Chromium, sin Supabase (sin API, la barra no muestra rubros y esa parte del recorrido se omite).
- **backend**: ruff (lint y formato) y pytest (Python 3.13).

No hay despliegue automático.

## Despliegue

- **Frontend**: cualquier hosting de Next.js (por ejemplo Vercel) con *Root Directory* = `frontend`, Node 22 y las variables de `frontend/.env.example`. `API_URL` debe apuntar a la API desplegada.
- **Backend**: cualquier servicio que corra Python, con `pip install -r requirements.txt` y `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, más las variables de `backend/.env.example`.
- Ajustar en Supabase la Site URL, los redirects y el SMTP con la URL real. Nunca usar `ALLOW_INTEGRATION_TESTS=true` en producción. Las migraciones se aplican aparte; ningún build modifica la base.

## Referencias

- [Next.js App Router](https://nextjs.org/docs/app)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: control de acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase: claves de API](https://supabase.com/docs/guides/api/api-keys)
