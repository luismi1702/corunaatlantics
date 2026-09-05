-- Coruña Atlantics — Cerrar el ciclo de la tienda
-- Ejecutar DESPUÉS de 18_capitanes.sql.
--
-- El estado 'entregado' existía en el enum desde el principio y no lo ponía
-- nadie: no había ningún botón que lo pusiera. El pedido nunca se cerraba, y
-- como la app solo impide cancelar cuando está entregado, un jugador podía
-- retirar un pedido que ya había pagado.
--
-- Y lo cobrado por la tienda no llegaba a la caja. Se apuntaba quién había
-- pagado, pero ese dinero no existía para la tesorería.
--
-- Esto cierra las dos cosas: el pedido llega a entregado, y lo cobrado se pasa
-- a tesorería una sola vez.

alter table pedidos
  add column if not exists entregado_en date,
  add column if not exists movimiento_id uuid references movimientos(id) on delete set null;

comment on column pedidos.movimiento_id is
  'El apunte de tesoreria que ya se llevo este cobro. Sin el, el dinero no ha entrado en la caja; con el, no se puede meter dos veces. Si se borra el movimiento vuelve a null y se puede reapuntar.';

create index if not exists pedidos_sin_apuntar_idx
  on pedidos (producto_id) where pagado and movimiento_id is null;

-- ---------------------------------------------------------------------------
-- El pedido del jugador, con cerrojo
--   La politica le deja escribir su propia fila entera, asi que hasta ahora
--   podia marcarse como pagado el solo. Lo unico que le toca decidir es si
--   retira el pedido, y solo mientras no se lo hayan dado.
-- ---------------------------------------------------------------------------

create or replace function bloquear_campos_del_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or puede('tienda') then
    return new;
  end if;

  new.producto_id   := old.producto_id;
  new.jugador_id    := old.jugador_id;
  new.talla         := old.talla;
  new.cantidad      := old.cantidad;
  new.pagado        := old.pagado;
  new.entregado_en  := old.entregado_en;
  new.movimiento_id := old.movimiento_id;

  -- Único movimiento suyo: retirarlo, y solo si sigue pendiente.
  if not (old.estado = 'pedido' and new.estado = 'cancelado') then
    new.estado := old.estado;
  end if;

  return new;
end $$;

drop trigger if exists pedidos_bloquear_campos on pedidos;
create trigger pedidos_bloquear_campos before update on pedidos
  for each row execute function bloquear_campos_del_pedido();

-- ---------------------------------------------------------------------------
-- Pasar lo cobrado a la caja
--   Un solo apunte por producto con todo lo que se haya cobrado y no se haya
--   llevado aun. Va en una funcion y no en la app porque las dos escrituras
--   —crear el movimiento y marcar los pedidos— tienen que ser una sola: si se
--   quedasen a medias, el dinero entraria dos veces o ninguna.
-- ---------------------------------------------------------------------------

create or replace function apuntar_tienda_en_tesoreria(p_producto uuid, p_temporada uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_total numeric(10,2);
  v_nombre text;
  v_mov uuid;
begin
  if not puede('tienda') or not puede('tesoreria') then
    raise exception 'Hace falta llevar la tienda y la tesorería para apuntar el cobro';
  end if;

  select nombre into v_nombre from productos where id = p_producto;
  if not found then raise exception 'Producto no encontrado'; end if;

  select coalesce(sum(pr.precio * pe.cantidad), 0) into v_total
  from pedidos pe
  join productos pr on pr.id = pe.producto_id
  where pe.producto_id = p_producto
    and pe.estado <> 'cancelado'
    and pe.pagado
    and pe.movimiento_id is null;

  if v_total <= 0 then
    raise exception 'No hay nada cobrado pendiente de apuntar';
  end if;

  insert into movimientos (temporada_id, tipo, concepto, categoria, importe, metodo, registrado_por)
  values (p_temporada, 'ingreso', 'Tienda — ' || v_nombre, 'merchandising', v_total, 'bizum', mi_perfil_id())
  returning id into v_mov;

  update pedidos
  set movimiento_id = v_mov
  where producto_id = p_producto
    and estado <> 'cancelado'
    and pagado
    and movimiento_id is null;

  return v_mov;
end $$;

comment on function apuntar_tienda_en_tesoreria is
  'Mete en la caja lo cobrado de un producto que aun no se habia apuntado, y lo marca para no repetirlo.';

revoke execute on function apuntar_tienda_en_tesoreria(uuid, uuid) from anon;
grant execute on function apuntar_tienda_en_tesoreria(uuid, uuid) to authenticated;
