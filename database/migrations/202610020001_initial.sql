begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  locality text not null default 'San Juan' check (char_length(btrim(locality)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  description text check (char_length(description) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 5000),
  price numeric(14,2) not null check (price >= 0 and price <= 999999999999.99),
  currency text not null check (currency in ('ARS', 'USD')),
  category text not null check (category in ('Tecnología', 'Hogar', 'Vehículos', 'Otros')),
  condition text not null check (condition in ('nuevo', 'usado')),
  locality text not null check (char_length(btrim(locality)) between 2 and 80),
  status text not null default 'activo' check (status in ('activo', 'pausado', 'vendido')),
  image_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, owner_id) references public.businesses(id, owner_id),
  check (image_path is null or image_path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.webp$'))
);
create index products_public_feed on public.products (created_at desc, id desc) where status = 'activo';
create index products_category_feed on public.products (category, created_at desc) where status = 'activo';
create index products_owner on public.products (owner_id, created_at desc);
create index products_business on public.products (business_id, owner_id);
create index businesses_owner on public.businesses (owner_id);
create extension if not exists pg_trgm with schema extensions;
create index products_title_search on public.products using gin (title extensions.gin_trgm_ops);

-- Durable outbox: no FK, so jobs survive an Auth account deletion.
create table public.storage_cleanup (
  path text primary key,
  owner_id uuid not null,
  ready boolean not null default false,
  created_at timestamptz not null default now()
);
create table private.account_deletions (user_id uuid primary key references auth.users(id) on delete cascade);

create function public.account_writable() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id = auth.uid())
  and not exists(select 1 from private.account_deletions where user_id = auth.uid());
$$;
create function private.touch_record() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id then raise exception 'Immutable id'; end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), 'Mi perfil'));
  return new;
end;
$$;
create trigger auth_user_created after insert on auth.users for each row execute function private.create_profile();
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_record();
create trigger businesses_updated before update on public.businesses for each row execute function private.touch_record();
create trigger products_updated before update on public.products for each row execute function private.touch_record();

create function private.product_images() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'DELETE' and new.image_path is not null then
    if tg_op = 'INSERT' or new.image_path is distinct from old.image_path then
      perform 1 from public.storage_cleanup where path = new.image_path and owner_id = new.owner_id
        and not ready and created_at > now() - interval '24 hours' for update;
      if not found then
        raise exception 'Image reservation expired or already used';
      end if;
    end if;
    if not exists(select 1 from storage.objects where bucket_id = 'product-images' and name = new.image_path) then
      raise exception 'Image does not exist';
    end if;
    delete from public.storage_cleanup where path = new.image_path;
  end if;
  if tg_op <> 'INSERT' and old.image_path is not null then
    if tg_op = 'DELETE' or old.image_path is distinct from new.image_path then
      insert into public.storage_cleanup(path, owner_id, ready) values(old.image_path, old.owner_id, true)
      on conflict(path) do update set ready = true;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger product_image_cleanup after insert or update or delete on public.products for each row execute function private.product_images();

-- Serialize writes with account deletion, including requests already in flight.
create function private.guard_account_write() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_schema = 'storage' then
    if new.bucket_id <> 'product-images' then return new; end if;
  end if;
  if auth.role() = 'authenticated' then
    perform 1 from public.profiles where id = auth.uid() for update;
    if not public.account_writable() then raise exception 'Account deletion in progress'; end if;
  end if;
  return new;
end;
$$;
create trigger products_account_guard before insert or update on public.products for each row execute function private.guard_account_write();
create trigger businesses_account_guard before insert or update on public.businesses for each row execute function private.guard_account_write();
create trigger storage_account_guard before insert or update on storage.objects for each row execute function private.guard_account_write();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.storage_cleanup enable row level security;
alter table private.account_deletions enable row level security;

revoke all on public.profiles, public.businesses, public.products, public.storage_cleanup from anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.profiles, public.businesses, public.storage_cleanup to authenticated;
grant insert, delete on public.products, public.businesses to authenticated;
grant update(display_name, locality) on public.profiles to authenticated;
grant update(name, slug, description) on public.businesses to authenticated;
grant update(business_id, title, description, price, currency, category, condition, locality, status, image_path) on public.products to authenticated;
grant delete on public.storage_cleanup to authenticated;

create policy profiles_own_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated using (id = (select auth.uid()) and (select public.account_writable())) with check (id = (select auth.uid()));
create policy businesses_own_read on public.businesses for select to authenticated using (owner_id = (select auth.uid()));
create policy businesses_own_insert on public.businesses for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy businesses_own_update on public.businesses for update to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable())) with check (owner_id = (select auth.uid()));
create policy businesses_own_delete on public.businesses for delete to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy products_read on public.products for select to anon, authenticated using (status = 'activo' or owner_id = (select auth.uid()));
create policy products_own_insert on public.products for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy products_own_update on public.products for update to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable())) with check (owner_id = (select auth.uid()));
create policy products_own_delete on public.products for delete to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy cleanup_own_read on public.storage_cleanup for select to authenticated using (owner_id = (select auth.uid()));
create policy cleanup_own_delete on public.storage_cleanup for delete to authenticated using (owner_id = (select auth.uid()));

-- Only the public seller name of a visible product is exposed; no public profile table.
create function public.product_seller(product_id uuid) returns text language sql stable security definer set search_path = '' as $$
  select p.display_name from public.profiles p join public.products x on x.owner_id = p.id
  where x.id = product_id and (x.status = 'activo' or x.owner_id = auth.uid());
$$;
create function public.reserve_image() returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if not public.account_writable() then raise exception 'Account unavailable'; end if;
  result := auth.uid()::text || '/' || gen_random_uuid()::text || '.webp';
  insert into public.storage_cleanup(path, owner_id) values(result, auth.uid());
  return result;
end;
$$;
create function public.abandon_image(image text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.storage_cleanup set ready = true where path = image and owner_id = auth.uid()
  and not exists(select 1 from public.products where image_path = image);
end;
$$;
create function public.begin_account_deletion() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  insert into private.account_deletions(user_id) values(auth.uid()) on conflict do nothing;
end;
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/webp'])
-- Si el bucket ya existe (por ejemplo al recrear la base), se conserva y se reafirma su configuración.
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy image_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'product-images' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.products where image_path = name and status = 'activo')
  )
);
create policy image_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.account_writable())
  and exists(select 1 from public.storage_cleanup where path = name and owner_id = (select auth.uid()) and not ready)
);
-- No UPDATE policy: images are immutable and replacements always use a fresh path.
create policy image_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists(select 1 from public.products where image_path = name)
);

revoke execute on function public.account_writable(), public.product_seller(uuid), public.reserve_image(), public.abandon_image(text), public.begin_account_deletion() from public;
grant execute on function public.product_seller(uuid) to anon, authenticated;
grant execute on function public.account_writable(), public.reserve_image(), public.abandon_image(text), public.begin_account_deletion() to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
commit;
