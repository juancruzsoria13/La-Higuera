# Arquitectura

## Vista general

```text
Navegador ──► Next.js (frontend/) ──► API FastAPI (backend/) ──► Supabase
               │  páginas, server actions      │  validación, imágenes        │  PostgreSQL + RLS
               │  sesión de Auth (cookies)     │  token del usuario           │  Storage privado
               └──────────── Supabase Auth ◄───┘  (verificado en Auth)        │  Auth
```

- El **navegador** solo habla con Next.js. Nunca recibe claves privadas ni consulta la base.
- **Next.js** renderiza en el servidor, maneja la sesión de Supabase Auth con cookies (`@supabase/ssr`) y, para cualquier dato, llama a la API reenviando el `access_token` de la sesión como `Authorization: Bearer`.
- **La API** verifica el token contra `GET /auth/v1/user`, valida la entrada y llama a PostgREST y Storage **con ese mismo token**. Las políticas RLS de la base siguen siendo la última palabra sobre qué puede leer o modificar cada persona.
- La **clave secreta** de Supabase solo la usa la API para eliminar cuentas (`/api/account/delete`) y los scripts de mantenimiento.

## Endpoints de la API

Documentación interactiva en `http://127.0.0.1:8000/docs` con la API corriendo.

| Método y ruta | Sesión | Descripción |
| --- | --- | --- |
| `GET /api/health` | no | Estado y si Supabase está configurado |
| `GET /api/products?q&category&page&mine` | opcional (`mine` la requiere) | Anuncios activos o propios, 12 por página |
| `GET /api/products/{id}` | opcional | Anuncio y nombre público del vendedor |
| `POST /api/products` | sí | Alta (multipart: campos e `image` opcional) |
| `PUT /api/products/{id}` | sí | Edición con `version` (= `updated_at`) y `remove_image` |
| `DELETE /api/products/{id}` | sí | Baja; devuelve si la limpieza de imágenes quedó completa |
| `GET /api/services?q&trade&page&limit&mine` | opcional | Servicios activos o propios; los verificados primero |
| `GET /api/services/{id}` | opcional | Detalle de un servicio |
| `POST /api/services`, `PUT /api/services/{id}` | sí | Alta y edición (JSON; la edición exige `version`) |
| `DELETE /api/services/{id}` | sí | Baja |
| `GET /api/profile`, `PUT /api/profile` | sí | Perfil propio |
| `POST /api/account/delete` | sí | Eliminación de cuenta con `{"confirmation": "ELIMINAR"}` |
| `GET /api/images/{owner}/{file}.webp` | opcional | Imagen privada, si Storage la permite |

Los errores siempre responden `{"detail": "<mensaje para mostrar>"}`. Códigos usados: 401 (sin sesión), 404 (no existe o no es tuyo), 409 (conflicto de versión o rechazo de la base), 422 (validación), 502 (falla de Supabase) y 503 (falta configuración).

## Organización del backend

| Archivo | Responsabilidad |
| --- | --- |
| `app/main.py` | Aplicación, cliente HTTP compartido, manejo de errores de validación y registro de routers |
| `app/config.py` | Variables de entorno (`pydantic-settings`) y constantes |
| `app/deps.py` | Dependencias: usuario actual, cliente con la identidad del usuario, cliente administrativo |
| `app/supabase.py` | Cliente mínimo de PostgREST, Storage y Auth sobre `httpx` |
| `app/schemas.py` | Validación con los mismos límites y mensajes que el frontend |
| `app/images.py` | Normalización a WebP y cola de limpieza de Storage |
| `app/routers/` | Anuncios, servicios, cuenta y perfil, imágenes |

## Decisiones

- **Supabase sigue siendo la base, Auth y Storage.** La API no duplica permisos en Python: delega en RLS, que también se prueba en `frontend/tests/database.test.ts`. Así un error en la API no puede saltear las políticas.
- **La sesión queda en Next.js.** El flujo de registro, confirmación por correo y cookies ya estaba resuelto con `@supabase/ssr`; moverlo agregaría riesgo sin beneficio. La API es *stateless* y solo recibe el token.
- **Validación en dos capas.** El frontend valida con zod para responder rápido y conservar el formulario; la API vuelve a validar porque es la que escribe.
- **Sin SDK de Supabase en Python.** Un cliente `httpx` de ~150 líneas cubre lo necesario, es fácil de probar con `MockTransport` y no arrastra dependencias.
- **Concurrencia optimista.** Las ediciones filtran por `updated_at`; si otra pestaña guardó antes, la API responde 409 y no pisa cambios.

## Base de datos

Las migraciones están en `database/migrations/` y se aplican en orden:

1. `202610020001_initial.sql`: perfiles, comercios, anuncios, cola `storage_cleanup`, funciones (`product_seller`, `reserve_image`, `abandon_image`, `begin_account_deletion`), RLS, permisos por columna y bucket `product-images`.
2. `202610070001_services.sql`: `service_providers` con RLS, columna `verified` sin permisos de escritura para usuarios y trigger que la reinicia al cambiar la matrícula.
