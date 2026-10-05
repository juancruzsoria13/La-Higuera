# La Higuera

Sitio de anuncios de productos para San Juan, Argentina. Primera versión con Next.js App Router, TypeScript, Tailwind CSS, componentes shadcn/ui basados en Radix y Supabase (PostgreSQL, Auth y Storage). No procesa compras ni pagos.

## Ejecutar

Requiere Node.js 22.17 o superior compatible con Next.js 16 y npm. Versiones reproducibles en `package-lock.json`.

```powershell
cd 'C:\Users\juanc\OneDrive\Documentos\La Higuera'
npm.cmd ci
Copy-Item .env.example .env.local
# Completar .env.local con los valores del proyecto Supabase.
npm.cmd run dev
```

Abrir http://localhost:3000. Sin variables válidas se muestra un aviso de configuración pendiente: no se simula una base conectada ni se incluyen anuncios ficticios.

En PowerShell, usá `npm.cmd` y `npx.cmd` como en los ejemplos. Así se ejecutan los archivos `.cmd` de Node.js aunque PowerShell bloquee `npm.ps1` o `npx.ps1`; no hace falta cambiar la política de ejecución del sistema.

## Configurar Supabase

1. Crear un proyecto en Supabase y copiar su URL y su clave **publishable** a `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La clave `anon` anterior también sirve si el proyecto todavía usa ese formato.
2. Copiar la clave **secret** (`sb_secret_...`) a `SUPABASE_SERVICE_ROLE_KEY`; también funciona la clave heredada **service_role**. El nombre de la variable se conserva en el código, pero acepta cualquiera de las dos claves privilegiadas. Solo la usa el servidor para eliminar la cuenta de Auth y sus archivos, y los scripts administrativos de prueba/mantenimiento. Nunca usar un prefijo `NEXT_PUBLIC_` para esta clave. `.env.local` está excluido de Git.
3. Configurar `NEXT_PUBLIC_SITE_URL=http://localhost:3000` en desarrollo; usar la URL HTTPS del despliegue en producción.
4. Aplicar la migración completa `supabase/migrations/202610020001_initial.sql` en el **SQL Editor** de un proyecto nuevo. Se ejecuta en una transacción. No aplicarla repetidamente al mismo proyecto; las siguientes modificaciones deben ser nuevas migraciones. Elegí este método o la CLI de la sección siguiente, sin ejecutar ambos para la misma migración: el SQL Editor no actualiza el historial de migraciones de la CLI.
5. En **Authentication → URL Configuration**, establecer Site URL en `http://localhost:3000` y permitir `http://localhost:3000/auth/confirm`. Agregar también la URL exacta de producción al desplegar.
6. En **Authentication → Providers → Email**, habilitar correo/contraseña y mantener activada o desactivada la confirmación según la política del proyecto. La app admite ambos casos. Configurar una longitud mínima de contraseña de 8 caracteres o más. Si se aumenta, el servidor mostrará el rechazo de Auth aunque el formulario admita 8.
7. En el panel actual del proyecto, **Authentication → Emails** exige configurar **Custom SMTP** antes de editar las plantillas. En la pestaña **SMTP Settings**, conectar un proveedor SMTP y establecer **Sender name** en `La Higuera` y **Sender email** en una dirección propia verificada (por ejemplo, `hola@tu-dominio.com`), además de host, puerto y credenciales del proveedor. El dominio de envío deberá tener los registros DNS que solicite ese proveedor. No guardar credenciales SMTP en este repositorio ni pegarlas en el chat. El correo predeterminado de Supabase tiene restricciones de destinatarios y envío; para registros públicos se necesita un proveedor SMTP propio.
8. Una vez activo SMTP, abrir **Authentication → Emails → Templates → Confirm sign up**. Poner como asunto `Confirmá tu correo | La Higuera` y pegar el contenido de [`supabase/templates/confirm-signup.html`](supabase/templates/confirm-signup.html) en el cuerpo HTML. Guardar los cambios en el panel: el archivo del repositorio no se sincroniza automáticamente. La plantilla enlaza a `/auth/confirm` con `token_hash`, para permitir confirmar incluso desde otro dispositivo. También se admite el callback PKCE con `?code=...` cuando el enlace se abre en el mismo navegador que inició el registro. No se acepta un destino de redirección enviado por el navegador. En producción, actualizar Site URL y los destinos permitidos con la URL HTTPS real antes de probar el enlace de confirmación.
9. La migración crea el bucket **privado** `product-images`, con un máximo de 5 MB y MIME `image/webp`. No hacerlo público ni agregar políticas permisivas. El servidor acepta JPG, PNG y WebP y los decodifica y convierte a WebP antes de subirlos.

### Migraciones con Supabase CLI (alternativa)

Con la CLI oficial disponible, **en lugar de aplicar el SQL en el Editor**:

```powershell
npx.cmd supabase init
npx.cmd supabase login
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push
```

`init` agrega la configuración local; no reemplaza las migraciones existentes. No ejecutar `db reset` contra un proyecto con datos que deban conservarse. Para desarrollo local, iniciar Docker Desktop, ejecutar `npx.cmd supabase start` y después `npx.cmd supabase db reset`. Usar las URL/claves locales resultantes en `.env.local`. La instalación local y la remota son alternativas.

## Funcionalidad

- Inicio público con búsqueda literal por título, categorías y páginas de 12 resultados, ordenados por fecha e identificador.
- Detalle de anuncio con imagen, precio en ARS/USD, condición, localidad y nombre público del vendedor.
- Registro, confirmación de correo, ingreso y cierre de sesión.
- Perfil propio: consulta y edición de nombre/localidad; correo privado de Auth.
- Anuncios propios: alta, consulta, edición, eliminación confirmada y estados activo/pausado/vendido.
- Una imagen opcional por anuncio, reemplazo y eliminación. Placeholder si no existe o falla la carga.
- Eliminación de cuenta con confirmación escrita y eliminación real del usuario de Auth.
- `businesses` en SQL, con varios comercios por propietario y sin pantallas de gestión en esta etapa.
- Interfaz adaptable en español de Argentina, estados de carga/error/vacío y confirmaciones accesibles con Radix.
- Identidad visual en azul intenso, celeste y blanco, logo vectorial y buscador global con categorías debajo.
- Carrusel de tres mensajes en el inicio, sin descuentos ficticios. Cambia cada 6 segundos, tiene controles manuales y pausa, y respeta la preferencia de movimiento reducido del dispositivo.

## Organización y seguridad

```text
src/app/                  Rutas App Router y composición de páginas
src/components/           Interfaz compartida; ui/ contiene componentes shadcn/ui
src/modules/users/        Sesión, validaciones, acciones y formularios de cuentas/perfil
src/modules/products/     Validaciones, consultas, acciones, formularios e imágenes
src/lib/supabase/          Clientes de servidor y administrativo separados
supabase/migrations/      Esquema, integridad, funciones y RLS versionados
tests/                    Validaciones, PostgreSQL local y recorridos Playwright
scripts/                  Pruebas Supabase reales y limpieza de Storage
```

Las operaciones ordinarias usan el cliente de la sesión y RLS. `getUser()` verifica la sesión contra Auth en el servidor; el proxy mantiene sus cookies con `getClaims()`. El servidor obtiene el propietario de la sesión. En edición/eliminación también filtra por propietario. No hay cliente administrativo en el navegador.

Los visitantes solo leen anuncios activos. Los propietarios ven también los pausados y vendidos. `profiles` solo es consultable por su dueño; la función `product_seller(product_id)` devuelve únicamente el nombre del vendedor de un anuncio visible. No hay correo de Auth en las tablas públicas ni en la respuesta de esa función. Los identificadores UUID de propietario forman parte del anuncio, pero no permiten consultar el perfil ajeno.

Los permisos por columna impiden cambiar `owner_id` o el identificador de un registro. Una FK compuesta `(business_id, owner_id)` garantiza que el comercio pertenezca al dueño del anuncio. Las restricciones SQL repiten las validaciones relevantes del servidor. El alta de Auth crea el perfil con un trigger en la misma transacción.

Las imágenes se sirven por `/api/images/...`, pasando por RLS, con `private, no-store`. No se usa la caché compartida de Next Image ni se generan URLs públicas o firmadas. El servidor valida tamaño, MIME y decodificación real, limita a 20 megapíxeles, rechaza animaciones, elimina metadatos y convierte a WebP de hasta 1600 px. Storage impide sobrescrituras y accesos a carpetas de otro usuario. Los formularios conservan los campos de texto ante errores; por restricciones del navegador los archivos deben seleccionarse nuevamente.

### Limpieza de imágenes y fallas parciales

Storage y PostgreSQL son servicios separados: **no existe una transacción distribuida entre ambos**. La app usa reservas y una cola durable para evitar declarar una atomicidad inexistente:

1. Reserva una ruta nueva en `storage_cleanup` antes de cargar.
2. Sube la imagen validada y guarda el anuncio. En la misma transacción SQL se consume la reserva y se encola la imagen anterior.
3. Intenta borrar los archivos pendientes. Si Storage falla, conserva la tarea y muestra una advertencia; las siguientes operaciones del usuario reintentan la limpieza.
4. Si falla el guardado, marca la carga nueva para eliminación. Las reservas abandonadas por interrupciones quedan recuperables tras 24 horas. El anuncio original no se modifica si el guardado falla.
5. Las ediciones usan `updated_at` como control de concurrencia: una pestaña desactualizada no pisa cambios de otra.

Ejecutar periódicamente o tras una falla de Storage:

```powershell
npm.cmd run storage:cleanup
```

El script procesa tareas listas y reservas de más de 24 horas, verifica que el archivo no esté asociado y conserva las tareas fallidas para reintentar. Las reservas vencidas no se pueden asociar a productos. La tabla de limpieza tiene RLS y no contiene información pública. No hay una automatización externa creada por esta entrega.

Para eliminar una cuenta, el servidor deriva la identidad de la sesión, marca la cuenta para bloquear escrituras nuevas, elimina sus archivos y llama a `auth.admin.deleteUser`. La cascada de PostgreSQL elimina perfil, comercios y productos de forma atómica. Storage exige borrar antes los objetos de ese usuario. Si falla algún paso, el perfil permite reintentar la eliminación; la cuenta puede quedar bloqueada para nuevas escrituras y con imágenes ya eliminadas. La eliminación de archivos no puede revertirse. Nunca se acepta un `user_id` del formulario para esta operación.

## Verificación

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

- `npm.cmd test`: validaciones, contenido real de imágenes y migración completa en PostgreSQL embebido (PGlite), con dos identidades y roles RLS. Las tablas mínimas de Auth/Storage son fixtures; **no sustituye una prueba del servicio Supabase**.
- Playwright: navegación pública, búsqueda, filtros, protección de rutas y adaptación móvil/escritorio. El recorrido real de CRUD se omite explícitamente si faltan las credenciales de prueba.
- Si ya hay un servidor local ejecutándose, se puede reutilizar en PowerShell con `$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'` antes de `npm.cmd run test:e2e`, evitando iniciar otra instancia de Next.js.
- Para probar contra un **proyecto Supabase de prueba** con la migración aplicada, configurar las tres claves y `ALLOW_INTEGRATION_TESTS=true` en `.env.local`, luego:

  ```powershell
  npm.cmd run test:integration
  npm.cmd run test:e2e
  ```

El script de integración crea dos usuarios temporales confirmados y verifica persistencia con una sesión nueva, CRUD, privacidad de perfiles, estados, intentos de cambiar dueño o comercio, Storage privado y borrado de Auth/cascadas. Limpia sus propios usuarios temporales al finalizar. Playwright entra con dos sesiones independientes, crea un anuncio con imagen, recarga, edita el perfil, pausa, verifica denegaciones al segundo usuario y elimina la cuenta mediante el formulario y la acción real del servidor.

El envío/recepción de correo debe comprobarse manualmente con una dirección real: registrar, abrir la confirmación, ingresar, salir y volver a entrar. Las pruebas automatizadas usan cuentas confirmadas por el administrador y no afirman probar la entrega de correo.

### Estado de esta entrega

Sin credenciales Supabase en el entorno de implementación. La compilación, los tipos, el lint, las pruebas de PostgreSQL local y la navegación pública pueden verificarse sin esas claves. La persistencia y el CRUD contra Supabase alojado, la entrega de correos y los recorridos autenticados necesitan la configuración anterior; no se consideran verificados hasta ejecutarlos. Consultar `VERIFICATION.md` para los resultados efectivamente obtenidos.

## Despliegue posterior en Vercel

Importar este repositorio como proyecto Next.js, usar Node 22, configurar las variables de `.env.example` en Vercel y ejecutar el build estándar `npm.cmd run build` desde PowerShell. Ajustar `NEXT_PUBLIC_SITE_URL`, Site URL, redirects y SMTP de Supabase. No establecer `ALLOW_INTEGRATION_TESTS=true` en producción. Las migraciones se aplican por separado; el build no altera la base. Esta entrega no publica ni despliega el sitio.

## Documentación oficial de referencia

- [Next.js: instalación y App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase: clientes SSR y cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: usuarios, perfiles y eliminación](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase: control de acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [shadcn/ui: instalación manual](https://ui.shadcn.com/docs/installation/manual)

Fuera de alcance: gestión visual de comercios, stock, catálogo universal, chat, reputación, pagos, envíos, campañas y scraping.
