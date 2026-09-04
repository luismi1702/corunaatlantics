-- Coruña Atlantics — El jugador elige su dorsal
-- Ejecutar DESPUÉS de 07_registro.sql.
--
-- Quien lo coge primero se lo queda. El bloqueo de verdad no lo hace la app:
-- lo hace el índice único `perfiles_dorsal_activo` de 01_schema.sql, que además
-- resuelve solo el caso de dos jugadores tocando el mismo número a la vez —
-- uno de los dos se lleva un error de duplicado y la app se lo explica.
--
-- Solo puede elegir quien ya está aprobado. Si se pudiera al registrarse,
-- cualquiera con el enlace se reservaría un número sin ser del equipo.

create or replace function bloquear_campos_de_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo significa que el cambio no viene de una persona usando la
  -- app, sino de un disparador del sistema o del editor SQL. Sin esta salida,
  -- el enlace de una ficha con su cuenta recién creada se revierte solo.
  if auth.uid() is not null and not es_admin() then
    new.rol         := old.rol;
    new.user_id     := old.user_id;
    new.estado      := old.estado;
    new.notas_staff := old.notas_staff;
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

comment on index perfiles_dorsal_activo is
  'El bloqueo real del dorsal. Quien causa baja libera su número.';
