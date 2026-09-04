-- Coruña Atlantics — La parte del jugador
-- Ejecutar DESPUÉS de 05_calendario.sql.
--
-- Lo que un jugador dice que hará y lo que acaba haciendo son dos datos
-- distintos, y se guardan en columnas distintas:
--   confirmacion -> la escribe el jugador, antes del entreno
--   estado       -> la escribe el staff pasando lista, en el campo
-- Mezclarlos haría imposible saber quién dijo que iba y luego no apareció.

do $$ begin
  create type confirmacion_jugador as enum ('voy', 'no_voy', 'duda');
exception when duplicate_object then null; end $$;

alter table asistencias
  add column if not exists confirmacion confirmacion_jugador,
  add column if not exists confirmado_en timestamptz;

-- El estado pasa a ser opcional: una fila puede existir solo con la
-- confirmación del jugador, antes de que nadie haya pasado lista.
alter table asistencias alter column estado drop not null;

-- ---------------------------------------------------------------------------
-- Permisos del jugador sobre su propia asistencia
-- ---------------------------------------------------------------------------

drop policy if exists asistencias_confirmar_alta on asistencias;
create policy asistencias_confirmar_alta on asistencias
  for insert to authenticated
  with check (jugador_id = mi_perfil_id());

drop policy if exists asistencias_confirmar_cambio on asistencias;
create policy asistencias_confirmar_cambio on asistencias
  for update to authenticated
  using (jugador_id = mi_perfil_id())
  with check (jugador_id = mi_perfil_id());

-- Un jugador no puede escribir el resultado de la lista, solo su confirmación.
-- Sin esto, las políticas de arriba le dejarían marcarse presente él mismo.
create or replace function bloquear_lista_del_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not es_staff() then
    if tg_op = 'INSERT' then
      new.estado := null;
      new.registrado_por := null;
    else
      new.estado := old.estado;
      new.registrado_por := old.registrado_por;
      new.evento_id := old.evento_id;
      new.jugador_id := old.jugador_id;
    end if;
    new.confirmado_en := now();
  end if;
  return new;
end $$;

drop trigger if exists asistencias_bloquear_lista on asistencias;
create trigger asistencias_bloquear_lista before insert or update on asistencias
  for each row execute function bloquear_lista_del_jugador();

-- ---------------------------------------------------------------------------
-- Lo que el jugador ve del resto del equipo
--   Nombre, dorsal y posición: lo que ya se ve en una camiseta. Ni teléfonos,
--   ni documentación, ni cuotas, ni notas del staff.
-- ---------------------------------------------------------------------------

create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado
from perfiles
where estado <> 'baja';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos.';

-- ---------------------------------------------------------------------------
-- Recuento de confirmaciones de un evento
--   El jugador no puede leer las filas de sus compañeros, pero sí saber cuánta
--   gente ha dicho que va: es lo que hace que confirmar tenga sentido.
-- ---------------------------------------------------------------------------

create or replace function confirmados_de(p_evento uuid)
returns table (voy int, no_voy int, duda int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where confirmacion = 'voy')::int,
    count(*) filter (where confirmacion = 'no_voy')::int,
    count(*) filter (where confirmacion = 'duda')::int
  from asistencias
  where evento_id = p_evento;
$$;
