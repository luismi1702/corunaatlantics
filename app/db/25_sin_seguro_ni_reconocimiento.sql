-- Coruña Atlantics — Fuera el seguro y el reconocimiento médico
-- Ejecutar DESPUÉS de 24_plantilla_publica.sql.
--
-- El club no los pide, así que en la app eran dos casillas que nadie iba a
-- rellenar nunca y que salían como "pendiente" en el semáforo de todo el mundo:
-- ruido que hace que el resto del semáforo deje de mirarse.
--
-- Queda la licencia, que es la que de verdad hace falta para competir, y el
-- DNI y la foto, que los pide la federación para tramitarla.
--
-- Ojo: esto borra las columnas y lo que hubiera en ellas. No hay vuelta atrás.
-- Se hace porque el club no las usa; si algún día la federación las exigiera,
-- se vuelven a crear vacías y a rellenar.

-- La vista va primero: no se puede borrar una columna de la que depende.
create or replace view aptitud_jugadores
with (security_invoker = on) as
select
  p.id                as jugador_id,
  d.temporada_id,
  -- 'no' bloquea, 'pega' es un aviso, 'si' está listo para jugar
  case
    when p.estado <> 'activo'                                          then 'no'
    when d.id is null                                                  then 'no'
    when d.licencia_estado in ('pendiente', 'caducado')                then 'no'
    when d.licencia_caduca_en is not null and d.licencia_caduca_en < current_date then 'no'
    when d.licencia_estado = 'entregado'                               then 'pega'
    when d.licencia_caduca_en is not null and d.licencia_caduca_en < current_date + 30 then 'pega'
    else 'si'
  end as apto,
  array_remove(array[
    case when p.estado = 'lesionado'      then 'Lesionado' end,
    case when p.estado = 'baja_temporal'  then 'De baja temporal' end,
    case when p.estado = 'baja'           then 'Ya no está en el equipo' end,
    case when d.id is null                then 'Sin ficha de documentación' end,
    case when d.licencia_estado = 'pendiente' then 'Sin licencia' end,
    case when d.licencia_estado = 'entregado' then 'Licencia sin validar' end,
    case when d.licencia_caduca_en is not null and d.licencia_caduca_en < current_date
         then 'Licencia caducada' end
  ], null) as motivos
from perfiles p
left join documentacion d on d.jugador_id = p.id;

alter table documentacion
  drop column if exists seguro_estado,
  drop column if exists seguro_caduca_en,
  drop column if exists reconocimiento_estado,
  drop column if exists reconocimiento_caduca_en;
