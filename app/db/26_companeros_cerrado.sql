-- Coruña Atlantics — La plantilla, solo para quien está dentro
-- Ejecutar DESPUÉS de 25_sin_seguro_ni_reconocimiento.sql.
--
-- `companeros` se salta las políticas de la tabla `perfiles` a propósito
-- (security_invoker = off): así un jugador puede ver a los demás sin darle
-- permiso de lectura sobre la tabla entera. El precio es que la vista tiene que
-- comprobar ella misma quién pregunta, y no lo hacía.
--
-- El agujero: cualquiera que se registre con su correo queda `authenticated`
-- desde el primer segundo, aunque el club todavía no le haya aprobado. Hasta
-- ahora ese perfil pendiente no veía nada en la app —la interfaz le tapa
-- todo— pero podía pedirle la vista a la API directamente y le contestaba con
-- la plantilla entera: apellidos, id y estado (quién está lesionado o de baja).
-- Nada de eso sale en `plantilla_publica`, que es lo único que el club decidió
-- publicar.
--
-- El arreglo es una línea: si quien pregunta no está aprobado, la vista no
-- devuelve filas. Para los de dentro no cambia nada.

create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado, es_capitan
from perfiles
where estado <> 'baja'
  and acceso = 'aprobado'
  and es_aprobado();

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'La plantilla para los jugadores. Solo gente aprobada y de alta, y solo la ve quien esté aprobado.';
