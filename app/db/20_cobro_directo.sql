-- Coruña Atlantics — Cobrar es apuntar
-- Ejecutar DESPUÉS de 19_tienda_cierre.sql.
--
-- El paso de "pasar lo cobrado a la caja" sobraba: marcar que alguien te ha
-- pagado y apuntar ese dinero son el mismo hecho, y separarlos solo servía para
-- que se olvidase el segundo. Ahora el botón Cobrar hace las dos cosas.
--
-- Con un matiz: quien lleva la tienda pero no la tesorería puede seguir
-- marcando quién le ha pagado, pero ese apunte no lo hace él. Se queda
-- pendiente y lo mete en la caja quien lleva las cuentas, con el botón que ya
-- existe. Marcar un cobro es de la tienda; escribir en la caja, de la
-- tesorería, y esa frontera no se cruza por comodidad.

create or replace function cobrar_pedido(p_pedido uuid, p_pagado boolean, p_temporada uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pedido    pedidos%rowtype;
  v_producto  productos%rowtype;
  v_quien     text;
  v_mov       uuid;
begin
  if not puede('tienda') then
    raise exception 'No llevas la tienda';
  end if;

  select * into v_pedido from pedidos where id = p_pedido;
  if not found then raise exception 'Pedido no encontrado'; end if;

  select * into v_producto from productos where id = v_pedido.producto_id;

  -- Deshacer un cobro que ya esta en la caja es tocar la caja.
  if not p_pagado and v_pedido.movimiento_id is not null then
    if not puede('tesoreria') then
      raise exception 'Ese cobro ya esta en la caja: solo puede deshacerlo quien lleve la tesoreria';
    end if;
    delete from movimientos where id = v_pedido.movimiento_id;
    update pedidos set pagado = false, movimiento_id = null where id = p_pedido;
    return null;
  end if;

  if not p_pagado then
    update pedidos set pagado = false where id = p_pedido;
    return null;
  end if;

  -- Ya estaba cobrado y apuntado: no se duplica.
  if v_pedido.pagado and v_pedido.movimiento_id is not null then
    return v_pedido.movimiento_id;
  end if;

  -- Sin la llave de la tesoreria se marca el cobro y ahi se queda, esperando a
  -- quien lleve las cuentas.
  if not puede('tesoreria') then
    update pedidos set pagado = true where id = p_pedido;
    return null;
  end if;

  select trim(nombre || ' ' || coalesce(apellidos, '')) into v_quien
  from perfiles where id = v_pedido.jugador_id;

  insert into movimientos (temporada_id, tipo, concepto, categoria, importe, metodo, registrado_por)
  values (p_temporada, 'ingreso',
          'Tienda — ' || v_producto.nombre || coalesce(' · ' || v_quien, ''),
          'merchandising',
          v_producto.precio * v_pedido.cantidad,
          'bizum', mi_perfil_id())
  returning id into v_mov;

  update pedidos set pagado = true, movimiento_id = v_mov where id = p_pedido;
  return v_mov;
end $$;

comment on function cobrar_pedido is
  'Marca un pedido como cobrado y mete ese dinero en la caja de una vez. Al desmarcarlo, retira el apunte.';

revoke execute on function cobrar_pedido(uuid, boolean, uuid) from anon;
grant execute on function cobrar_pedido(uuid, boolean, uuid) to authenticated;
