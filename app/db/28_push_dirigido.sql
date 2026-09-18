-- Coruña Atlantics — Avisar al móvil solo a quien le toca
-- Ejecutar DESPUÉS de 27_sesiones_de_video.sql.
--
-- Hasta aquí una notificación iba siempre a todo el equipo, y solo la podía
-- mandar quien llevaba los avisos. Eso dejaba fuera los tres casos en que más
-- falta hace:
--   · se cancela o se mueve un entreno  -> lo lleva quien lleva el calendario
--   · quién no ha dicho si viene        -> también el calendario
--   · quién debe la cuota               -> la tesorería
-- y obligaba a mandar a los cincuenta lo que era para seis: un aviso de la
-- defensa que le suena al ataque enseña a ignorar los avisos.
--
-- Dos cambios:
--   1. Pueden mandar quien lleva avisos, calendario o tesorería.
--   2. Se puede pedir una lista de personas. Sin lista, todo el equipo, como
--      antes: la función ya desplegada sigue funcionando con este SQL puesto.
--
-- Lo que NO cambia: nadie lee las suscripciones de otro. La lista de personas
-- la elige quien manda, pero las direcciones de entrega solo salen hacia la
-- función del servidor, y solo si quien llama tiene una de esas llaves.

create or replace function puede_avisar_al_movil()
returns boolean language sql stable security definer set search_path = public as $$
  select puede('avisos') or puede('calendario') or puede('tesoreria');
$$;

comment on function puede_avisar_al_movil is
  'Puede mandar notificaciones: lleva avisos, calendario o tesoreria.';

-- Cambia lo que devuelve (ahora también de quién es cada móvil, para contar
-- personas y no aparatos), y eso en Postgres no se puede hacer con un replace.
drop function if exists suscripciones_para_enviar();

create or replace function suscripciones_para_enviar(p_perfiles uuid[] default null)
returns table (id uuid, perfil_id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select s.id, s.perfil_id, s.endpoint, s.p256dh, s.auth
  from suscripciones_push s
  where puede_avisar_al_movil()
    and (p_perfiles is null or s.perfil_id = any(p_perfiles));
$$;

comment on function suscripciones_para_enviar is
  'A donde entregar una notificacion: todo el equipo, o solo esas personas. Vacio a quien no puede mandar.';

create or replace function borrar_suscripciones(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not puede_avisar_al_movil() then
    raise exception 'No puedes mandar avisos al móvil';
  end if;

  delete from suscripciones_push where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function puede_avisar_al_movil() from anon;
revoke execute on function suscripciones_para_enviar(uuid[]) from anon;
revoke execute on function borrar_suscripciones(uuid[]) from anon;
grant  execute on function puede_avisar_al_movil() to authenticated;
grant  execute on function suscripciones_para_enviar(uuid[]) to authenticated;
grant  execute on function borrar_suscripciones(uuid[]) to authenticated;
