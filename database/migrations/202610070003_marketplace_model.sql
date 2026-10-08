begin;
-- Modelo de marketplace: localidades, rubros y oficios como tablas; contacto y vencimiento en los
-- anuncios; varias fotos; comercios verificados con CUIT privado; servicios con y sin matrícula;
-- reseñas con puntaje; denuncias y administración.
-- ATENCIÓN: cambia columnas que la API usa hoy (category, locality, image_path, trade).
-- Aplicarla junto con la versión del backend y del frontend que ya use este modelo.

-- ============================================================================
-- 1. Listas de referencia
-- ============================================================================
create table public.localities (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null unique check (char_length(btrim(name)) between 2 and 60),
  sort_order smallint not null default 0,
  active boolean not null default true
);
insert into public.localities (id, name, sort_order) values
  ('capital', 'Capital', 1), ('rawson', 'Rawson', 2), ('rivadavia', 'Rivadavia', 3), ('chimbas', 'Chimbas', 4),
  ('santa-lucia', 'Santa Lucía', 5), ('pocito', 'Pocito', 6), ('albardon', 'Albardón', 7), ('angaco', 'Angaco', 8),
  ('calingasta', 'Calingasta', 9), ('caucete', 'Caucete', 10), ('iglesia', 'Iglesia', 11), ('jachal', 'Jáchal', 12),
  ('9-de-julio', '9 de Julio', 13), ('san-martin', 'San Martín', 14), ('sarmiento', 'Sarmiento', 15), ('ullum', 'Ullum', 16),
  ('valle-fertil', 'Valle Fértil', 17), ('25-de-mayo', '25 de Mayo', 18), ('zonda', 'Zonda', 19);

create table public.categories (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null unique check (char_length(btrim(name)) between 2 and 60),
  sort_order smallint not null default 0,
  active boolean not null default true
);
insert into public.categories (id, name, sort_order) values
  ('inmuebles', 'Inmuebles', 1), ('tecnologia', 'Tecnología', 2), ('vehiculos', 'Vehículos', 3), ('ropa', 'Ropa', 4),
  ('muebles', 'Muebles', 5), ('electrodomesticos', 'Electrodomésticos', 6),
  ('materiales-construccion', 'Materiales de construcción', 7), ('otros', 'Otros', 8);

create table public.trades (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null unique check (char_length(btrim(name)) between 2 and 60),
  requires_license boolean not null default false,
  sort_order smallint not null default 0,
  active boolean not null default true
);
insert into public.trades (id, name, requires_license, sort_order) values
  ('gasista', 'Gasista', true, 1), ('electricista', 'Electricista', true, 2), ('plomero', 'Plomero', true, 3),
  ('albanil', 'Albañil', false, 4), ('pintor', 'Pintor', false, 5), ('carpintero', 'Carpintero', false, 6),
  ('herrero', 'Herrero', false, 7), ('refrigeracion', 'Refrigeración', false, 8), ('cerrajero', 'Cerrajero', false, 9),
  ('jardineria', 'Jardinería', false, 10), ('fletes-mudanzas', 'Fletes y mudanzas', false, 11),
  ('otros-oficios', 'Otros oficios', false, 12);

-- ============================================================================
-- 2. Administración
-- ============================================================================
-- Alta de un administrador, desde el SQL Editor:
--   insert into private.admins (user_id) select id from auth.users where email = 'correo@ejemplo.com';
create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admins enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.admins where user_id = auth.uid());
$$;

-- Los cambios que hacen otros triggers (puntaje, verificación) no cuentan como edición:
-- `updated_at` es el control de concurrencia de los formularios y no debe moverse por una reseña.
create or replace function private.touch_record() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id then raise exception 'Immutable id'; end if;
  new.created_at := old.created_at;
  new.updated_at := case when pg_trigger_depth() > 1 then old.updated_at else now() end;
  return new;
end;
$$;

-- ============================================================================
-- 3. Perfiles: ficha pública del vendedor
-- ============================================================================
alter table public.profiles
  add column locality_id text not null default 'capital' references public.localities(id),
  add column rating_avg numeric(3,2) check (rating_avg between 1 and 5),
  add column rating_count integer not null default 0 check (rating_count >= 0),
  add column rating_score numeric(4,3) not null default 3.5;
update public.profiles p set locality_id = l.id from public.localities l where lower(btrim(p.locality)) = lower(l.name);
alter table public.profiles drop column locality;
drop policy profiles_own_read on public.profiles;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);

-- ============================================================================
-- 4. Comercios y verificación
-- ============================================================================
create function public.cuit_is_valid(cuit text) returns boolean language sql immutable strict set search_path = '' as $$
  select case when cuit ~ '^[0-9]{11}$' then (
    select case 11 - (sum(substr(cuit, i, 1)::integer * (array[5, 4, 3, 2, 7, 6, 5, 4, 3, 2])[i]) % 11)
      when 11 then 0 when 10 then -1 else 11 - (sum(substr(cuit, i, 1)::integer * (array[5, 4, 3, 2, 7, 6, 5, 4, 3, 2])[i]) % 11) end
      = substr(cuit, 11, 1)::integer
    from generate_series(1, 10) i
  ) else false end;
$$;

alter table public.businesses
  add column phone text check (phone ~ '^[0-9]{8,15}$'),
  add column contact_email text check (char_length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column address text check (char_length(btrim(address)) between 4 and 160),
  add column locality_id text references public.localities(id),
  add column verified boolean not null default false,
  add column verified_at timestamptz,
  add column hidden boolean not null default false,
  add column rating_avg numeric(3,2) check (rating_avg between 1 and 5),
  add column rating_count integer not null default 0 check (rating_count >= 0),
  add column rating_score numeric(4,3) not null default 3.5,
  add constraint businesses_one_per_account unique (owner_id),
  -- Un comercio público siempre tiene dirección, localidad y al menos un contacto.
  add constraint businesses_verified_complete check (
    not verified or (address is not null and locality_id is not null and (phone is not null or contact_email is not null))
  );
drop index public.businesses_owner;
create index businesses_feed on public.businesses (rating_score desc, created_at desc, id desc) where verified;
drop policy businesses_own_read on public.businesses;
create policy businesses_read on public.businesses for select to anon, authenticated using (
  (verified and not hidden) or owner_id = (select auth.uid()) or (select public.is_admin())
);

-- CUIT y razón social: solo los ven el dueño del comercio y la administración.
create table public.business_verifications (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  cuit text not null check (public.cuit_is_valid(cuit)),
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 150),
  status text not null default 'pendiente' check (status in ('pendiente', 'verificado', 'rechazado')),
  note text check (char_length(note) <= 1000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- Un CUIT no puede estar en dos trámites vigentes; uno rechazado no bloquea al dueño real.
create unique index business_verifications_cuit on public.business_verifications (cuit) where status <> 'rechazado';

create function private.business_verification_rules() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or (new.cuit, new.legal_name) is distinct from (old.cuit, old.legal_name) then
    if not exists(select 1 from public.businesses b where b.id = new.business_id and b.address is not null
        and b.locality_id is not null and (b.phone is not null or b.contact_email is not null)) then
      raise exception 'Business profile incomplete';
    end if;
    -- Alta o cambio de CUIT o razón social: el trámite vuelve a empezar.
    new.status := 'pendiente'; new.note := null; new.reviewed_at := null; new.submitted_at := now();
  elsif new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'pendiente' then null else now() end;
  end if;
  return new;
end;
$$;
create function private.business_verification_sync() returns trigger language plpgsql security definer set search_path = '' as $$
declare target uuid; approved boolean := false;
begin
  if tg_op = 'DELETE' then
    target := old.business_id;
  else
    target := new.business_id; approved := new.status = 'verificado';
  end if;
  update public.businesses set verified = approved, verified_at = case when approved then now() end
  where id = target and verified is distinct from approved;
  return null;
end;
$$;
create trigger business_verifications_rules before insert or update on public.business_verifications for each row execute function private.business_verification_rules();
create trigger business_verifications_sync after insert or update or delete on public.business_verifications for each row execute function private.business_verification_sync();
create trigger business_verifications_account_guard before insert or update on public.business_verifications for each row execute function private.guard_account_write();

alter table public.business_verifications enable row level security;
create policy verifications_read on public.business_verifications for select to authenticated using (
  (select public.is_admin()) or exists(select 1 from public.businesses b where b.id = business_verifications.business_id and b.owner_id = (select auth.uid()))
);
create policy verifications_own_insert on public.business_verifications for insert to authenticated with check (
  (select public.account_writable()) and exists(select 1 from public.businesses b where b.id = business_verifications.business_id and b.owner_id = (select auth.uid()))
);
create policy verifications_own_update on public.business_verifications for update to authenticated using (
  (select public.account_writable()) and exists(select 1 from public.businesses b where b.id = business_verifications.business_id and b.owner_id = (select auth.uid()))
) with check (
  exists(select 1 from public.businesses b where b.id = business_verifications.business_id and b.owner_id = (select auth.uid()))
);

-- ============================================================================
-- 5. Anuncios: rubro, localidad, contacto, operación y vencimiento
-- ============================================================================
alter table public.products
  add column category_id text references public.categories(id),
  add column locality_id text references public.localities(id),
  add column operation text check (operation in ('venta', 'alquiler')),
  add column contact_phone text check (contact_phone ~ '^[0-9]{8,15}$'),
  add column contact_email text check (char_length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column expires_at timestamptz not null default (now() + interval '60 days'),
  add column hidden boolean not null default false;
-- Datos previos: se conserva lo que se puede mapear y los anuncios activos quedan pausados
-- hasta que su dueño cargue un contacto.
update public.products set
  category_id = case category when 'Tecnología' then 'tecnologia' when 'Vehículos' then 'vehiculos' when 'Hogar' then 'muebles' else 'otros' end,
  locality_id = coalesce((select l.id from public.localities l where lower(l.name) = lower(btrim(products.locality))), 'capital'),
  status = case when status = 'activo' then 'pausado' else status end;

-- Varias fotos por anuncio (hasta 8). `sort_order` 0 es la portada.
alter table public.products add constraint products_id_owner_key unique (id, owner_id);
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  owner_id uuid not null,
  path text not null unique,
  sort_order smallint not null check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.products(id, owner_id) on delete cascade,
  constraint product_images_order_key unique (product_id, sort_order) deferrable initially immediate,
  check (path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.webp$'))
);
insert into public.product_images (product_id, owner_id, path, sort_order)
  select id, owner_id, image_path, 0 from public.products where image_path is not null;

drop trigger product_image_cleanup on public.products;
drop function private.product_images();
drop policy image_read on storage.objects;
drop policy image_delete on storage.objects;
drop policy products_read on public.products;
drop index public.products_category_feed;
alter table public.products
  drop column image_path, drop column category, drop column locality,
  alter column category_id set not null,
  alter column locality_id set not null,
  -- Solo los inmuebles indican si son venta o alquiler.
  add constraint products_operation_by_category check ((category_id = 'inmuebles') = (operation is not null)),
  -- Un anuncio activo siempre tiene teléfono o correo de contacto.
  add constraint products_active_contact check (status <> 'activo' or contact_phone is not null or contact_email is not null);
create index products_category_feed on public.products (category_id, created_at desc, id desc) where status = 'activo';
create index products_locality_feed on public.products (locality_id, created_at desc, id desc) where status = 'activo';

-- Visible: activo, sin vencer y sin ocultar. El dueño y la administración ven siempre.
create policy products_read on public.products for select to anon, authenticated using (
  (status = 'activo' and not hidden and expires_at > now()) or owner_id = (select auth.uid()) or (select public.is_admin())
);
create or replace function public.product_seller(product_id uuid) returns text language sql stable security definer set search_path = '' as $$
  select p.display_name from public.profiles p join public.products x on x.owner_id = p.id
  where x.id = product_id and ((x.status = 'activo' and not x.hidden and x.expires_at > now()) or x.owner_id = auth.uid());
$$;

-- Vencimiento: 60 días desde la publicación; volver a activar o renovar reinicia el plazo.
create function private.product_expiry() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'activo' and old.status <> 'activo' then new.expires_at := now() + interval '60 days'; end if;
  return new;
end;
$$;
create trigger products_expiry before update on public.products for each row execute function private.product_expiry();
create function public.renew_product(product_id uuid) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare result timestamptz;
begin
  if not public.account_writable() then raise exception 'Account unavailable'; end if;
  update public.products set expires_at = now() + interval '60 days'
  where id = product_id and owner_id = auth.uid() returning expires_at into result;
  if result is null then raise exception 'Product not found'; end if;
  return result;
end;
$$;

-- Imágenes: mismo circuito de reserva y limpieza que antes, ahora por fila de product_images.
create function private.product_image_files() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.storage_cleanup where path = new.path and owner_id = new.owner_id
      and not ready and created_at > now() - interval '24 hours' for update;
    if not found then raise exception 'Image reservation expired or already used'; end if;
    if not exists(select 1 from storage.objects where bucket_id = 'product-images' and name = new.path) then
      raise exception 'Image does not exist';
    end if;
    delete from public.storage_cleanup where path = new.path;
    return new;
  elsif tg_op = 'UPDATE' then
    if (new.path, new.owner_id, new.product_id) is distinct from (old.path, old.owner_id, old.product_id) then
      raise exception 'Image rows are immutable';
    end if;
    return new;
  end if;
  insert into public.storage_cleanup(path, owner_id, ready) values(old.path, old.owner_id, true)
  on conflict(path) do update set ready = true;
  return old;
end;
$$;
create trigger product_images_files after insert or update or delete on public.product_images for each row execute function private.product_image_files();
create trigger product_images_account_guard before insert or update on public.product_images for each row execute function private.guard_account_write();

alter table public.product_images enable row level security;
-- Una foto se ve si se ve su anuncio (la política de products decide).
create policy product_images_read on public.product_images for select to anon, authenticated using (
  exists(select 1 from public.products p where p.id = product_images.product_id)
);
create policy product_images_own_insert on public.product_images for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy product_images_own_update on public.product_images for update to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable())) with check (owner_id = (select auth.uid()));
create policy product_images_own_delete on public.product_images for delete to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable()));

-- Deja las fotos del anuncio exactamente como la lista `paths`, en ese orden: agrega las nuevas
-- (ya subidas con reserve_image), reordena las que siguen y quita el resto. Todo o nada.
create function public.set_product_images(product_id uuid, paths text[]) returns void language plpgsql set search_path = '' as $$
declare wanted text[] := coalesce(paths, '{}');
begin
  if cardinality(wanted) > 8 then raise exception 'Too many images'; end if;
  if array_position(wanted, null) is not null or cardinality(wanted) <> (select count(distinct w) from unnest(wanted) w) then
    raise exception 'Invalid image list';
  end if;
  if not exists(select 1 from public.products x where x.id = set_product_images.product_id and x.owner_id = auth.uid()) then
    raise exception 'Product not found';
  end if;
  delete from public.product_images i where i.product_id = set_product_images.product_id and i.path <> all(wanted);
  update public.product_images i set sort_order = w.ord - 1 from unnest(wanted) with ordinality w(path, ord)
  where i.product_id = set_product_images.product_id and i.path = w.path;
  insert into public.product_images (product_id, owner_id, path, sort_order)
    select set_product_images.product_id, auth.uid(), w.path, w.ord - 1 from unnest(wanted) with ordinality w(path, ord)
    where not exists(select 1 from public.product_images i where i.path = w.path);
  if (select count(*) from public.product_images i where i.product_id = set_product_images.product_id) <> cardinality(wanted) then
    raise exception 'Invalid image list';
  end if;
end;
$$;

create or replace function public.abandon_image(image text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.storage_cleanup set ready = true where path = image and owner_id = auth.uid()
  and not exists(select 1 from public.product_images i where i.path = image);
end;
$$;
-- Con hasta 8 fotos por anuncio, el tope de imágenes en trámite sube de 20 a 40.
create or replace function public.reserve_image() returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if not public.account_writable() then raise exception 'Account unavailable'; end if;
  if (select count(*) from public.storage_cleanup where owner_id = auth.uid()) >= 40 then
    raise exception 'Too many pending images';
  end if;
  result := auth.uid()::text || '/' || gen_random_uuid()::text || '.webp';
  insert into public.storage_cleanup(path, owner_id) values(result, auth.uid());
  return result;
end;
$$;

create policy image_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'product-images' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists(select 1 from public.product_images i where i.path = name)
  )
);
create policy image_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists(select 1 from public.product_images i where i.path = name)
);

-- ============================================================================
-- 6. Servicios: oficio de la lista, matrícula solo si corresponde, referencias
-- ============================================================================
alter table public.service_providers
  add column trade_id text references public.trades(id),
  add column locality_id text references public.localities(id),
  add column contact_email text check (char_length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column references_verified boolean not null default false,
  add column hidden boolean not null default false,
  add column rating_avg numeric(3,2) check (rating_avg between 1 and 5),
  add column rating_count integer not null default 0 check (rating_count >= 0),
  add column rating_score numeric(4,3) not null default 3.5;
update public.service_providers s set
  trade_id = coalesce((select t.id from public.trades t where t.name = s.trade), 'otros-oficios'),
  locality_id = coalesce((select l.id from public.localities l where lower(l.name) = lower(btrim(s.locality))), 'capital');

-- Reglas de matrícula según el oficio. La insignia de matrícula se retira si cambian matrícula,
-- entidad u oficio; la de referencias, si cambia el oficio.
create or replace function private.service_provider_license() returns trigger language plpgsql set search_path = '' as $$
declare needs_license boolean;
begin
  select t.requires_license into needs_license from public.trades t where t.id = new.trade_id;
  if needs_license then
    if new.license_number is null or new.license_body is null then raise exception 'License required for this trade'; end if;
  elsif needs_license is not null then
    new.license_number := null; new.license_body := null; new.verified := false;
  end if;
  if tg_op = 'INSERT' then
    if auth.role() = 'authenticated' then new.verified := false; new.references_verified := false; end if;
  elsif auth.role() = 'authenticated' then
    if (new.license_number, new.license_body, new.trade_id) is distinct from (old.license_number, old.license_body, old.trade_id) then
      new.verified := false;
    end if;
    if new.trade_id is distinct from old.trade_id then new.references_verified := false; end if;
  end if;
  return new;
end;
$$;
drop policy services_read on public.service_providers;
drop index public.service_providers_feed;
drop index public.service_providers_trade;
alter table public.service_providers
  drop column trade, drop column locality,
  alter column trade_id set not null,
  alter column locality_id set not null,
  alter column license_number drop not null,
  alter column license_body drop not null;
-- Los oficios sin matrícula no guardan datos de matrícula (el trigger los limpia).
update public.service_providers s set license_number = null
where exists(select 1 from public.trades t where t.id = s.trade_id and not t.requires_license);
-- Orden del listado: matrícula verificada, referencias comprobadas, puntaje y fecha.
create index service_providers_feed on public.service_providers (verified desc, references_verified desc, rating_score desc, created_at desc, id desc) where status = 'activo';
create index service_providers_trade on public.service_providers (trade_id, verified desc, references_verified desc, rating_score desc, created_at desc, id desc) where status = 'activo';
create policy services_read on public.service_providers for select to anon, authenticated using (
  (status = 'activo' and not hidden) or owner_id = (select auth.uid()) or (select public.is_admin())
);

-- Referencias de clientes anteriores: las carga el trabajador y las comprueba la administración.
create table public.service_references (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid not null references public.service_providers(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  detail text check (char_length(detail) <= 500),
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'descartada')),
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  checked_at timestamptz
);
create index service_references_service on public.service_references (service_provider_id);
create function private.service_reference_limit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.service_references r where r.service_provider_id = new.service_provider_id) >= 5 then
    raise exception 'Too many references';
  end if;
  return new;
end;
$$;
create trigger service_references_limit before insert on public.service_references for each row execute function private.service_reference_limit();
create trigger service_references_account_guard before insert or update on public.service_references for each row execute function private.guard_account_write();
alter table public.service_references enable row level security;
create policy references_read on public.service_references for select to authenticated using (
  (select public.is_admin()) or exists(select 1 from public.service_providers s where s.id = service_references.service_provider_id and s.owner_id = (select auth.uid()))
);
create policy references_own_insert on public.service_references for insert to authenticated with check (
  (select public.account_writable()) and exists(select 1 from public.service_providers s where s.id = service_references.service_provider_id and s.owner_id = (select auth.uid()))
);
create policy references_own_delete on public.service_references for delete to authenticated using (
  (select public.account_writable()) and exists(select 1 from public.service_providers s where s.id = service_references.service_provider_id and s.owner_id = (select auth.uid()))
);

-- ============================================================================
-- 7. Reseñas y puntaje
-- ============================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Exactamente un destino: un vendedor, un comercio o un servicio.
  seller_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  service_provider_id uuid references public.service_providers(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(btrim(comment)) between 3 and 1000),
  reply text check (char_length(btrim(reply)) between 1 and 1000),
  replied_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(seller_id, business_id, service_provider_id) = 1),
  check (seller_id is null or seller_id <> author_id),
  check ((reply is null) = (replied_at is null)),
  unique (author_id, seller_id),
  unique (author_id, business_id),
  unique (author_id, service_provider_id)
);
create index reviews_seller on public.reviews (seller_id, created_at desc) where seller_id is not null;
create index reviews_business on public.reviews (business_id, created_at desc) where business_id is not null;
create index reviews_service on public.reviews (service_provider_id, created_at desc) where service_provider_id is not null;

create function private.review_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare target_owner uuid;
begin
  if not exists(select 1 from auth.users u where u.id = new.author_id
      and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then
    raise exception 'Confirmed account required';
  end if;
  if new.business_id is not null then
    select b.owner_id into target_owner from public.businesses b where b.id = new.business_id and b.verified;
    if not found then raise exception 'Business not available'; end if;
  elsif new.service_provider_id is not null then
    select s.owner_id into target_owner from public.service_providers s where s.id = new.service_provider_id;
  else
    target_owner := new.seller_id;
  end if;
  if target_owner = new.author_id then raise exception 'Cannot review yourself'; end if;
  return new;
end;
$$;

-- puntaje = (5 × 3,5 + suma de estrellas) / (5 + cantidad): arranca en 3,5 y se acerca al
-- promedio real con cada reseña. Las reseñas ocultas no cuentan.
create function private.refresh_rating(seller uuid, business uuid, service uuid) returns void language plpgsql security definer set search_path = '' as $$
declare n integer; total integer;
begin
  if seller is not null then
    perform 1 from public.profiles where id = seller for update;
    select count(*), coalesce(sum(rating), 0) into n, total from public.reviews where seller_id = seller and not hidden;
    update public.profiles set rating_count = n, rating_avg = case when n > 0 then round(total::numeric / n, 2) end,
      rating_score = round((17.5 + total) / (5 + n), 3) where id = seller;
  elsif business is not null then
    perform 1 from public.businesses where id = business for update;
    select count(*), coalesce(sum(rating), 0) into n, total from public.reviews where business_id = business and not hidden;
    update public.businesses set rating_count = n, rating_avg = case when n > 0 then round(total::numeric / n, 2) end,
      rating_score = round((17.5 + total) / (5 + n), 3) where id = business;
  elsif service is not null then
    perform 1 from public.service_providers where id = service for update;
    select count(*), coalesce(sum(rating), 0) into n, total from public.reviews where service_provider_id = service and not hidden;
    update public.service_providers set rating_count = n, rating_avg = case when n > 0 then round(total::numeric / n, 2) end,
      rating_score = round((17.5 + total) / (5 + n), 3) where id = service;
  end if;
end;
$$;
create function private.review_ratings() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.refresh_rating(new.seller_id, new.business_id, new.service_provider_id);
  elsif tg_op = 'DELETE' then
    perform private.refresh_rating(old.seller_id, old.business_id, old.service_provider_id);
  elsif (new.rating, new.hidden, new.seller_id, new.business_id, new.service_provider_id)
      is distinct from (old.rating, old.hidden, old.seller_id, old.business_id, old.service_provider_id) then
    perform private.refresh_rating(old.seller_id, old.business_id, old.service_provider_id);
    perform private.refresh_rating(new.seller_id, new.business_id, new.service_provider_id);
  end if;
  return null;
end;
$$;
create trigger reviews_rules before insert on public.reviews for each row execute function private.review_rules();
create trigger reviews_updated before update on public.reviews for each row execute function private.touch_record();
create trigger reviews_account_guard before insert or update on public.reviews for each row execute function private.guard_account_write();
create trigger reviews_ratings after insert or update or delete on public.reviews for each row execute function private.review_ratings();

alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select to anon, authenticated using (
  not hidden or author_id = (select auth.uid()) or (select public.is_admin())
);
create policy reviews_own_insert on public.reviews for insert to authenticated with check (author_id = (select auth.uid()) and (select public.account_writable()));
create policy reviews_own_update on public.reviews for update to authenticated using (author_id = (select auth.uid()) and (select public.account_writable())) with check (author_id = (select auth.uid()));
create policy reviews_own_delete on public.reviews for delete to authenticated using (author_id = (select auth.uid()) and (select public.account_writable()));

-- Respuesta del reseñado: una por reseña, editable. Texto vacío la borra.
create function public.reply_review(review_id uuid, body text) returns void language plpgsql security definer set search_path = '' as $$
declare r public.reviews; target_owner uuid; clean text := nullif(btrim(coalesce(body, '')), '');
begin
  if not public.account_writable() then raise exception 'Account unavailable'; end if;
  select * into r from public.reviews where id = review_id;
  if not found then raise exception 'Review not found'; end if;
  target_owner := coalesce(r.seller_id,
    (select b.owner_id from public.businesses b where b.id = r.business_id),
    (select s.owner_id from public.service_providers s where s.id = r.service_provider_id));
  if target_owner is distinct from auth.uid() then raise exception 'Only the reviewed party can reply'; end if;
  update public.reviews set reply = clean, replied_at = case when clean is not null then now() end where id = review_id;
end;
$$;

-- ============================================================================
-- 8. Denuncias
-- ============================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  -- Exactamente un destino: un anuncio, un servicio, un comercio o una reseña.
  product_id uuid references public.products(id) on delete cascade,
  service_provider_id uuid references public.service_providers(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  reason text not null check (reason in ('estafa', 'datos_falsos', 'contenido_inapropiado', 'duplicado', 'otro')),
  details text check (char_length(details) <= 1000),
  status text not null default 'abierta' check (status in ('abierta', 'resuelta', 'descartada')),
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (num_nonnulls(product_id, service_provider_id, business_id, review_id) = 1),
  unique (reporter_id, product_id),
  unique (reporter_id, service_provider_id),
  unique (reporter_id, business_id),
  unique (reporter_id, review_id)
);
create index reports_queue on public.reports (status, created_at desc);
create index reports_product on public.reports (product_id) where product_id is not null;
create index reports_service on public.reports (service_provider_id) where service_provider_id is not null;
create index reports_business on public.reports (business_id) where business_id is not null;
create index reports_review on public.reports (review_id) where review_id is not null;
create trigger reports_account_guard before insert or update on public.reports for each row execute function private.guard_account_write();
alter table public.reports enable row level security;
create policy reports_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy reports_own_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()) and (select public.account_writable()));

-- ============================================================================
-- 9. Acciones de administración (para el panel propio; exigen estar en private.admins)
-- ============================================================================
create function public.admin_set_hidden(kind text, target uuid, hide boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if kind = 'product' then update public.products set hidden = hide where id = target;
  elsif kind = 'service' then update public.service_providers set hidden = hide where id = target;
  elsif kind = 'business' then update public.businesses set hidden = hide where id = target;
  elsif kind = 'review' then update public.reviews set hidden = hide where id = target;
  else raise exception 'Unknown kind';
  end if;
  if not found then raise exception 'Target not found'; end if;
end;
$$;
create function public.admin_review_business(business uuid, approved boolean, reason text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.business_verifications set status = case when approved then 'verificado' else 'rechazado' end,
    note = nullif(btrim(coalesce(reason, '')), '') where business_id = business;
  if not found then raise exception 'Verification not found'; end if;
end;
$$;
-- NULL en un parámetro deja esa insignia como está.
create function public.admin_set_service_badges(service uuid, license_ok boolean, references_ok boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.service_providers set verified = coalesce(license_ok, verified),
    references_verified = coalesce(references_ok, references_verified) where id = service;
  if not found then raise exception 'Service not found'; end if;
end;
$$;
create function public.admin_set_reference_status(reference uuid, new_status text, remark text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.service_references set status = new_status, admin_note = nullif(btrim(coalesce(remark, '')), ''),
    checked_at = case when new_status <> 'pendiente' then now() end where id = reference;
  if not found then raise exception 'Reference not found'; end if;
end;
$$;
create function public.admin_resolve_report(report uuid, new_status text, remark text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.reports set status = new_status, admin_note = nullif(btrim(coalesce(remark, '')), ''),
    resolved_at = case when new_status <> 'abierta' then now() end where id = report;
  if not found then raise exception 'Report not found'; end if;
end;
$$;

-- ============================================================================
-- 10. Permisos
-- ============================================================================
alter table public.localities enable row level security;
alter table public.categories enable row level security;
alter table public.trades enable row level security;
create policy localities_read on public.localities for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy trades_read on public.trades for select to anon, authenticated using (true);

revoke all on public.localities, public.categories, public.trades, public.product_images, public.business_verifications,
  public.service_references, public.reviews, public.reports from anon, authenticated;
grant select on public.localities, public.categories, public.trades, public.product_images, public.reviews to anon, authenticated;
grant select on public.profiles, public.businesses to anon;
grant select on public.business_verifications, public.service_references, public.reports to authenticated;

-- Columnas que cada persona puede escribir. Lo que no figura (verified, hidden, expires_at,
-- puntajes, estados de trámite) solo cambia por triggers o por las funciones de administración.
grant update (locality_id) on public.profiles to authenticated;
revoke insert on public.products, public.businesses from authenticated;
grant insert (owner_id, business_id, category_id, title, description, price, currency, condition, locality_id, operation, status, contact_phone, contact_email) on public.products to authenticated;
grant update (category_id, locality_id, operation, contact_phone, contact_email) on public.products to authenticated;
grant insert (owner_id, name, slug, description, phone, contact_email, address, locality_id) on public.businesses to authenticated;
grant update (phone, contact_email, address, locality_id) on public.businesses to authenticated;
grant insert (trade_id, locality_id, contact_email) on public.service_providers to authenticated;
grant update (trade_id, locality_id, contact_email) on public.service_providers to authenticated;
grant insert (product_id, owner_id, path, sort_order) on public.product_images to authenticated;
grant update (sort_order) on public.product_images to authenticated;
grant delete on public.product_images to authenticated;
grant insert (business_id, cuit, legal_name) on public.business_verifications to authenticated;
grant update (cuit, legal_name) on public.business_verifications to authenticated;
grant insert (service_provider_id, name, phone, detail) on public.service_references to authenticated;
grant delete on public.service_references to authenticated;
grant insert (author_id, seller_id, business_id, service_provider_id, rating, comment) on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant insert (reporter_id, product_id, service_provider_id, business_id, review_id, reason, details) on public.reports to authenticated;

grant select, insert, update, delete on public.localities, public.categories, public.trades, public.product_images,
  public.business_verifications, public.service_references, public.reviews, public.reports to service_role;

revoke execute on function public.is_admin(), public.cuit_is_valid(text), public.renew_product(uuid),
  public.set_product_images(uuid, text[]), public.reply_review(uuid, text), public.admin_set_hidden(text, uuid, boolean),
  public.admin_review_business(uuid, boolean, text), public.admin_set_service_badges(uuid, boolean, boolean),
  public.admin_set_reference_status(uuid, text, text), public.admin_resolve_report(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.is_admin(), public.cuit_is_valid(text) to anon, authenticated, service_role;
grant execute on function public.renew_product(uuid), public.set_product_images(uuid, text[]), public.reply_review(uuid, text),
  public.admin_set_hidden(text, uuid, boolean), public.admin_review_business(uuid, boolean, text),
  public.admin_set_service_badges(uuid, boolean, boolean), public.admin_set_reference_status(uuid, text, text),
  public.admin_resolve_report(uuid, text, text) to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- ============================================================================
-- 11. Descripciones visibles en el panel de Supabase
-- ============================================================================
comment on table public.localities is 'Los 19 departamentos de San Juan. Lista fija para anuncios, servicios, comercios y perfiles.';
comment on table public.categories is 'Rubros de productos. Todo anuncio lleva exactamente uno.';
comment on table public.trades is 'Oficios de la sección Servicios. requires_license indica si el oficio exige matrícula.';
comment on table public.profiles is 'Cuenta y ficha pública del vendedor: nombre, localidad y puntaje. Se crea sola al registrarse.';
comment on table public.businesses is 'Comercios, uno por cuenta. Público solo cuando verified = true.';
comment on table public.business_verifications is 'Trámite de verificación de cada comercio: CUIT, razón social y estado. Privada: dueño y administración.';
comment on table public.products is 'Anuncios de productos. Visibles si status = activo, sin ocultar y sin vencer (60 días, renovables).';
comment on column public.products.operation is 'Solo para el rubro inmuebles: venta o alquiler.';
comment on column public.products.expires_at is 'Fecha de vencimiento. La reinician renew_product() y volver a activar el anuncio.';
comment on table public.product_images is 'Fotos de cada anuncio (hasta 8). sort_order 0 es la portada. Se administran con set_product_images().';
comment on table public.service_providers is 'Servicios. La matrícula se exige solo si el oficio la requiere.';
comment on column public.service_providers.verified is 'Matrícula comprobada por la administración. Se retira sola si cambian matrícula, entidad u oficio.';
comment on column public.service_providers.references_verified is 'Referencias de clientes comprobadas por la administración. Se retira sola si cambia el oficio.';
comment on table public.service_references is 'Clientes anteriores que el trabajador ofrece como referencia. Privada: dueño y administración.';
comment on table public.reviews is 'Reseñas de 1 a 5 estrellas sobre un vendedor, un comercio o un servicio. Una por persona y destino.';
comment on table public.reports is 'Denuncias de anuncios, servicios, comercios o reseñas. Las ve quien denuncia y la administración.';
commit;
