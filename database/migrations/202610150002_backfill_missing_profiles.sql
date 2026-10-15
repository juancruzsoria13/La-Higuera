begin;

-- Las cuentas de Auth creadas antes de instalar el trigger pueden seguir activas
-- sin perfil. Eso impide reservar imágenes y publicar anuncios.
with missing as (
  select u.id,
    btrim(left(btrim(coalesce(
      nullif(btrim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'name'), ''),
      ''
    )), 80)) as label
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
    and not exists (
      select 1 from private.account_deletions d where d.user_id = u.id
    )
)
insert into public.profiles (id, display_name)
select id, case when char_length(label) >= 2 then label else 'Mi perfil' end
from missing
on conflict (id) do nothing;

commit;
