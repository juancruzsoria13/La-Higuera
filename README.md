# La Higuera

Sitio de anuncios de productos y de servicios de oficio matriculados para San Juan, Argentina. Conecta personas: no procesa compras, pagos ni envíos.

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
2. Aplicar las migraciones de [`database/migrations/`](database/migrations/) **en orden**, desde el **SQL Editor** de un proyecto nuevo:
   1. `202610020001_initial.sql`: perfiles, comercios, anuncios, imágenes, RLS y Storage.
   2. `202610070001_services.sql`: servicios de oficio matriculados.

   Cada una corre en una transacción. No repetirlas sobre el mismo proyecto: los cambios futuros van en migraciones nuevas.
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

Quien publica un servicio declara su matrícula; la insignia **Matrícula verificada** solo la otorga la administración, después de comprobarla:

```sql
update public.service_providers set verified = true where id = '<id del servicio>';
```

Si el profesional cambia el número, la entidad o el oficio, la verificación se retira sola.

## Funcionalidad

- Inicio con carrusel, bloque destacado de **Servicios**, buscador por título, categorías y páginas de 12 anuncios.
- Detalle de anuncio con imagen, precio en ARS o USD, condición, localidad y nombre público del vendedor.
- Registro, confirmación de correo, ingreso y cierre de sesión.
- Perfil propio: nombre y localidad; el correo queda privado en Auth.
- Anuncios propios: alta, edición, eliminación confirmada y estados activo, pausado y vendido. Una imagen opcional, convertida a WebP.
- **Servicios de oficio**: gasistas, plomeros, electricistas y más, con matrícula, entidad emisora, teléfono y botón de WhatsApp. Búsqueda, filtro por oficio y gestión en *Mis servicios*.
- **Estudios de higo**: 9 ilustraciones SVG para momentos vacíos o de espera (sin foto, sin resultados, 404, carga y guardado).
- Eliminación de cuenta con confirmación escrita y borrado real del usuario de Auth.
- Interfaz adaptable en español de Argentina, accesible y con preferencia de movimiento reducido.

Fuera de alcance: gestión visual de comercios, stock, chat, reputación, pagos, envíos y pantalla de administración.

## Seguridad

- El navegador nunca habla con la base de datos directamente: el servidor de Next llama a la API con el token de la sesión, y la API consulta Supabase **con esa misma identidad**. Las políticas RLS deciden qué puede leer o modificar cada usuario.
- La API verifica cada token contra Supabase Auth. Nunca acepta un `owner_id` ni un `user_id` enviado por el cliente.
- Los permisos por columna impiden cambiar el dueño de un registro o marcar una matrícula como verificada.
- La clave secreta solo existe en el backend y solo se usa para eliminar cuentas.
- Las imágenes se sirven por `/api/images/…` con `private, no-store`, pasando por las políticas de Storage. La API valida tamaño, MIME y decodificación real, limita a 20 megapíxeles, rechaza animaciones, quita metadatos y convierte a WebP de hasta 1600 px.

### Imágenes y fallas parciales

Storage y PostgreSQL son servicios separados y no comparten transacción. Por eso:

1. Antes de subir, se reserva una ruta en `storage_cleanup`.
2. Se sube la imagen y se guarda el anuncio. En la misma transacción SQL se consume la reserva y se encola la imagen anterior.
3. Se borran los archivos pendientes. Si Storage falla, la tarea queda y se reintenta en la próxima operación del usuario.
4. Si falla el guardado, la carga nueva queda marcada para borrar. Las reservas abandonadas se recuperan tras 24 horas.
5. Las ediciones usan `updated_at` como control de concurrencia: una pestaña desactualizada no pisa cambios de otra.

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

Crea dos usuarios temporales y verifica persistencia, CRUD, RLS, servicios, Storage privado y borrado de cuenta en cascada. Limpia sus usuarios al terminar.

El recorrido Playwright autenticado (`frontend/tests/e2e/crud.spec.ts`) necesita además `ALLOW_INTEGRATION_TESTS=true` y `SUPABASE_SERVICE_ROLE_KEY` en `frontend/.env.local`, y la API corriendo. Sin eso se omite explícitamente.

El envío de correos se prueba a mano: registrarse con una dirección real, confirmar, ingresar, salir y volver a entrar.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada push a `main` o a ramas `commit-inicial-*`, y en cada pull request:

- **frontend**: `npm ci`, lint, typecheck, Vitest y build (Node 22).
- **e2e**: Playwright con Chromium, sin Supabase.
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
