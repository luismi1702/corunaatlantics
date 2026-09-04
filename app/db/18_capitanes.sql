-- Coruña Atlantics — Capitanes
-- Ejecutar DESPUÉS de 17_permisos.sql.
--
-- Ser capitán no es un permiso: no abre ninguna pantalla ni deja tocar nada.
-- Es galón, y por eso es una columna de la ficha y no una fila en `permisos`.
-- Quien además lleve alguna sección del club la lleva porque se la han dado,
-- no por llevar la C.
--
-- Puede haber varios, que es lo normal: uno de ataque y otro de defensa.

alter table perfiles
  add column if not exists es_capitan boolean not null default false;

comment on column perfiles.es_capitan is
  'Galon, no permiso. Sale como una C en el roster y en la plantilla.';

-- Los jugadores se ven entre ellos por esta vista, y la C es justo de las cosas
-- que se ven en el campo: tiene que estar aqui.
create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado, es_capitan
from perfiles
where estado <> 'baja';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos.';

-- ---------------------------------------------------------------------------
-- El cerrojo de la ficha, con la C dentro
--   Sin esto un jugador se pone la C solo editando su propia ficha: la politica
--   le deja escribir su fila entera. Nombrar capitan es del club, asi que va
--   con los demas campos que solo pasa quien lleva el roster.
-- ---------------------------------------------------------------------------

create or replace function bloquear_campos_de_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo significa que el cambio no viene de una persona usando la
  -- app, sino de un disparador del sistema o del editor SQL. Sin esta salida,
  -- el enlace de una ficha con su cuenta recién creada se revierte solo.
  if auth.uid() is null then
    return new;
  end if;

  -- El rol no lo toca nadie mas que el admin, ni siquiera quien lleva el
  -- roster: ascender a otro es repartir llaves, y eso no se delega.
  if not es_admin() then
    new.rol := old.rol;
  end if;

  if not puede('roster') then
    new.user_id     := old.user_id;
    new.estado      := old.estado;
    new.notas_staff := old.notas_staff;
    new.es_capitan  := old.es_capitan;
    new.alta_en     := old.alta_en;
    new.baja_en     := old.baja_en;
    new.resuelto_en := old.resuelto_en;
    new.resuelto_por := old.resuelto_por;
    new.motivo_rechazo := old.motivo_rechazo;

    -- El dorsal sí lo elige el jugador, pero solo si ya está dentro.
    if not es_aprobado() then
      new.dorsal := old.dorsal;
    end if;

    -- Único movimiento de acceso que puede hacer por su cuenta: entregar la
    -- solicitud.
    if old.acceso = 'nuevo' and new.acceso = 'pendiente' then
      new.solicitado_en := now();
    else
      new.acceso := old.acceso;
    end if;
  end if;

  return new;
end $$;

-- Quien deja el equipo deja de ser capitan: la C es del que esta.
create or replace function soltar_galon_en_baja()
returns trigger language plpgsql as $$
begin
  if new.estado = 'baja' and old.estado <> 'baja' then
    new.es_capitan := false;
  end if;
  return new;
end $$;

drop trigger if exists perfiles_soltar_galon on perfiles;
create trigger perfiles_soltar_galon before update on perfiles
  for each row execute function soltar_galon_en_baja();
