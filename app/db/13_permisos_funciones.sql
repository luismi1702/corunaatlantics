-- Coruña Atlantics — Cerrar funciones que quedaban demasiado abiertas
-- Ejecutar DESPUÉS de 12_arranque_automatico.sql.
--
-- Todo lo que vive en el esquema `public` de Supabase queda expuesto como
-- llamada remota, incluidas las funciones auxiliares. Las que además son
-- SECURITY DEFINER se saltan las políticas RLS, así que si no comprueban quién
-- llama, cualquiera con una sesión abierta puede ejecutarlas.
--
-- Repasando las diecinueve del proyecto, dos estaban en ese caso.

-- ---------------------------------------------------------------------------
-- 1. preparar_temporada_de_jugador_manual
--    Solo la usa resolver_solicitud() por dentro, pero al estar en public
--    cualquiera podía llamarla con el id de otro jugador y crearle filas de
--    cuota y documentación. No hacía daño real (son filas que iban a existir
--    igual, y el insert ignora duplicados), pero no tiene por qué ser
--    alcanzable desde fuera.
-- ---------------------------------------------------------------------------

revoke execute on function preparar_temporada_de_jugador_manual(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. confirmados_de
--    Devuelve cuánta gente ha confirmado un entreno. Es información inocua y el
--    jugador la necesita, pero quien está pendiente de aprobación no debería
--    poder sacar nada del club: si no, la pantalla de espera deja de ser lo que
--    dice ser.
-- ---------------------------------------------------------------------------

create or replace function confirmados_de(p_evento uuid)
returns table (voy int, no_voy int, duda int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where confirmacion = 'voy')::int,
    count(*) filter (where confirmacion = 'no_voy')::int,
    count(*) filter (where confirmacion = 'duda')::int
  from asistencias
  where evento_id = p_evento
    and (es_aprobado() or es_staff());
$$;

comment on function confirmados_de is
  'Recuento de confirmaciones de un evento. Devuelve ceros a quien no esté aprobado.';
