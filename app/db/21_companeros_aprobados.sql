-- Coruña Atlantics — La plantilla son los aprobados
-- Ejecutar DESPUÉS de 20_cobro_directo.sql.
--
-- La vista `companeros` es por donde los jugadores se ven entre ellos, y
-- filtraba solo las bajas. Eso dejaba dentro a quien acaba de registrarse y
-- todavia no has aprobado: en el roster del club no aparecia —ese si filtra por
-- acceso— pero en la pantalla del jugador si.
--
-- Ademas de enseñar de mas, enseñaba mal: alguien que ha entrado con su correo
-- y no ha llegado a rellenar la ficha sale como una camiseta sin dorsal y con
-- el trozo de delante de su email por nombre.
--
-- La plantilla es la gente aprobada. Punto.

create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado, es_capitan
from perfiles
where estado <> 'baja'
  and acceso = 'aprobado';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos. Solo gente aprobada y de alta.';
