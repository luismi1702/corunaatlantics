-- Coruña Atlantics — El jugador avisa de que ha pagado y tesorería lo valida
-- Ejecutar DESPUÉS de 30_identidad.sql.
--
-- Hasta ahora el jugador pagaba por Bizum y luego tenía que decírselo a alguien
-- por WhatsApp, y quien llevaba las cuentas lo apuntaba a mano cuando se
-- acordaba. Ahora el jugador toca "Ya he pagado" en su ficha, a tesorería le
-- llega un aviso al móvil, lo comprueba en el banco y lo valida con un toque.
-- Al validarlo se apunta el pago de verdad, y la cuota pasa sola a "al día"
-- porque `cuotas_estado` se calcula a partir de los pagos.
--
-- Lo que dice el jugador NO es un pago: es un aviso. Va en su propia tabla y
-- no cuenta como cobrado hasta que alguien con la llave de tesorería lo valida.
-- Si contara directamente, cualquiera podría ponerse al día tocando un botón.
--
-- Nadie escribe en la tabla directamente: el jugador avisa con
-- `avisar_pago`, y tesorería resuelve con `validar_pago_avisado` o
-- `rechazar_pago_avisado`. Así cada paso comprueba quién lo da.

create table if not exists pagos_avisados (
  id            uuid primary key default gen_random_uuid(),
  cuota_id      uuid not null references cuotas(id) on delete cascade,
  jugador_id    uuid not null references perfiles(id) on delete cascade,
  importe       numeric(10,2) not null check (importe > 0),
  metodo        metodo_pago not null default 'bizum',
  fecha         date not null default current_date,
  nota          text,
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente', 'validado', 'rechazado')),
  motivo        text,
  pago_id       uuid references pagos(id) on delete set null,
  revisado_por  uuid references perfiles(id) on delete set null,
  revisado_en   timestamptz,
  -- Para que el aviso al móvil de tesorería salga una vez por aviso de pago y
  -- no cada vez que alguien llame a la función.
  staff_avisado boolean not null default false,
  creado_en     timestamptz not null default now()
);

-- Uno pendiente por cuota: si el jugador vuelve a avisar, se corrige el que
-- había en vez de amontonar dos que tesorería tendría que adivinar.
create unique index if not exists pagos_avisados_uno_pendiente
  on pagos_avisados (cuota_id) where estado = 'pendiente';
create index if not exists pagos_avisados_jugador_idx on pagos_avisados (jugador_id);

comment on table pagos_avisados is
  'El jugador dice que ha pagado. No es dinero cobrado hasta que tesorería lo valida.';

alter table pagos_avisados enable row level security;

-- Cada uno ve los suyos; tesorería, todos. Sin políticas de escritura: solo
-- se escribe por las funciones de abajo.
drop policy if exists pagos_avisados_ver on pagos_avisados;
create policy pagos_avisados_ver on pagos_avisados
  for select to authenticated
  using (jugador_id = mi_perfil_id() or puede('tesoreria'));

-- ---------------------------------------------------------------------------
-- El jugador avisa
-- ---------------------------------------------------------------------------

create or replace function avisar_pago(
  p_cuota uuid, p_importe numeric, p_metodo metodo_pago,
  p_fecha date default current_date, p_nota text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cuota  cuotas%rowtype;
  v_id     uuid;
begin
  select * into v_cuota from cuotas where id = p_cuota;
  if not found or v_cuota.jugador_id is distinct from mi_perfil_id() then
    raise exception 'Esa cuota no es tuya';
  end if;
  if v_cuota.exento then
    raise exception 'Estás exento de cuota';
  end if;
  if p_importe is null or p_importe <= 0 then
    raise exception 'Pon cuánto has pagado';
  end if;
  if p_fecha > current_date then
    raise exception 'La fecha no puede ser futura';
  end if;

  update pagos_avisados
     set importe = p_importe, metodo = p_metodo, fecha = coalesce(p_fecha, current_date),
         nota = nullif(trim(p_nota), ''), creado_en = now(), staff_avisado = false
   where cuota_id = p_cuota and estado = 'pendiente'
  returning id into v_id;

  if v_id is null then
    insert into pagos_avisados (cuota_id, jugador_id, importe, metodo, fecha, nota)
    values (p_cuota, v_cuota.jugador_id, p_importe, p_metodo,
            coalesce(p_fecha, current_date), nullif(trim(p_nota), ''))
    returning id into v_id;
  end if;

  return v_id;
end $$;

comment on function avisar_pago is
  'El jugador dice que ha pagado su cuota. Queda pendiente de que tesorería lo valide.';

-- El propio jugador puede retirar su aviso si se equivocó.
create or replace function retirar_pago_avisado(p_aviso uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from pagos_avisados
   where id = p_aviso and estado = 'pendiente' and jugador_id = mi_perfil_id();
  if not found then raise exception 'No hay ese aviso pendiente'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tesorería resuelve
-- ---------------------------------------------------------------------------

-- Validar es apuntar el pago: el mismo registro que si se metiera a mano desde
-- la ficha de la cuota. El importe se puede corregir (pagó 150 y dijo 170).
create or replace function validar_pago_avisado(p_aviso uuid, p_importe numeric default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_aviso pagos_avisados%rowtype;
  v_pago  uuid;
begin
  if not puede('tesoreria') then
    raise exception 'No llevas la tesorería';
  end if;

  select * into v_aviso from pagos_avisados where id = p_aviso for update;
  if not found then raise exception 'Aviso de pago no encontrado'; end if;
  if v_aviso.estado <> 'pendiente' then
    raise exception 'Ese aviso ya está resuelto';
  end if;

  insert into pagos (cuota_id, importe, fecha, metodo, referencia, nota, registrado_por)
  values (v_aviso.cuota_id, coalesce(p_importe, v_aviso.importe), v_aviso.fecha,
          v_aviso.metodo, 'Avisado desde la app', v_aviso.nota, mi_perfil_id())
  returning id into v_pago;

  update pagos_avisados
     set estado = 'validado', pago_id = v_pago,
         importe = coalesce(p_importe, importe),
         revisado_por = mi_perfil_id(), revisado_en = now()
   where id = p_aviso;

  return v_pago;
end $$;

create or replace function rechazar_pago_avisado(p_aviso uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not puede('tesoreria') then
    raise exception 'No llevas la tesorería';
  end if;

  update pagos_avisados
     set estado = 'rechazado', motivo = nullif(trim(p_motivo), ''),
         revisado_por = mi_perfil_id(), revisado_en = now()
   where id = p_aviso and estado = 'pendiente';
  if not found then raise exception 'Ese aviso ya está resuelto'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- El aviso al móvil de tesorería
--   El jugador no puede mandar notificaciones (`puede_avisar_al_movil`), y no
--   debe poder: con esa llave podría escribirle a todo el equipo. Esta función
--   le da solo lo justo: los móviles de quien lleva la tesorería, el texto ya
--   escrito aquí dentro, y una sola vez por aviso de pago suyo.
-- ---------------------------------------------------------------------------

create or replace function aviso_pago_al_staff(p_aviso uuid)
returns table (id uuid, perfil_id uuid, endpoint text, p256dh text, auth text,
               titulo text, cuerpo text)
language plpgsql security definer set search_path = public as $$
-- Las columnas que devuelve se llaman como las de las tablas (id, perfil_id…):
-- sin esto, cualquier referencia sin prefijo sería ambigua.
#variable_conflict use_column
declare
  v_aviso  pagos_avisados%rowtype;
  v_nombre text;
begin
  update pagos_avisados a
     set staff_avisado = true
   where a.id = p_aviso and a.estado = 'pendiente'
     and a.jugador_id = mi_perfil_id() and not a.staff_avisado
  returning a.* into v_aviso;

  if not found then return; end if;

  select trim(coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellidos, ''))
    into v_nombre from perfiles pe where pe.id = v_aviso.jugador_id;

  -- Sin el importe: la notificación sale en la pantalla bloqueada, a la vista
  -- de quien esté al lado. La cifra está en Tesorería.
  return query
    select s.id, s.perfil_id, s.endpoint, s.p256dh, s.auth,
           'Pago por validar'::text,
           v_nombre || ' dice que ha pagado la cuota. Compruébalo y valídalo en Tesorería.'
    from suscripciones_push s
    join perfiles pe on pe.id = s.perfil_id
    where pe.acceso = 'aprobado'
      and (pe.rol = 'admin' or exists (
             select 1 from permisos p
             where p.perfil_id = pe.id and p.seccion = 'tesoreria'));
end $$;

comment on function aviso_pago_al_staff is
  'Moviles de tesoreria y el texto del aviso, una vez por aviso de pago y solo para quien lo hizo.';

revoke execute on function avisar_pago(uuid, numeric, metodo_pago, date, text) from public, anon;
revoke execute on function retirar_pago_avisado(uuid) from public, anon;
revoke execute on function validar_pago_avisado(uuid, numeric) from public, anon;
revoke execute on function rechazar_pago_avisado(uuid, text) from public, anon;
revoke execute on function aviso_pago_al_staff(uuid) from public, anon;
grant  execute on function avisar_pago(uuid, numeric, metodo_pago, date, text) to authenticated;
grant  execute on function retirar_pago_avisado(uuid) to authenticated;
grant  execute on function validar_pago_avisado(uuid, numeric) to authenticated;
grant  execute on function rechazar_pago_avisado(uuid, text) to authenticated;
grant  execute on function aviso_pago_al_staff(uuid) to authenticated;
grant  select on pagos_avisados to authenticated;

-- Comprobación: tiene que salir una fila con la tabla y rls = true.
select tablename, rowsecurity as rls from pg_tables where tablename = 'pagos_avisados';
