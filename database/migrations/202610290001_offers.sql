begin;
-- Ofertas: precio rebajado y descuento exclusivo para quien llega desde La Higuera.
-- Un anuncio es oferta si tiene cualquiera de los dos; los existentes quedan sin oferta.

alter table public.products
  add column previous_price numeric(14,2),
  add column exclusive_discount smallint check (exclusive_discount between 1 and 90),
  add constraint products_previous_price_higher check (previous_price is null or previous_price > price);

-- El precio anterior no se escribe a mano (no tiene permiso de columna): lo deja este trigger cuando
-- el dueño baja el precio en la misma moneda. Conserva el más alto si baja varias veces y se borra
-- si el precio vuelve a llegar al anterior o si cambia la moneda.
create function private.product_previous_price() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.currency <> old.currency then
    new.previous_price := null;
  elsif new.price < old.price then
    new.previous_price := greatest(old.price, old.previous_price);
  elsif new.price >= old.previous_price then
    new.previous_price := null;
  end if;
  return new;
end;
$$;
create trigger products_previous_price before update of price, currency on public.products
  for each row execute function private.product_previous_price();

-- El descuento exclusivo lo declara el vendedor: lo carga y lo edita desde el formulario.
grant insert (exclusive_discount), update (exclusive_discount) on public.products to authenticated;

commit;
