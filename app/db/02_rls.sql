-- Coruña Atlantics — Permisos (Row Level Security)
-- Ejecutar DESPUÉS de 01_schema.sql.
--
-- Regla que rige todo el archivo: los datos económicos de la plantilla los ve
-- únicamente el rol admin. Que un jugador pudiera ver quién debe la cuota sería
-- un problema serio dentro de un vestuario, así que se bloquea aquí, en la base
-- de datos, y no en la interfaz. Trastear con el navegador no lo salta.

-- ---------------------------------------------------------------------------
-- Ayudantes
--   SECURITY DEFINER a propósito: consultar el rol desde una política sobre la
--   propia tabla perfiles provocaría recursión infinita.
-- ---------------------------------------------------------------------------

create or replace function mi_perfil_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from perfiles where user_id = auth.uid();
$$;

create or replace function es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' from perfiles where user_id = auth.uid()), false);
$$;

create or replace function es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('staff','admin') from perfiles where user_id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
alter table temporadas    enable row level security;
alter table perfiles      enable row level security;
alter table cuotas        enable row level security;
alter table pagos         enable row level security;
alter table documentacion enable row level security;
alter table tutores       enable row level security;
alter table tutorias      enable row level security;

-- --- Temporadas: las lee cualquiera autenticado; las toca solo admin --------

drop policy if exists temporadas_leer on temporadas;
create policy temporadas_leer on temporadas
  for select to authenticated using (true);

drop policy if exists temporadas_admin on temporadas;
create policy temporadas_admin on temporadas
  for all to authenticated using (es_admin()) with check (es_admin());

-- --- Perfiles ---------------------------------------------------------------
-- El jugador ve y edita el suyo. El staff ve la plantilla. Solo admin escribe
-- sobre fichas ajenas o crea altas.

drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles
  for select to authenticated using (user_id = auth.uid() or es_staff());

drop policy if exists perfiles_editar_propio on perfiles;
create policy perfiles_editar_propio on perfiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles
  for all to authenticated using (es_admin()) with check (es_admin());

-- Un jugador no puede ascenderse a sí mismo. La política de arriba le deja
-- editar su fila entera, incluido el rol, así que hace falta este cerrojo:
-- los campos que son competencia del club se revierten a su valor anterior.
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
    new.dorsal      := old.dorsal;
    new.alta_en     := old.alta_en;
    new.baja_en     := old.baja_en;
  end if;
  return new;
end $$;

drop trigger if exists perfiles_bloquear_campos_de_club on perfiles;
create trigger perfiles_bloquear_campos_de_club before update on perfiles
  for each row execute function bloquear_campos_de_club();

-- --- Cuotas y pagos: cada uno ve lo suyo, el conjunto solo admin ------------

drop policy if exists cuotas_leer on cuotas;
create policy cuotas_leer on cuotas
  for select to authenticated using (jugador_id = mi_perfil_id() or es_admin());

drop policy if exists cuotas_admin on cuotas;
create policy cuotas_admin on cuotas
  for all to authenticated using (es_admin()) with check (es_admin());

drop policy if exists pagos_leer on pagos;
create policy pagos_leer on pagos
  for select to authenticated using (
    es_admin() or exists (
      select 1 from cuotas c
      where c.id = pagos.cuota_id and c.jugador_id = mi_perfil_id()
    )
  );

drop policy if exists pagos_admin on pagos;
create policy pagos_admin on pagos
  for all to authenticated using (es_admin()) with check (es_admin());

-- --- Documentación: el jugador ve su semáforo, no lo edita ------------------

drop policy if exists documentacion_leer on documentacion;
create policy documentacion_leer on documentacion
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists documentacion_admin on documentacion;
create policy documentacion_admin on documentacion
  for all to authenticated using (es_admin()) with check (es_admin());

-- --- Tutores: solo admin (contiene datos de terceros) ----------------------

drop policy if exists tutores_admin on tutores;
create policy tutores_admin on tutores
  for all to authenticated using (es_admin()) with check (es_admin());

drop policy if exists tutorias_leer on tutorias;
create policy tutorias_leer on tutorias
  for select to authenticated using (jugador_id = mi_perfil_id() or es_admin());

drop policy if exists tutorias_admin on tutorias;
create policy tutorias_admin on tutorias
  for all to authenticated using (es_admin()) with check (es_admin());
