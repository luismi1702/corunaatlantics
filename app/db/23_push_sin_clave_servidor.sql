-- Coruña Atlantics — Mandar avisos sin clave de servidor
-- Ejecutar DESPUÉS de 22_push.sql.
--
-- Para mandar una notificación hay que leer las suscripciones de todo el
-- equipo, y eso no lo permite ninguna política: cada uno solo ve las suyas, que
-- es como tiene que ser. La salida evidente es que la función use la clave de
-- servidor del proyecto... hasta que Supabase jubila esa clave y la función
-- empieza a leer la tabla vacía sin dar ningún error. Un fallo silencioso, que
-- son los peores.
--
-- Asi que se le da la vuelta: en vez de que la funcion se salte las politicas
-- con una clave, la base de datos expone dos operaciones concretas —dame las
-- suscripciones, borra estas— que solo responden a quien lleva los avisos. La
-- funcion llama con el token de quien la invoco, sin ninguna llave especial.
--
-- Sale ganando ademas en lo otro: ya no hay por ahi una clave que lo abre todo.

create or replace function suscripciones_para_enviar()
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select s.id, s.endpoint, s.p256dh, s.auth
  from suscripciones_push s
  where puede('avisos');
$$;

comment on function suscripciones_para_enviar is
  'A donde entregar los avisos. Devuelve vacio a quien no lleve la seccion de avisos.';

create or replace function borrar_suscripciones(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not puede('avisos') then
    raise exception 'No llevas los avisos';
  end if;

  delete from suscripciones_push where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

comment on function borrar_suscripciones is
  'Limpia las suscripciones que el servidor de push ya da por muertas.';

revoke execute on function suscripciones_para_enviar() from anon;
revoke execute on function borrar_suscripciones(uuid[]) from anon;
grant  execute on function suscripciones_para_enviar() to authenticated;
grant  execute on function borrar_suscripciones(uuid[]) to authenticated;
