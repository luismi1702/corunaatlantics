-- Coruña Atlantics — La plantilla en la web
-- Ejecutar DESPUÉS de 23_push_sin_clave_servidor.sql.
--
-- La web del club enseña el roster, y hasta ahora estaba escrito a mano en el
-- HTML: se quedaba viejo en cuanto entraba alguien.
--
-- Lo que sale es exactamente lo que lleva puesto en la espalda —dorsal, nombre
-- de camiseta y posición— y nada más. Ni apellidos si no son su nombre de
-- camiseta, ni correo, ni teléfono, ni estado, ni cuota. Eso es lo que ve
-- cualquiera que vaya a un partido, así que publicarlo no cuenta nada que no
-- estuviera ya a la vista.
--
-- Solo la gente aprobada y de alta. Quien esta pendiente de que le aprueben, de
-- baja o lesionado de larga duracion no aparece: la web enseña el equipo que
-- salta al campo, no la base de datos del club.

create or replace view plantilla_publica
with (security_invoker = off) as
select
  coalesce(nullif(apodo, ''), apellidos, nombre) as nombre,
  dorsal,
  posiciones,
  es_capitan
from perfiles
where acceso = 'aprobado'
  and estado = 'activo';

alter view plantilla_publica owner to postgres;

-- Esta si la puede leer cualquiera, tambien sin haber entrado en la app: es la
-- unica vista del proyecto abierta a `anon`, y por eso lleva solo lo de la
-- camiseta.
revoke all on plantilla_publica from anon, authenticated;
grant select on plantilla_publica to anon, authenticated;

comment on view plantilla_publica is
  'El roster para la web publica: lo mismo que lleva cada uno en la espalda. Sin datos de contacto ni economicos.';
