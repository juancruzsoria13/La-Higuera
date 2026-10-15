begin;
-- Subcategorías y atributos opcionales: los anuncios existentes conservan NULL / {}.
create table public.product_attribute_definitions (
  id text primary key,
  definition jsonb not null check (jsonb_typeof(definition) = 'object')
);
create table public.product_subcategories (
  id text primary key,
  category_id text not null references public.categories(id),
  name text not null,
  attribute_keys text[] not null,
  sort_order smallint not null,
  unique (category_id, id)
);
insert into public.product_attribute_definitions (id, definition) values
  ('address', '{"label": "Calle y número", "type": "text", "maxLength": 200}'::jsonb),
  ('neighborhood', '{"label": "Barrio", "type": "text", "maxLength": 100}'::jsonb),
  ('surface', '{"label": "Superficie (m²)", "type": "number", "min": 0.01, "max": 100000000000, "step": "0.01"}'::jsonb),
  ('age', '{"label": "Antigüedad (años)", "type": "number", "min": 0, "max": 1000, "step": "1"}'::jsonb),
  ('bedrooms', '{"label": "Dormitorios", "type": "number", "min": 0, "max": 100, "step": "1"}'::jsonb),
  ('bathrooms', '{"label": "Baños", "type": "number", "min": 0, "max": 100, "step": "1"}'::jsonb),
  ('garages', '{"label": "Cocheras", "type": "number", "min": 0, "max": 100, "step": "1"}'::jsonb),
  ('credit_eligible', '{"label": "Apto crédito", "type": "select", "options": [{"id": "si", "name": "Sí"}, {"id": "no", "name": "No"}]}'::jsonb),
  ('maps_url', '{"label": "Ubicación en Google Maps", "type": "url", "maxLength": 2048}'::jsonb),
  ('brand', '{"label": "Marca", "type": "text", "maxLength": 80}'::jsonb),
  ('model', '{"label": "Modelo", "type": "text", "maxLength": 100}'::jsonb),
  ('year', '{"label": "Año", "type": "number", "min": 1886, "max": 2100, "step": "1"}'::jsonb),
  ('mileage', '{"label": "Kilometraje (km)", "type": "number", "min": 0, "max": 10000000, "step": "1"}'::jsonb),
  ('fuel', '{"label": "Combustible", "type": "select", "options": [{"id": "nafta", "name": "Nafta"}, {"id": "diesel", "name": "Diésel"}, {"id": "gnc", "name": "GNC"}, {"id": "nafta-gnc", "name": "Nafta / GNC"}, {"id": "electrico", "name": "Eléctrico"}, {"id": "hibrido", "name": "Híbrido"}, {"id": "otro", "name": "Otro"}]}'::jsonb),
  ('transmission', '{"label": "Transmisión", "type": "select", "options": [{"id": "manual", "name": "Manual"}, {"id": "automatica", "name": "Automática"}]}'::jsonb),
  ('bike_type', '{"label": "Tipo de bicicleta", "type": "select", "options": [{"id": "urbana", "name": "Urbana"}, {"id": "montana", "name": "Montaña"}, {"id": "ruta", "name": "Ruta"}]}'::jsonb),
  ('wheel_size', '{"label": "Rodado", "type": "text", "maxLength": 20}'::jsonb),
  ('compatible_brand', '{"label": "Marca de vehículo compatible", "type": "text", "maxLength": 80}'::jsonb),
  ('compatible_model', '{"label": "Modelo de vehículo compatible", "type": "text", "maxLength": 100}'::jsonb);
insert into public.product_subcategories (id, category_id, name, attribute_keys, sort_order) values
  ('casas', 'inmuebles', 'Casas', array['address', 'neighborhood', 'surface', 'age', 'bedrooms', 'bathrooms', 'garages', 'credit_eligible', 'maps_url'], 1),
  ('departamentos', 'inmuebles', 'Departamentos', array['address', 'neighborhood', 'surface', 'age', 'bedrooms', 'bathrooms', 'garages', 'credit_eligible', 'maps_url'], 2),
  ('cocheras', 'inmuebles', 'Cocheras', array['address', 'neighborhood', 'surface', 'age', 'credit_eligible', 'maps_url'], 3),
  ('terrenos-lotes', 'inmuebles', 'Terrenos y lotes', array['address', 'neighborhood', 'surface', 'credit_eligible', 'maps_url'], 4),
  ('locales-salones-oficinas', 'inmuebles', 'Locales, salones y oficinas', array['address', 'neighborhood', 'surface', 'age', 'bathrooms', 'garages', 'credit_eligible', 'maps_url'], 5),
  ('galpones-depositos', 'inmuebles', 'Galpones y depósitos', array['address', 'neighborhood', 'surface', 'age', 'bathrooms', 'garages', 'credit_eligible', 'maps_url'], 6),
  ('fincas-campos', 'inmuebles', 'Fincas y campos', array['address', 'neighborhood', 'surface', 'age', 'bedrooms', 'bathrooms', 'garages', 'credit_eligible', 'maps_url'], 7),
  ('autos', 'vehiculos', 'Autos', array['brand', 'model', 'year', 'mileage', 'fuel', 'transmission'], 8),
  ('motos', 'vehiculos', 'Motos', array['brand', 'model', 'year', 'mileage', 'fuel', 'transmission'], 9),
  ('camionetas-utilitarios', 'vehiculos', 'Camionetas y utilitarios', array['brand', 'model', 'year', 'mileage', 'fuel', 'transmission'], 10),
  ('camiones', 'vehiculos', 'Camiones', array['brand', 'model', 'year', 'mileage', 'fuel', 'transmission'], 11),
  ('bicicletas', 'vehiculos', 'Bicicletas', array['brand', 'bike_type', 'wheel_size'], 12),
  ('nautica', 'vehiculos', 'Náutica', array['brand', 'model', 'year', 'mileage', 'fuel', 'transmission'], 13),
  ('repuestos-accesorios', 'vehiculos', 'Repuestos y accesorios', array['compatible_brand', 'compatible_model'], 14);

alter table public.product_attribute_definitions enable row level security;
alter table public.product_subcategories enable row level security;
create policy product_attribute_definitions_read on public.product_attribute_definitions for select to anon, authenticated using (true);
create policy product_subcategories_read on public.product_subcategories for select to anon, authenticated using (true);
revoke all on public.product_attribute_definitions, public.product_subcategories from anon, authenticated;
grant select on public.product_attribute_definitions, public.product_subcategories to anon, authenticated;
grant all on public.product_attribute_definitions, public.product_subcategories to service_role;

alter table public.products
  add column subcategory_id text,
  add column attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  add constraint products_subcategory_category_fk foreign key (category_id, subcategory_id)
    references public.product_subcategories(category_id, id);
grant insert (subcategory_id, attributes), update (subcategory_id, attributes) on public.products to authenticated;

create function private.validate_product_attributes() returns trigger
language plpgsql set search_path = '' as $$
declare
  allowed text[];
  item record;
  spec jsonb;
  value text;
  number numeric;
  normalized jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(new.attributes) <> 'object' then
    raise exception 'Las características deben ser un objeto.';
  end if;
  select attribute_keys into allowed from public.product_subcategories
    where id = new.subcategory_id and category_id = new.category_id;
  for item in select entry.key, entry.value from jsonb_each(new.attributes) as entry loop
    if allowed is null or not (item.key = any(allowed)) then
      raise exception 'La característica no corresponde a la subcategoría.';
    end if;
    if jsonb_typeof(item.value) <> 'string' then
      raise exception 'El valor de la característica debe ser texto.';
    end if;
    value := btrim(item.value #>> '{}');
    if value = '' then continue; end if;
    select definition into spec from public.product_attribute_definitions where id = item.key;
    if spec is null or char_length(value) > coalesce((spec->>'maxLength')::int, 120) then
      raise exception 'Característica inválida.';
    end if;
    if spec->>'type' = 'select' then
      if not exists(select 1 from jsonb_array_elements(spec->'options') as choices(option) where choices.option->>'id' = value) then
        raise exception 'Opción de característica inválida.';
      end if;
    elsif spec->>'type' = 'number' then
      if (spec->>'step' = '0.01' and value !~ '^[0-9]{1,12}([.,][0-9]{1,2})?$')
        or (spec->>'step' <> '0.01' and value !~ '^[0-9]{1,12}$') then
        raise exception 'Número inválido.';
      end if;
      value := replace(value, ',', '.');
      number := value::numeric;
      if number < (spec->>'min')::numeric or number > (spec->>'max')::numeric then
        raise exception 'Número fuera del rango permitido.';
      end if;
    elsif spec->>'type' = 'url' then
      if value !~ '^https://(maps[.]app[.]goo[.]gl|maps[.]google[.]com)([/?#]|$)'
        and value !~ '^https://goo[.]gl/maps/'
        and value !~ '^https://(www[.])?google[.]com([.]ar)?/maps([/?#]|$)' then
        raise exception 'Usá un enlace HTTPS de Google Maps.';
      end if;
    end if;
    normalized := normalized || jsonb_build_object(item.key, value);
  end loop;
  new.attributes := normalized;
  return new;
end;
$$;
create trigger products_validate_attributes before insert or update of category_id, subcategory_id, attributes
  on public.products for each row execute function private.validate_product_attributes();
revoke all on function private.validate_product_attributes() from public, anon, authenticated;

comment on column public.products.subcategory_id is 'Opcional para anuncios anteriores. La subcategoría pertenece al rubro.';
comment on column public.products.attributes is 'Características opcionales por subcategoría, validadas también por la base.';
commit;
