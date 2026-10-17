-- Coruña Atlantics — Las tallas para el pedido de equipaciones
-- Ejecutar DESPUÉS de 32_privacidad.sql.
--
-- Para hacer el pedido al proveedor hace falta, de cada uno, lo que va
-- estampado (nombre de camiseta y dorsal) y su talla. Hasta ahora la talla
-- solo la leía quien llevaba la plantilla con sesión, y sacar la lista del
-- pedido obligaba a entrar en la app y exportar el CSV.
--
-- Esta vista se lee con la clave pública, sin sesión, igual que
-- `plantilla_publica`, y lleva solo eso: nombre de camiseta, dorsal y talla.
-- Ni nombre completo, ni contacto, ni nada económico. La talla es lo único que
-- no está ya a la vista en un partido, y es un dato menor.
--
-- Cuando el pedido esté hecho se puede quitar con:
--   drop view if exists tallas_pedido;

create or replace view tallas_pedido
with (security_invoker = off) as
select
  coalesce(nullif(apodo, ''), apellidos, nombre) as nombre_camiseta,
  dorsal,
  nullif(trim(talla_equipacion), '')             as talla
from perfiles
where acceso = 'aprobado'
  and estado <> 'baja';

alter view tallas_pedido owner to postgres;
revoke all on tallas_pedido from anon, authenticated;
grant select on tallas_pedido to anon, authenticated;

comment on view tallas_pedido is
  'Para el pedido de equipaciones: nombre de camiseta, dorsal y talla. Sin datos de contacto.';

-- Comprobación: una fila por jugador aprobado, con su talla (vacía si no la ha puesto).
select * from tallas_pedido order by dorsal nulls last;
