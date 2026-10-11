# Casos de uso pendientes

Este documento define lo que falta construir en La Higuera después de la versión 0.3.0, las fotos de servicios y las etapas 1 a 3 del rediseño. Sirve para repartir el trabajo entre dos personas, por módulos completos (migración, API y pantalla).

Lo que ya funciona no se repite acá: está en el [README](../README.md) y en el [CHANGELOG](../CHANGELOG.md). Las pantallas de referencia son las de [`docs/rediseno/pantallas/`](rediseno/pantallas/).

## Índice

1. [Decisiones tomadas](#1-decisiones-tomadas)
2. [Decisiones abiertas](#2-decisiones-abiertas)
3. [Actores](#3-actores)
4. [Reparto y orden de trabajo](#4-reparto-y-orden-de-trabajo)
5. [Casos de uso funcionales](#5-casos-de-uso-funcionales)
6. [Requisitos no funcionales](#6-requisitos-no-funcionales)
7. [Trazabilidad](#7-trazabilidad)

---

## 1. Decisiones tomadas

| # | Decisión |
|---|---|
| D1 | Somos dos y nos repartimos el trabajo por **módulo vertical**: cada persona hace la migración, los endpoints y las pantallas de su módulo. |
| D2 | La administración tiene **panel web** propio. El SQL Editor queda solo para dar de alta administradores. |
| D3 | Hay un **perfil público de vendedor particular**, con sus anuncios y sus reseñas, y se puede denunciar. |
| D4 | Los **avisos por correo** entran en este alcance y se envían con un proveedor transaccional. |
| D5 | Si una pantalla y la base no coinciden, **gana la pantalla**, como dice el HANDOFF: el largo de la reseña, los motivos de denuncia y los campos del comercio se ajustan en la base. |
| D6 | Las denuncias exigen sesión. Si se confirma el problema, la publicación se **oculta** (`hidden = true`) y se le avisa por correo a quien denunció. |

## 2. Decisiones abiertas

Hay que cerrarlas antes de empezar el caso de uso que cada una bloquea.

| # | Pregunta | Propuesta | Bloquea |
|---|---|---|---|
| A1 | ¿Qué proveedor de correo usamos? | El mismo para el SMTP de Auth y para los avisos (Resend o Brevo: los dos ofrecen SMTP y API). | CU-60 a CU-63 |
| A2 | ¿Dónde corren las tareas programadas: avisos de vencimiento y limpieza de Storage? | Un workflow programado de GitHub Actions que llama a un script del backend. No suma infraestructura. | CU-62, CU-81 |
| A3 | ¿Cómo se ubica la zona aproximada de un inmueble? | Con el centro del departamento: se agregan `lat` y `lng` a `localities`. No se pide ni se guarda la dirección del inmueble. | CU-72 |
| A4 | ¿Cómo se geocodifica la dirección de un comercio? | Con Nominatim (OpenStreetMap), respetando su política de uso: una consulta por segundo y User-Agent propio. El dueño puede mover el pin a mano. | CU-10 |
| A5 | ¿Qué hace falta para reseñar a un vendedor particular? | Lo mismo que para el resto: cuenta confirmada, una reseña por autor y vendedor, y no reseñarse a uno mismo. Se revisa si aparece abuso. | CU-20 |
| A6 | ¿Guardamos qué administrador hizo cada acción? | Sí: agregar `reviewed_by` a las tablas que modifican las funciones `admin_*`. | CU-51 a CU-55 |
| A7 | ¿Las imágenes de contenido público se cachean? | Las de publicaciones visibles, sí: `public, max-age`. Las demás siguen con `private, no-store`. Hace falta para RNF-04 y RNF-05. | RNF-04, RNF-05 |

## 3. Actores

| Actor | Quién es |
|---|---|
| **Visitante** | Cualquier persona sin sesión. |
| **Usuario** | Persona con cuenta y sesión iniciada. |
| **Usuario confirmado** | Usuario con el correo o el teléfono confirmado. Es la condición para reseñar (`private.review_rules`). |
| **Vendedor** | Usuario con al menos un anuncio. Su perfil público es `profiles`. |
| **Trabajador** | Usuario que ofrece un servicio (`service_providers`). |
| **Dueño de comercio** | Usuario con un comercio cargado (`businesses`, uno por cuenta). |
| **Reseñado** | Vendedor, trabajador o dueño de comercio que recibió una reseña. |
| **Administrador** | Usuario incluido en `private.admins`, que pasa `public.is_admin()`. |
| **Sistema** | Tareas automáticas: avisos por correo, vencimientos y limpieza. |

## 4. Reparto y orden de trabajo

### Módulos

| Módulo | Casos de uso | Responsable |
|---|---|---|
| M1. Cuenta | CU-01, CU-02, CU-03 | A |
| M2. Comercios y mapa | CU-10 a CU-15, CU-72 | A |
| M3. Notificaciones y tareas programadas | CU-60, CU-62, CU-63, CU-81 | A |
| M4. Reseñas | CU-20 a CU-23 | B |
| M5. Denuncias | CU-30, CU-31, CU-61 | B |
| M6. Perfil de vendedor y búsqueda | CU-70, CU-71 | B |
| M7. Referencias de servicios | CU-40 | B |
| M8. Administración | CU-50 a CU-55 | B |
| M9. Operación | CU-80, CU-82, CU-83 | Los dos |

A tiene menos casos de uso, pero más pesados: el mapa, la geocodificación, el logo y la infraestructura de correo. B tiene más casos de uso, de complejidad media. Si en la mitad del trabajo uno queda muy cargado, CU-70 y CU-63 son fáciles de pasar al otro.

### Contratos compartidos

Cada uno construye algo que el otro usa. Se acuerdan en el hito 0 y no se cambian sin avisar.

| Lo hace | Lo usa | Qué es |
|---|---|---|
| A | B | Módulo `backend/app/notify.py` con `send(template, to, data)`. Si el correo falla, registra el error y no hace fallar la operación que lo llamó. |
| A | B | `GET /api/businesses/{id}` y la página `/locales/[slug]`, donde B integra las reseñas y el botón de denuncia. |
| B | A | Componente `<ReviewsSection target={...} />`: resumen, barras por estrella, lista, respuesta y botón para dejar una reseña. |
| B | A | Componente `<ReportButton kind="..." id="..." />`, que resuelve también el caso sin sesión. |
| B | A | Ruta `/admin/comercios`, que lista lo que genera CU-10. |

### Hitos

| Hito | Contenido | Criterio de salida |
|---|---|---|
| **0. Base común** (los dos) | CU-83 verificado contra un Supabase de pruebas, CU-80 (seed), A1, A2 y A6 resueltas, contratos acordados. | `scripts.integration` y `crud.spec.ts` aprobados contra Supabase real. |
| **1. Datos** | Migraciones de M2 (A), M4, M5 y M8 (B). | `make check` en verde con PGlite cargando las migraciones nuevas. |
| **2. API** | Endpoints de cada módulo, con pytest. | Endpoints documentados en `docs/ARCHITECTURE.md`. |
| **3. Pantallas** | Pantallas del rediseño de cada módulo. | Comparadas con el canvas, en escritorio y en mobile. |
| **4. Integración** | Reseñas y denuncias integradas en locales, perfiles y servicios. Correos activos. | Recorrido e2e completo: alta de comercio → aprobación → reseña → denuncia → resolución. |
| **5. Salida** | CU-82 y los RNF pendientes. | Sitio desplegado con dominio, SMTP y backups. |

### Reglas para no pisarnos

- **Migraciones:** un archivo por módulo, con prefijo de fecha y hora (`AAAAMMDDHHMM_modulo.sql`). Antes de crear una, hacer `git pull` de `main`. El que mergea segundo renombra la suya si hace falta para que el orden sea correcto.
- **Lista de migraciones de las pruebas:** `frontend/tests/database.test.ts` tiene la lista escrita a mano y los dos la van a tocar. Conviene cambiarla en el hito 0 para que lea la carpeta ordenada.
- **Ramas:** `feat/<módulo>`, con PR a `main` y revisión del otro.
- **Documentación:** quien mergea actualiza `CHANGELOG.md` y la tabla de endpoints de `docs/ARCHITECTURE.md`.

---

## 5. Casos de uso funcionales

Formato de cada caso de uso: actor, precondiciones, flujo principal, flujos alternativos, postcondiciones, reglas, lo que toca en cada capa, criterios de aceptación y dependencias.

En **Toca**, **DB** marca si la base ya tiene lo necesario (✅), si lo tiene a medias (◐) o si falta (✗).

### M1. Cuenta

#### CU-01 Recuperar contraseña

- **Actor:** Visitante.
- **Precondiciones:** Tiene una cuenta con correo.
- **Flujo principal:**
  1. En *Ingresar* elige "¿Olvidaste tu contraseña?".
  2. Escribe su correo y envía.
  3. El sistema muestra siempre el mismo mensaje: "Si el correo está registrado, te mandamos un enlace".
  4. Abre el enlace del correo y llega a *Nueva contraseña*.
  5. Escribe la nueva contraseña dos veces (mínimo 8 caracteres) y guarda.
  6. Queda con la sesión iniciada y va al inicio, con el aviso "Actualizamos tu contraseña".
- **Alternativos:**
  - 3a. El correo no existe: se muestra el mismo mensaje, para no revelar qué correos están registrados.
  - 4a. El enlace venció o ya se usó: aparece "El enlace venció" con un botón para pedir otro.
  - 5a. Las contraseñas no coinciden o son cortas: error en el campo y el formulario conserva lo escrito.
- **Postcondiciones:** La contraseña cambió y las otras sesiones siguen el comportamiento de Supabase Auth.
- **Reglas:** El correo de recuperación usa una plantilla propia en `database/templates/recovery.html`, con el mismo estilo que la de confirmación.
- **Toca:**
  - DB: — (lo resuelve Supabase Auth).
  - API: —.
  - Front: `/recuperar`, `/nueva-contrasena` y el tipo `recovery` en `auth/confirm/route.ts`.
  - Pantalla: no está en el canvas; seguir el patrón de `Ingresar`.
- **Aceptación:** Un e2e con Supabase real recorre pedir el enlace, cambiar la contraseña e ingresar con la nueva.
- **Depende de:** A1 (SMTP).

#### CU-02 Reenviar el correo de confirmación

- **Actor:** Usuario sin confirmar.
- **Precondiciones:** Se registró y no confirmó el correo.
- **Flujo principal:**
  1. Intenta una acción que exige cuenta confirmada (CU-20) o ingresa y ve el aviso de cuenta sin confirmar.
  2. Elige "Reenviar el enlace".
  3. El sistema reenvía el correo y muestra la dirección enmascarada (`c•••@correo.com`).
- **Alternativos:**
  - 2a. Lo pide de nuevo antes de 60 segundos: el botón queda deshabilitado con una cuenta regresiva.
- **Postcondiciones:** Recibe un correo de confirmación nuevo.
- **Toca:**
  - Front: diálogo `ResenaSinConfirmar` / `DejarResena` en estado bloqueado, y aviso en *Mi perfil*.
- **Aceptación:** El botón respeta la espera y el correo llega.
- **Depende de:** A1.

#### CU-03 Cambiar el correo o la contraseña

- **Actor:** Usuario.
- **Flujo principal:**
  1. En *Mi perfil*, sección "Acceso", elige cambiar la contraseña o el correo.
  2. Para la contraseña: escribe la actual y la nueva dos veces.
  3. Para el correo: escribe el nuevo, el sistema manda un enlace de confirmación y el cambio se aplica al confirmarlo.
- **Alternativos:**
  - 2a. La contraseña actual es incorrecta: se muestra un error.
  - 3a. El correo ya está en uso: se muestra un mensaje genérico.
- **Postcondiciones:** Las credenciales quedan actualizadas. El correo de acceso sigue siendo privado.
- **Toca:**
  - Front: `mi-perfil` y `profile-form.tsx`, más el tipo `email_change` en `auth/confirm`.
- **Aceptación:** Con cualquiera de los dos cambios se puede volver a ingresar.
- **Depende de:** A1.

### M2. Comercios y mapa

> **Migración M2.** Agregar a `businesses`: `category_id` (rubro principal), `lat`, `lng`, `hours` (jsonb con tres franjas: lunes a viernes, sábados, domingos y feriados), `logo_path` y `products.business_id` habilitado para el dueño. Agregar `lat` y `lng` a `localities`, para A3. Ampliar las políticas de Storage para el logo y sumar `businesses_feed` por rubro.

#### CU-10 Solicitar el alta de un comercio

- **Actor:** Usuario confirmado.
- **Precondiciones:** No tiene un comercio (`businesses_one_per_account`).
- **Flujo principal:**
  1. Desde la pestaña *Locales* o desde el menú de cuenta elige "Sumá tu comercio".
  2. Completa:
     - nombre comercial, rubro principal, qué vende y logo (opcional, cuadrado);
     - CUIT y razón social;
     - dirección y departamento;
     - horarios;
     - teléfono o WhatsApp, y correo (opcional).
  3. El sistema geocodifica la dirección y pone el pin en el mapa.
  4. Ajusta el pin si no quedó en la puerta del local.
  5. Envía la solicitud.
  6. El sistema crea `businesses` (sin verificar) y `business_verifications` (`pendiente`) y muestra *SolicitudRevision* en estado "en revisión".
  7. Los administradores reciben un aviso (CU-63).
- **Alternativos:**
  - 2a. El CUIT es inválido según `cuit_is_valid`: error en el campo.
  - 2b. El CUIT ya está en un trámite vigente: "Este CUIT ya tiene una solicitud. Si es tuyo, escribinos".
  - 3a. La dirección no se encuentra: el pin se pone en el centro del departamento y se pide ubicarlo a mano.
  - 2c. El logo no es una imagen válida o es demasiado grande: mismo tratamiento que las fotos de anuncios.
- **Postcondiciones:** Hay un comercio no público y una verificación pendiente.
- **Reglas:**
  - El CUIT y la razón social nunca se publican.
  - Dirección, departamento y un contacto son obligatorios (`business_verification_rules`).
  - El slug sale del nombre y se le agrega un sufijo si ya existe.
- **Toca:**
  - DB: ◐ (falta la migración M2).
  - API: `POST /api/businesses` (multipart) y `GET /api/geocode?q=`.
  - Front: `/locales/nuevo`.
  - Pantalla: `AltaComercio`, `SolicitudRevision`.
- **Aceptación:**
  - Con dos cuentas: una crea su comercio y la otra no lo ve hasta que se apruebe.
  - El CUIT nunca aparece en respuestas de la API para otros usuarios.
- **Depende de:** migración M2, A4, CU-60 y CU-63.

#### CU-11 Ver el estado de la solicitud y corregirla

- **Actor:** Dueño de comercio.
- **Flujo principal:**
  1. Entra a *Mi comercio* con la solicitud pendiente y ve *SolicitudRevision* con los pasos y la fecha de envío.
  2. Si fue rechazada, ve el motivo (`note`) y elige "Corregir la solicitud".
  3. Edita los datos y vuelve a enviar.
  4. La verificación vuelve a `pendiente` (lo hace el trigger).
- **Alternativos:**
  - 1a. Ya está verificado: va directo al panel (CU-12).
- **Postcondiciones:** La solicitud corregida vuelve a la cola de revisión.
- **Toca:**
  - DB: ✅.
  - API: `GET /api/businesses/mine` y `PUT /api/businesses/{id}`.
  - Front: `/mi-comercio`.
- **Aceptación:** Cambiar el CUIT o la razón social de un comercio verificado lo saca de la verificación.

#### CU-12 Gestionar mi comercio

- **Actor:** Dueño de comercio verificado.
- **Flujo principal:**
  1. Entra a *Mi comercio* (`PanelComercio`).
  2. Ve:
     - los anuncios del local con su estado (activos, pausados y vencidos), con acciones para editar o renovar;
     - las reseñas sin responder, donde puede responder (CU-22);
     - los datos del local: dirección, horarios y el CUIT, visible solo para él.
  3. Elige "Editar datos del local" y cambia horarios, contacto, descripción, logo o ubicación.
- **Alternativos:**
  - 3a. Cambia el CUIT o la razón social: el sistema avisa que el comercio vuelve a revisión antes de guardar.
- **Postcondiciones:** Los datos públicos del local quedan actualizados.
- **Toca:**
  - API: `PUT /api/businesses/{id}`, con control de versión igual que los anuncios.
  - Front: `/mi-comercio`.
  - Pantalla: `PanelComercio`.
- **Aceptación:** Una pestaña desactualizada recibe un 409 y no pisa cambios.

#### CU-13 Publicar un anuncio como comercio

- **Actor:** Dueño de comercio verificado.
- **Flujo principal:**
  1. En *Publicar*, si tiene un comercio verificado, ve el selector "Publicar como: yo / {comercio}".
  2. Elige el comercio y publica.
  3. El anuncio muestra "Publicado por {comercio}" con la insignia y aparece en el perfil del local.
- **Alternativos:**
  - 1a. El comercio no está verificado: no aparece el selector.
  - 3a. El comercio pierde la verificación: sus anuncios se siguen viendo como de la persona.
- **Toca:**
  - DB: ✅ (`products.business_id` con FK compuesta).
  - API: `POST` y `PUT /api/products` aceptan `business_id`.
  - Front: `product-form.tsx`, `/productos/[id]`.
  - Pantalla: `DetalleInmueble` ("Publicado por … Comercio verificado").
- **Aceptación:** No se puede asignar un anuncio a un comercio ajeno (lo impide la FK `(business_id, owner_id)`).

#### CU-14 Explorar el directorio de locales

- **Actor:** Visitante.
- **Flujo principal:**
  1. Elige la pestaña *Locales* en el header.
  2. Ve el mapa de Gran San Juan con un pin por local verificado y, al lado, la lista ordenada por reseñas.
  3. Filtra por rubro con los chips.
  4. Selecciona un local en la lista o en el mapa: los dos se resaltan.
  5. Entra al perfil del local (CU-15).
- **Alternativos:**
  - 2a. No hay locales en ese rubro: estado vacío con un higo.
  - 2b. En mobile: lista primero y botón "Ver mapa" (`LocalesMobile`).
  - 2c. El mapa no carga: la lista sigue siendo usable.
- **Reglas:** Solo se ven locales verificados y no ocultos (RLS `businesses_read`).
- **Toca:**
  - DB: ✅ (`businesses_feed`).
  - API: `GET /api/businesses?category&page`.
  - Front: `/locales`, componente de mapa (Leaflet o MapLibre con OpenStreetMap) cargado en diferido.
  - Pantalla: `Locales`, `LocalesMobile`, `MapaSJ`.
- **Aceptación:**
  - La lista se recorre con teclado y es la alternativa accesible al mapa (RNF-03).
  - El mapa no se carga en las páginas que no lo usan.

#### CU-15 Ver el perfil público de un local

- **Actor:** Visitante.
- **Flujo principal:**
  1. Entra a `/locales/[slug]`.
  2. Ve logo, insignia, rubro, puntaje, descripción, contacto (WhatsApp, teléfono y correo), dirección, horarios con "Abierto ahora" o "Cerrado", el mapa con su pin y "Cómo llegar" (enlace a OpenStreetMap o Google Maps).
  3. Ve los anuncios activos del local, con "Ver los N anuncios".
  4. Ve las reseñas (CU-23) y puede dejar una (CU-20) o denunciar el comercio (CU-30).
- **Alternativos:**
  - 1a. El local no existe, no está verificado o está oculto: 404.
- **Reglas:** "Abierto ahora" se calcula con la hora de Argentina (UTC−3).
- **Toca:**
  - API: `GET /api/businesses/{slug}` y `GET /api/products?business=`.
  - Front: `/locales/[slug]`.
  - Pantalla: `PerfilLocal`.
- **Aceptación:** El CUIT y la razón social no aparecen en el HTML ni en la respuesta de la API.
- **Depende de:** `<ReviewsSection>` y `<ReportButton>` (B).

#### CU-72 Ver la zona aproximada de un inmueble

- **Actor:** Visitante.
- **Flujo principal:**
  1. Abre un anuncio del rubro Inmuebles.
  2. Ve el bloque "Ubicación aproximada" con un mapa y un círculo sobre el departamento, y el texto "Mostramos la zona, no la dirección exacta".
- **Reglas:** Nunca se guarda ni se muestra la dirección del inmueble. La zona sale de `localities.lat/lng` (A3).
- **Toca:**
  - DB: ✗ (coordenadas en `localities`).
  - Front: `/productos/[id]`.
  - Pantalla: `DetalleInmueble`, `MapaSJ` en modo `zona`.
- **Aceptación:** El bloque solo aparece en Inmuebles.
- **Depende de:** A3.

### M3. Notificaciones y tareas programadas

#### CU-60 Avisar el resultado de la verificación de un comercio

- **Actor:** Sistema.
- **Disparador:** Un administrador aprueba o rechaza un comercio (CU-52).
- **Flujo principal:**
  1. La API, después de `admin_review_business`, llama a `notify.send("business_reviewed", ...)`.
  2. El dueño recibe un correo:
     - si fue aprobado: "Tu local ya aparece en La Higuera", con el enlace al perfil;
     - si fue rechazado: el motivo, con el enlace para corregir la solicitud.
- **Alternativos:**
  - 1a. El proveedor falla: queda registrado en el log y la aprobación se mantiene.
- **Reglas:** El correo del dueño se lee de Auth con la clave de servicio, solo en el backend.
- **Toca:**
  - API: `app/notify.py` y plantillas en `backend/app/templates/email/`.
- **Aceptación:** Hay pruebas con un proveedor simulado y una prueba manual con el proveedor real.
- **Depende de:** A1.

#### CU-62 Avisar que un anuncio está por vencer

- **Actor:** Sistema.
- **Disparador:** La tarea programada diaria (A2).
- **Flujo principal:**
  1. Busca los anuncios activos que vencen en los próximos 5 días y que todavía no tuvieron este aviso.
  2. Envía un correo a cada dueño con su lista y el enlace a *Mis anuncios* para renovar.
  3. Marca como avisados esos anuncios.
- **Alternativos:**
  - 2a. Un dueño tiene varios anuncios por vencer: recibe un solo correo.
- **Toca:**
  - DB: ✗ (columna `expiry_notified_at` que se reinicia al renovar).
  - API: `scripts/notify_expiring.py`.
  - CI: workflow programado.
- **Aceptación:** Corriendo la tarea dos veces seguidas no se manda el aviso dos veces.
- **Depende de:** A1 y A2.

#### CU-63 Avisar a la administración que hay trabajo pendiente

- **Actor:** Sistema.
- **Disparador:** Llega una solicitud de comercio nueva o una denuncia.
- **Flujo principal:** Los administradores reciben un correo de resumen como máximo una vez por hora, con la cantidad de pendientes y el enlace a `/admin`.
- **Toca:**
  - API: `notify.py` y la tarea programada.
- **Aceptación:** Diez denuncias en una hora generan un solo correo.
- **Depende de:** A1 y A2.

#### CU-81 Limpiar Storage en forma programada

- **Actor:** Sistema.
- **Disparador:** La tarea programada diaria (A2).
- **Flujo principal:** Corre `python -m scripts.cleanup`, borra los archivos pendientes y las reservas abandonadas, y registra cuántos procesó.
- **Alternativos:**
  - 1a. Falla: el workflow queda en rojo y avisa por correo a quien lo mantiene.
- **Toca:**
  - CI: `.github/workflows/maintenance.yml`, con los secretos en GitHub.
- **Aceptación:** Hay una corrida exitosa en el historial de Actions.

### M4. Reseñas

> **Migración M4.** Pasar el `check` de `comment` a 20–1000 caracteres (lo pide el diseño), con texto obligatorio. Nada más: tabla, reglas, puntaje y respuesta ya existen.

#### CU-20 Dejar una reseña

- **Actor:** Usuario confirmado.
- **Precondiciones:** El destino es un servicio, un comercio verificado o un vendedor, y no es suyo.
- **Flujo principal:**
  1. En el perfil del destino elige "Dejar una reseña".
  2. Elige de 1 a 5 estrellas (con etiqueta: "4 de 5: Muy bueno") y escribe entre 20 y 1.000 caracteres.
  3. Publica.
  4. La reseña aparece primero en la lista y el puntaje del destino se recalcula (trigger `review_ratings`).
- **Alternativos:**
  - 1a. Sin sesión: va a *Ingresar* y vuelve al perfil.
  - 1b. Cuenta sin confirmar: estado bloqueado de `DejarResena`, que ofrece CU-02.
  - 1c. Ya reseñó ese destino: el botón cambia a "Editar tu reseña" (CU-21).
  - 1d. Es su propio perfil, servicio o comercio: no se muestra el botón.
  - 2a. El texto tiene un teléfono o un correo: se avisa "No incluyas teléfonos ni direcciones" y no se publica.
- **Postcondiciones:** La reseña es pública con el nombre del autor y el puntaje está actualizado.
- **Reglas:** Una reseña por autor y destino, y no se puede reseñar uno mismo (lo controla la base).
- **Toca:**
  - DB: ◐ (largo del texto).
  - API: `POST /api/reviews` con `{target_kind, target_id, rating, comment}`.
  - Front: `<ReviewsSection>` y el diálogo para dejar la reseña.
  - Pantalla: `DejarResena`, `ResenaSinConfirmar`.
- **Aceptación:**
  - PGlite: una cuenta sin confirmar no puede insertar; reseñarse a uno mismo falla.
  - e2e: se deja una reseña y el puntaje cambia.
- **Depende de:** CU-02.

#### CU-21 Editar o eliminar mi reseña

- **Actor:** Autor de la reseña.
- **Flujo principal:**
  1. En su reseña elige "Editar" o "Eliminar".
  2. Si edita, cambia las estrellas o el texto y guarda; la reseña muestra "Editada".
  3. Si elimina, confirma y la reseña desaparece; el puntaje se recalcula.
- **Alternativos:**
  - 2a. La reseña ya tiene respuesta: se avisa que la respuesta va a seguir visible debajo del texto nuevo.
- **Toca:**
  - API: `PUT` y `DELETE /api/reviews/{id}`.
  - Front: `<ReviewsSection>`, `DeleteDialog` con `item="reseña"`.
- **Aceptación:** Nadie más que el autor puede editar o eliminar la reseña (RLS).

#### CU-22 Responder una reseña recibida

- **Actor:** Reseñado.
- **Flujo principal:**
  1. En su perfil o en *Mi comercio* ve "Reseñas sin responder".
  2. Escribe la respuesta (de 1 a 1.000 caracteres) y publica.
  3. La respuesta aparece debajo de la reseña como "Respuesta de {nombre}".
- **Alternativos:**
  - 2a. Edita la respuesta.
  - 2b. Vacía el texto: la respuesta se borra (`reply_review`).
- **Toca:**
  - DB: ✅ (`reply_review`).
  - API: `PUT /api/reviews/{id}/reply`.
  - Front: `<ReviewsSection>` en modo dueño, `PanelComercio`, *Mis servicios* y el perfil de vendedor.
- **Aceptación:** Un tercero recibe 403 o 404 al intentar responder.

#### CU-23 Ver reseñas y el puntaje

- **Actor:** Visitante.
- **Flujo principal:**
  1. En el perfil de un servicio, un comercio o un vendedor ve el promedio, la cantidad y la distribución por estrellas.
  2. Ve las 3 reseñas más recientes y "Ver las N reseñas", que pagina.
  3. En cada reseña ve iniciales, nombre, fecha relativa, estrellas, texto, respuesta y "Denunciar reseña".
- **Alternativos:**
  - 1a. No tiene reseñas: "Todavía no tiene reseñas" y el botón para dejar la primera.
- **Reglas:** Las reseñas ocultas no se muestran ni cuentan para el puntaje.
- **Toca:**
  - API: `GET /api/reviews?target_kind&target_id&page`, que incluye la distribución.
  - Pantalla: `Resenas`.
- **Aceptación:** Las barras suman el total que se muestra.

### M5. Denuncias

> **Migración M5.** Agregar `profile_id` como destino posible de `reports` (con su `unique` y su índice). Reemplazar el `check` de `reason` por códigos que dependen del tipo de destino:
>
> | Tipo | Motivos |
> |---|---|
> | Anuncio | `estafa`, `prohibido`, `datos_falsos`, `no_disponible`, `duplicado`, `otro` |
> | Reseña | `no_es_cliente`, `ofensiva`, `otro_destino`, `otro` |
> | Perfil, servicio o comercio | `suplantacion`, `datos_falsos`, `incumplimiento`, `otro` |
>
> Validar en la base que el motivo corresponda al tipo. El texto visible de cada motivo es el de la pantalla `Denunciar`.

#### CU-30 Denunciar una publicación, una reseña o un perfil

- **Actor:** Usuario.
- **Precondiciones:** La publicación existe y no es suya.
- **Flujo principal:**
  1. Elige "Denunciar este anuncio", "este comercio", "este perfil" o "esta reseña".
  2. Ve el título y de quién es lo que denuncia, y elige un motivo de la lista de ese tipo.
  3. Opcionalmente escribe un detalle (hasta 1.000 caracteres).
  4. Envía.
  5. Ve *DenunciaEnviada*: "Recibimos tu denuncia…".
  6. Los administradores reciben un aviso (CU-63).
- **Alternativos:**
  - 1a. Sin sesión: ve *DenunciaSinSesion* (Crear cuenta / Ingresar) y después de ingresar vuelve a la publicación con el diálogo abierto.
  - 1b. Ya la denunció: "Ya denunciaste esta publicación", con el estado de esa denuncia.
  - 1c. Es suya: no se muestra el botón.
- **Postcondiciones:** Hay una denuncia `abierta` con `reporter_id`.
- **Reglas:** Una denuncia por usuario y destino. La API responde 401 sin sesión.
- **Toca:**
  - DB: ◐ (migración M5).
  - API: `POST /api/reports`.
  - Front: `<ReportButton>` en anuncios, servicios, locales, reseñas y perfiles.
  - Pantalla: `Denunciar`, `DenunciarResena`, `DenunciarPerfil`, `DenunciaEnviada`, `DenunciaSinSesion`.
- **Aceptación:**
  - PGlite: una segunda denuncia del mismo usuario falla; un motivo de otro tipo falla.
  - e2e: el recorrido sin sesión vuelve a la publicación.

#### CU-31 Ver el estado de mis denuncias

- **Actor:** Usuario.
- **Flujo principal:** En *Mis denuncias* (menú de cuenta) ve cada denuncia con el destino, el motivo, la fecha y el estado (abierta, resuelta o descartada).
- **Alternativos:**
  - 1a. El destino ya no existe: "Publicación eliminada".
- **Reglas:** No se muestra la nota interna del administrador.
- **Toca:**
  - DB: ✅ (`reports_read`).
  - API: `GET /api/reports/mine`.
  - Front: `/mis-denuncias`.
- **Aceptación:** Un usuario solo ve sus propias denuncias.

#### CU-61 Avisar el resultado de una denuncia

- **Actor:** Sistema.
- **Disparador:** Un administrador resuelve una denuncia (CU-51).
- **Flujo principal:**
  1. Si la denuncia queda `resuelta`, quien denunció recibe: "Revisamos tu denuncia y pausamos la publicación".
  2. Si queda `descartada`, recibe: "Revisamos tu denuncia y no encontramos un problema".
- **Alternativos:**
  - 1a. Se resuelven juntas varias denuncias del mismo destino: cada denunciante recibe un correo.
- **Toca:**
  - API: `notify.py`, con la plantilla `report_resolved`.
- **Depende de:** CU-60 (la infraestructura de A).

### M6. Perfil de vendedor y búsqueda

#### CU-71 Ver el perfil público de un vendedor

- **Actor:** Visitante.
- **Flujo principal:**
  1. En un anuncio elige el nombre que aparece en "Publicado por".
  2. Entra a `/vendedores/[id]` y ve el nombre público, el departamento, la fecha de alta ("En La Higuera desde…"), el puntaje y sus anuncios activos paginados.
  3. Ve sus reseñas (CU-23), puede dejar una (CU-20) o denunciar el perfil (CU-30).
- **Alternativos:**
  - 1a. El anuncio es de un comercio: el enlace lleva al perfil del local (CU-15).
  - 2a. No tiene anuncios activos: estado vacío. El perfil sigue visible por las reseñas.
- **Reglas:** No se muestran el correo de acceso ni datos de contacto propios del perfil: el contacto sigue estando en cada anuncio.
- **Toca:**
  - DB: ✅ (`profiles_read`, puntaje en `profiles`).
  - API: `GET /api/profiles/{id}` y `GET /api/products?seller=`.
  - Front: `/vendedores/[id]`.
  - Pantalla: no está en el canvas; seguir el patrón de `PerfilLocal` sin mapa.
- **Aceptación:** No aparecen anuncios pausados, ocultos ni vencidos.

#### CU-70 Filtrar y ordenar anuncios

- **Actor:** Visitante.
- **Flujo principal:**
  1. En el listado filtra por departamento, por rango de precio (con moneda) y, en Inmuebles, por venta o alquiler.
  2. Ordena por más recientes, menor precio o mayor precio.
  3. Los filtros quedan en la URL, así que se pueden compartir.
- **Alternativos:**
  - 1a. No hay resultados: estado vacío con el botón "Quitar filtros".
- **Toca:**
  - DB: ✅ (`products_locality_feed`; evaluar un índice por precio).
  - API: `GET /api/products` con `locality`, `min_price`, `max_price`, `currency`, `operation` y `sort`.
  - Front: `search-navigation.tsx`, inicio.
- **Aceptación:** Combinar búsqueda, rubro y filtros devuelve la intersección, y la paginación conserva los filtros.

### M7. Referencias de servicios

#### CU-40 Cargar referencias de clientes

- **Actor:** Trabajador.
- **Flujo principal:**
  1. En la edición de su servicio, sección "Referencias", agrega el nombre, el teléfono y un detalle opcional de un cliente anterior.
  2. Ve cada referencia con su estado (pendiente, confirmada o descartada).
  3. Puede eliminar una referencia que esté pendiente.
- **Alternativos:**
  - 1a. Ya tiene 5 referencias: el botón queda deshabilitado (`service_reference_limit`).
- **Postcondiciones:** Cuando un administrador las comprueba (CU-54), el servicio gana la insignia "Referencias comprobadas" y sube en el orden del listado.
- **Reglas:** Las referencias nunca son públicas: solo las ven el trabajador y la administración.
- **Toca:**
  - DB: ✅.
  - API: `GET`, `POST` y `DELETE /api/services/{id}/references`.
  - Front: `service-form.tsx`, más la insignia en `ServiceCard` y en el detalle.
- **Aceptación:** PGlite: un tercero no puede leer las referencias.

### M8. Administración

> **Migración M8:** columnas `reviewed_by` (A6). Además, la API expone `is_admin` en `GET /api/profile` para que el frontend muestre el menú *Administración*.

#### CU-50 Acceder al panel de administración

- **Actor:** Administrador.
- **Flujo principal:**
  1. Desde el menú de cuenta entra a `/admin`.
  2. Ve un resumen con las denuncias abiertas, las solicitudes de comercio, las matrículas por verificar y las referencias pendientes, cada una con su enlace.
- **Alternativos:**
  - 1a. No es administrador: 404, sin revelar que la ruta existe.
- **Reglas:** El permiso se comprueba en las tres capas: frontend (`is_admin`), API (dependencia `require_admin`) y base (las funciones `admin_*` lo verifican).
- **Toca:**
  - API: `GET /api/admin/summary`.
  - Front: `/admin` (layout propio).
  - Pantalla: no está en el canvas; usar los componentes existentes (tablas, pills, `Notice`).
- **Aceptación:** Una cuenta común recibe 404 en las rutas `/admin` y en `/api/admin/*`.

#### CU-51 Resolver denuncias

- **Actor:** Administrador.
- **Flujo principal:**
  1. En `/admin/denuncias` ve la cola de abiertas, de la más vieja a la más nueva, agrupada por destino ("3 denuncias").
  2. Abre una y ve el destino con un enlace, los motivos, los detalles y los denunciantes.
  3. Decide:
     - **ocultar** el destino (`admin_set_hidden`) y marcar todas sus denuncias como `resuelta`;
     - o **descartar**, con una nota interna.
  4. Se avisa a cada denunciante (CU-61).
- **Alternativos:**
  - 3a. Más adelante vuelve a mostrar un contenido oculto (CU-55).
  - 3b. Filtra por estado o por tipo.
- **Toca:**
  - DB: ✅ (`admin_resolve_report`, `admin_set_hidden`).
  - API: `GET /api/admin/reports` y `POST /api/admin/reports/{id}/resolve`.
  - Front: `/admin/denuncias`.
- **Aceptación:** Un contenido oculto deja de verse en todos los listados públicos, y su dueño lo sigue viendo marcado como "Oculto por moderación".

#### CU-52 Revisar solicitudes de comercio

- **Actor:** Administrador.
- **Flujo principal:**
  1. En `/admin/comercios` ve las solicitudes pendientes con el CUIT, la razón social, la dirección en el mapa, el contacto y la fecha.
  2. Comprueba los datos por fuera (por ejemplo, la constancia de CUIT).
  3. Aprueba, o rechaza escribiendo un motivo obligatorio.
  4. Se avisa al dueño (CU-60).
- **Alternativos:**
  - 3a. Pide más datos: rechaza con el motivo y el dueño corrige (CU-11).
- **Toca:**
  - DB: ✅ (`admin_review_business`).
  - API: `GET /api/admin/businesses` y `POST /api/admin/businesses/{id}/review`.
  - Front: `/admin/comercios`.
- **Aceptación:** Un comercio aprobado aparece en `/locales`; uno rechazado no aparece.

#### CU-53 Verificar la matrícula de un servicio

- **Actor:** Administrador.
- **Flujo principal:**
  1. En `/admin/matriculas` ve los servicios con oficio que exige matrícula y todavía sin verificar: número, entidad emisora y trabajador.
  2. Marca la matrícula como verificada o la deja sin verificar.
- **Reglas:** Si el trabajador cambia el número, la entidad o el oficio, la verificación se retira sola (ya implementado).
- **Toca:**
  - DB: ✅ (`admin_set_service_badges`).
  - API: `GET /api/admin/licenses` y `POST /api/admin/services/{id}/badges`.
- **Aceptación:** El servicio muestra "Matrícula verificada" y sube en el listado.

#### CU-54 Comprobar las referencias de un servicio

- **Actor:** Administrador.
- **Flujo principal:**
  1. En `/admin/referencias` ve las referencias pendientes por servicio, con el teléfono.
  2. Llama al cliente y marca cada referencia como `confirmada` o `descartada`, con una nota.
  3. Si el servicio tiene suficientes referencias confirmadas, activa "Referencias comprobadas".
- **Toca:**
  - DB: ✅ (`admin_set_reference_status`, `admin_set_service_badges`).
  - API: `GET /api/admin/references` y `POST /api/admin/references/{id}`.
- **Pregunta abierta:** ¿cuántas referencias confirmadas hacen falta para la insignia? Propuesta: 2.

#### CU-55 Ocultar o mostrar cualquier contenido

- **Actor:** Administrador.
- **Flujo principal:**
  1. Desde cualquier anuncio, servicio, local o reseña (con un botón visible solo para administradores) o desde `/admin/ocultos`, elige "Ocultar" o "Mostrar".
  2. Confirma.
- **Toca:**
  - DB: ✅ (`admin_set_hidden`).
  - API: `POST /api/admin/hidden`.
  - Front: `/admin/ocultos`.
- **Aceptación:** Ocultar una reseña recalcula el puntaje del reseñado.

### M9. Operación

#### CU-80 Seed de desarrollo

- **Actor:** Desarrollador.
- **Flujo principal:** Corre `make seed`, que crea en un Supabase local o de pruebas usuarios, anuncios con fotos (`mockup-fotos/`), servicios, comercios en los dos estados, reseñas y denuncias.
- **Reglas:** El script se niega a correr si `SUPABASE_URL` no es local o de pruebas, con la misma protección que `ALLOW_INTEGRATION_TESTS`.
- **Toca:** `database/seed-dev/` y `backend/scripts/seed.py`.
- **Aceptación:** Después del seed, cada pantalla del canvas tiene datos para verse completa.

#### CU-82 Desplegar a producción

- **Actor:** Desarrollador.
- **Flujo principal:**
  1. Crear el proyecto Supabase de producción y aplicar las migraciones.
  2. Configurar Auth: Site URL, redirects, SMTP y plantillas.
  3. Desplegar la API y el frontend con sus variables de entorno.
  4. Configurar el dominio, HTTPS y los secretos de las tareas programadas.
  5. Hacer una prueba de humo.
- **Toca:** `.github/workflows/` (despliegue opcional) y la sección "Despliegue" del README.
- **Aceptación:**
  - Se puede registrar, confirmar, publicar con fotos, ver y eliminar en producción.
  - Ninguna clave secreta tiene el prefijo `NEXT_PUBLIC_`.
- **Pregunta abierta:** ¿dónde se alojan el frontend y la API? Ver RNF-07.

#### CU-83 Verificar contra un Supabase real

- **Actor:** Desarrollador.
- **Flujo principal:** Correr `scripts.integration` y `crud.spec.ts` contra un proyecto de pruebas y registrar el resultado en `docs/VERIFICATION.md`.
- **Por qué va primero:** desde la 0.1.0 todo se probó con PGlite y simulaciones. Construir los módulos nuevos sobre algo nunca probado contra Supabase real es un riesgo.
- **Aceptación:** `VERIFICATION.md` sin pendientes de Supabase real.

---

## 6. Requisitos no funcionales

Cada requisito tiene un criterio que se puede verificar. Responsable: **Los dos** quiere decir que cada uno lo cumple en su propio módulo.

| ID | Requisito | Criterio de aceptación | Estado | Responsable |
|---|---|---|---|---|
| **RNF-01** | **Antiabuso y rate limiting** | Límites por usuario o IP con respuesta 429 y un mensaje en español: 5 denuncias por hora, 10 reseñas por día, 30 subidas de fotos por hora, 3 solicitudes de comercio por día y 20 consultas de geocodificación por minuto. Login y registro quedan con los límites de Supabase Auth. Pruebas en pytest. | No existe | B (API) |
| **RNF-02** | **Privacidad y marco legal** | Páginas `/terminos` y `/privacidad` enlazadas en el footer y aceptadas al registrarse. Explicar cómo ejercer los derechos de acceso, rectificación y supresión (Ley 25.326). Consultar si corresponde inscribir la base ante la AAIP. | No existe | A |
| **RNF-03** | **Datos que nunca son públicos** | CUIT, razón social, teléfono de referencias, correo de acceso, nota del administrador y dirección de inmuebles: cada uno con una prueba de RLS en PGlite o una prueba de la API que demuestre que otro usuario no lo recibe. | Parcial (RLS existe) | Los dos |
| **RNF-04** | **Accesibilidad WCAG 2.1 AA** | Todo se usa con teclado, con foco visible (`#0284c7`) y contraste de al menos 4.5:1. El mapa tiene una lista equivalente. Estrellas y motivos se eligen con teclado y se anuncian en lectores de pantalla. Los diálogos atrapan el foco y cierran con Escape. axe sin errores en Playwright. | Base hecha | Los dos |
| **RNF-05** | **Rendimiento** | LCP menor a 2,5 s en 4G (inicio, detalle y locales). p95 menor a 500 ms en los listados de la API. Leaflet o MapLibre se cargan solo en las páginas con mapa. Imágenes públicas cacheadas (A7). | Riesgo: `no-store` | A |
| **RNF-06** | **SEO** | `generateMetadata` con título y descripción en anuncios, servicios, locales y vendedores. Open Graph con la imagen de portada. `sitemap.xml` con el contenido visible y `robots.txt` que excluye `/admin` y las rutas privadas. | No existe | B |
| **RNF-07** | **Disponibilidad y respaldo** | Elegir el hosting del frontend y de la API. Backups de Supabase según el plan, con una restauración probada al menos una vez. `GET /api/health` monitoreado desde afuera. | Sin definir | Los dos (hito 5) |
| **RNF-08** | **Observabilidad** | Logs JSON en la API con `request_id`, ruta, código y duración. Errores no manejados reportados a un servicio de errores. Sin datos personales en los logs (ni correo, ni teléfono, ni CUIT). | Casi nada | A |
| **RNF-09** | **Correo transaccional** | Dominio propio con SPF, DKIM y DMARC. Remitente "La Higuera". Plantillas versionadas en el repo. Si un envío falla, la operación que lo causó se guarda igual (CU-60). | Solo Auth | A |
| **RNF-10** | **Calidad y pruebas** | Cada caso de uso tiene pruebas de la API (pytest), de RLS (PGlite) si tiene migración, y al menos un e2e del flujo principal. `make check` en verde antes de mergear. El e2e autenticado corre en CI contra un Supabase de pruebas. | Parcial | Los dos |
| **RNF-11** | **Seguridad del panel de administración** | Permiso comprobado en las tres capas (CU-50). Las acciones registran quién y cuándo (A6). Las rutas `/admin` no se indexan. | No existe | B |
| **RNF-12** | **Interfaz consistente** | Funciona desde 360 px sin scroll horizontal. Textos en español de Argentina con voseo. Respeta el movimiento reducido. Estados vacíos y de carga con los higos. Las pantallas nuevas comparadas con el canvas. | Hecho; mantener | Los dos |
| **RNF-13** | **Mantenibilidad** | Migraciones solo hacia adelante, una por módulo y probadas en PGlite. Endpoints documentados en `ARCHITECTURE.md`. Validación con los mismos límites y mensajes en zod y en Pydantic. | Convención existente | Los dos |
| **RNF-14** | **Compatibilidad** | Las dos últimas versiones de Chrome, Firefox, Safari y Edge, y Safari de iOS y Chrome de Android. | Sin verificar | Los dos |

---

## 7. Trazabilidad

| CU | Pantalla del canvas | Migración | Endpoints nuevos | Resp. |
|---|---|---|---|---|
| CU-01 | — (patrón Ingresar) | — | — | A |
| CU-02 | DejarResena, ResenaSinConfirmar | — | — | A |
| CU-03 | MiPerfil | — | — | A |
| CU-10 | AltaComercio, SolicitudRevision | M2 | `POST /api/businesses`, `GET /api/geocode` | A |
| CU-11 | SolicitudRevision | — | `GET /api/businesses/mine`, `PUT /api/businesses/{id}` | A |
| CU-12 | PanelComercio | — | `PUT /api/businesses/{id}` | A |
| CU-13 | Publicar, DetalleInmueble | — | `business_id` en `POST` y `PUT /api/products` | A |
| CU-14 | Locales, LocalesMobile, MapaSJ | M2 | `GET /api/businesses` | A |
| CU-15 | PerfilLocal | — | `GET /api/businesses/{slug}`, `?business=` en productos | A |
| CU-72 | DetalleInmueble, MapaSJ (zona) | M2 (localities) | — | A |
| CU-60 | — | — | `app/notify.py` | A |
| CU-62 | — | `expiry_notified_at` | script + workflow | A |
| CU-63 | — | — | script + workflow | A |
| CU-81 | — | — | workflow | A |
| CU-20 | DejarResena, ResenaSinConfirmar | M4 | `POST /api/reviews` | B |
| CU-21 | Resenas | — | `PUT`, `DELETE /api/reviews/{id}` | B |
| CU-22 | Resenas, PanelComercio | — | `PUT /api/reviews/{id}/reply` | B |
| CU-23 | Resenas | — | `GET /api/reviews` | B |
| CU-30 | Denunciar, DenunciarResena, DenunciarPerfil, DenunciaEnviada, DenunciaSinSesion | M5 | `POST /api/reports` | B |
| CU-31 | — | — | `GET /api/reports/mine` | B |
| CU-61 | — | — | usa `notify.py` | B |
| CU-70 | Main, HeaderCategorias | índice opcional | filtros en `GET /api/products` | B |
| CU-71 | — (patrón PerfilLocal) | — | `GET /api/profiles/{id}`, `?seller=` en productos | B |
| CU-40 | OfrecerServicio | — | `/api/services/{id}/references` | B |
| CU-50 a CU-55 | — (componentes existentes) | M8 | `/api/admin/*` | B |
| CU-80 | — | — | `scripts/seed.py` | Los dos |
| CU-82 | — | — | — | Los dos |
| CU-83 | — | — | — | Los dos |
