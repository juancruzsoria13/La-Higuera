begin;
-- Perfiles públicos de trabajadores de oficio. `verified` solo lo cambia la administración
-- (service_role / SQL Editor); quien publica declara su matrícula pero no puede marcarla verificada.
create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  trade text not null check (trade in ('Gasista', 'Plomero', 'Electricista', 'Albañil', 'Pintor', 'Carpintero', 'Herrero', 'Refrigeración', 'Cerrajero', 'Otros oficios')),
  license_number text not null check (char_length(btrim(license_number)) between 2 and 40),
  license_body text not null check (char_length(btrim(license_body)) between 2 and 100),
  description text not null check (char_length(btrim(description)) between 10 and 3000),
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  locality text not null check (char_length(btrim(locality)) between 2 and 80),
  status text not null default 'activo' check (status in ('activo', 'pausado')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_providers_feed on public.service_providers (created_at desc, id desc) where status = 'activo';
create index service_providers_trade on public.service_providers (trade, created_at desc) where status = 'activo';
create index service_providers_owner on public.service_providers (owner_id, created_at desc);
create index service_providers_name_search on public.service_providers using gin (name extensions.gin_trgm_ops);

create function private.service_provider_license() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() = 'authenticated' then new.verified := false; end if;
  elsif auth.role() = 'authenticated' and (new.license_number, new.license_body, new.trade) is distinct from (old.license_number, old.license_body, old.trade) then
    new.verified := false;
  end if;
  return new;
end;
$$;
create trigger service_providers_license before insert or update on public.service_providers for each row execute function private.service_provider_license();
create trigger service_providers_updated before update on public.service_providers for each row execute function private.touch_record();
create trigger service_providers_account_guard before insert or update on public.service_providers for each row execute function private.guard_account_write();

alter table public.service_providers enable row level security;
revoke all on public.service_providers from anon, authenticated;
grant select on public.service_providers to anon, authenticated;
grant insert (owner_id, name, trade, license_number, license_body, description, phone, locality, status) on public.service_providers to authenticated;
grant update (name, trade, license_number, license_body, description, phone, locality, status) on public.service_providers to authenticated;
grant delete on public.service_providers to authenticated;
create policy services_read on public.service_providers for select to anon, authenticated using (status = 'activo' or owner_id = (select auth.uid()));
create policy services_own_insert on public.service_providers for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.account_writable()));
create policy services_own_update on public.service_providers for update to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable())) with check (owner_id = (select auth.uid()));
create policy services_own_delete on public.service_providers for delete to authenticated using (owner_id = (select auth.uid()) and (select public.account_writable()));
commit;
