begin;
-- Ajustes para un proyecto Supabase real. No agrega ni cambia tablas o columnas:
-- la API (backend/) y el frontend siguen funcionando sin modificaciones.

-- 1. Permisos explícitos para la clave secreta (service_role).
-- Los proyectos Supabase nuevos ya no dan acceso automático a las tablas de `public`
-- (https://supabase.com/changelog/45329). Sin estos permisos fallan scripts/cleanup.py,
-- scripts/integration.py y el último paso de la eliminación de cuenta, que usan esa clave.
grant select, insert, update, delete on public.profiles, public.businesses, public.products,
  public.service_providers, public.storage_cleanup to service_role;

-- 2. Funciones de `public`: quitar también el EXECUTE directo de anon y authenticated
-- (Supabase puede otorgarlo por defecto, además del de PUBLIC) y dejar solo lo necesario.
revoke execute on function public.account_writable(), public.product_seller(uuid), public.reserve_image(),
  public.abandon_image(text), public.begin_account_deletion() from public, anon, authenticated;
grant execute on function public.product_seller(uuid) to anon, authenticated;
grant execute on function public.account_writable(), public.reserve_image(), public.abandon_image(text),
  public.begin_account_deletion() to authenticated;

-- 3. El alta de perfil nunca debe hacer fallar un registro en Auth: un nombre fuera de rango
-- (o un proveedor que envíe `full_name` o `name`) se recorta o se reemplaza por 'Mi perfil'.
create or replace function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare label text;
begin
  label := btrim(left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    ''
  )), 80));
  if char_length(label) < 2 then label := 'Mi perfil'; end if;
  insert into public.profiles(id, display_name) values (new.id, label);
  return new;
end;
$$;

-- 4. Límite de imágenes en trámite por cuenta: sin él, una sesión puede reservar y subir
-- archivos de 5 MB sin tope. En el uso normal la cola de cada usuario queda casi vacía.
create or replace function public.reserve_image() returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if not public.account_writable() then raise exception 'Account unavailable'; end if;
  if (select count(*) from public.storage_cleanup where owner_id = auth.uid()) >= 20 then
    raise exception 'Too many pending images';
  end if;
  result := auth.uid()::text || '/' || gen_random_uuid()::text || '.webp';
  insert into public.storage_cleanup(path, owner_id) values(result, auth.uid());
  return result;
end;
$$;

-- 5. Una tarea de limpieza solo se puede descartar cuando el archivo ya no existe en Storage.
-- Antes, el dueño podía borrar la fila y dejar el archivo huérfano, fuera del alcance de la limpieza.
drop policy cleanup_own_delete on public.storage_cleanup;
create policy cleanup_own_delete on public.storage_cleanup for delete to authenticated using (
  owner_id = (select auth.uid())
  and not exists (select 1 from storage.objects o where o.bucket_id = 'product-images' and o.name = storage_cleanup.path)
);

-- 6. Índices del listado de servicios alineados con su orden real
-- (verified desc, created_at desc, id desc), con y sin filtro por oficio.
drop index public.service_providers_feed;
drop index public.service_providers_trade;
create index service_providers_feed on public.service_providers (verified desc, created_at desc, id desc) where status = 'activo';
create index service_providers_trade on public.service_providers (trade, verified desc, created_at desc, id desc) where status = 'activo';

-- 7. Descripciones visibles en el panel de Supabase.
comment on table public.profiles is 'Perfil privado de cada cuenta de Auth. Se crea solo al registrarse; únicamente lo lee su dueño.';
comment on table public.businesses is 'Comercios de un usuario. Todavía sin pantallas: los anuncios pueden vincularse a un comercio propio.';
comment on table public.products is 'Anuncios de productos. Públicos mientras status = activo; pausados y vendidos solo los ve su dueño.';
comment on column public.products.image_path is 'Ruta en el bucket privado product-images: <owner_id>/<uuid>.webp. Requiere una reserva previa de reserve_image().';
comment on table public.service_providers is 'Perfiles de trabajadores de oficio matriculados. Públicos mientras status = activo.';
comment on column public.service_providers.verified is 'Matrícula comprobada por la administración. Quien publica no puede escribirla y se retira sola si cambian matrícula, entidad u oficio.';
comment on table public.storage_cleanup is 'Cola de archivos de Storage: reservas de subida (ready = false) y archivos a borrar (ready = true). Sin FK para sobrevivir a la eliminación de la cuenta.';
commit;
