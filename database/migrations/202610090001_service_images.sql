begin;
-- Fotos de servicios: una foto de perfil (opcional) y hasta 8 de trabajos realizados (opcionales).
-- Mismo circuito que las fotos de anuncios: reserve_image(), subir al bucket product-images y
-- después set_service_images() deja la lista final en una sola transacción.

alter table public.service_providers add constraint service_providers_id_owner_key unique (id, owner_id);

create table public.service_images (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid not null,
  owner_id uuid not null,
  kind text not null check (kind in ('perfil', 'trabajo')),
  path text not null unique,
  sort_order smallint not null check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  foreign key (service_provider_id, owner_id) references public.service_providers(id, owner_id) on delete cascade,
  -- Una sola foto de perfil (siempre en la posición 0) y un orden único entre las de trabajos.
  constraint service_images_order_key unique (service_provider_id, kind, sort_order) deferrable initially immediate,
  check (kind = 'trabajo' or sort_order = 0),
  check (path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.webp$'))
);

-- Consume la reserva al vincular la foto y encola el archivo cuando la foto se quita.
create function private.service_image_files() returns trigger language plpgsql security definer set search_path = '' as $$
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
    if (new.path, new.owner_id, new.service_provider_id, new.kind) is distinct from (old.path, old.owner_id, old.service_provider_id, old.kind) then
      raise exception 'Image rows are immutable';
    end if;
    return new;
  end if;
  insert into public.storage_cleanup(path, owner_id, ready) values(old.path, old.owner_id, true)
  on conflict(path) do update set ready = true;
  return old;
end;
$$;
create trigger service_images_files after insert or update or delete on public.service_images for each row execute function private.service_image_files();
create trigger service_images_account_guard before insert or update on public.service_images for each row execute function private.guard_account_write();

alter table public.service_images enable row level security;
-- Una foto se ve si se ve su servicio (la política de service_providers decide).
create policy service_images_read on public.service_images for select to anon, authenticated using (
  exists(select 1 from public.service_providers s where s.id = service_images.service_provider_id)
);
create policy service_images_own_insert on public.service_images for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy service_images_own_update on public.service_images for update to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable())) with check (owner_id = (select auth.uid()));
create policy service_images_own_delete on public.service_images for delete to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable()));

-- Deja las fotos del servicio exactamente así: `avatar` (o ninguna si es null) y `works` en ese orden.
-- Agrega las nuevas (ya subidas con reserve_image), reordena y quita el resto. Todo o nada.
create function public.set_service_images(service_provider_id uuid, avatar text, works text[]) returns void language plpgsql set search_path = '' as $$
declare wanted text[] := coalesce(works, '{}'); everything text[];
begin
  if cardinality(wanted) > 8 then raise exception 'Too many images'; end if;
  everything := wanted || case when avatar is null then '{}'::text[] else array[avatar] end;
  if array_position(wanted, null) is not null or cardinality(everything) <> (select count(distinct w) from unnest(everything) w) then
    raise exception 'Invalid image list';
  end if;
  if not exists(select 1 from public.service_providers s where s.id = set_service_images.service_provider_id and s.owner_id = auth.uid()) then
    raise exception 'Service not found';
  end if;
  delete from public.service_images i where i.service_provider_id = set_service_images.service_provider_id
    -- `is not distinct from`: con avatar null, la foto de perfil actual también se quita.
    and not ((i.kind = 'perfil' and i.path is not distinct from avatar) or (i.kind = 'trabajo' and i.path = any(wanted)));
  update public.service_images i set sort_order = w.ord - 1 from unnest(wanted) with ordinality w(path, ord)
  where i.service_provider_id = set_service_images.service_provider_id and i.kind = 'trabajo' and i.path = w.path;
  insert into public.service_images (service_provider_id, owner_id, kind, path, sort_order)
    select set_service_images.service_provider_id, auth.uid(), 'trabajo', w.path, w.ord - 1 from unnest(wanted) with ordinality w(path, ord)
    where not exists(select 1 from public.service_images i where i.path = w.path);
  if avatar is not null and not exists(select 1 from public.service_images i where i.path = avatar) then
    insert into public.service_images (service_provider_id, owner_id, kind, path, sort_order)
      values (set_service_images.service_provider_id, auth.uid(), 'perfil', avatar, 0);
  end if;
  if (select count(*) from public.service_images i where i.service_provider_id = set_service_images.service_provider_id) <> cardinality(everything) then
    raise exception 'Invalid image list';
  end if;
end;
$$;

-- Una foto vinculada a un anuncio o a un servicio no se puede abandonar ni borrar de Storage.
create or replace function public.abandon_image(image text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.storage_cleanup set ready = true where path = image and owner_id = auth.uid()
  and not exists(select 1 from public.product_images i where i.path = image)
  and not exists(select 1 from public.service_images i where i.path = image);
end;
$$;
drop policy image_read on storage.objects;
drop policy image_delete on storage.objects;
create policy image_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'product-images' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists(select 1 from public.product_images i where i.path = name)
    or exists(select 1 from public.service_images i where i.path = name)
  )
);
create policy image_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists(select 1 from public.product_images i where i.path = name)
  and not exists(select 1 from public.service_images i where i.path = name)
);

revoke all on public.service_images from anon, authenticated;
grant select on public.service_images to anon, authenticated;
grant insert (service_provider_id, owner_id, kind, path, sort_order) on public.service_images to authenticated;
grant update (sort_order) on public.service_images to authenticated;
grant delete on public.service_images to authenticated;
grant select, insert, update, delete on public.service_images to service_role;
revoke execute on function public.set_service_images(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.set_service_images(uuid, text, text[]) to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

comment on table public.service_images is 'Fotos de cada servicio: una de perfil (kind = perfil) y hasta 8 de trabajos realizados (kind = trabajo). Se administran con set_service_images().';
commit;
