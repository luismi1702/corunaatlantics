-- Coruña Atlantics — Repartir secciones entre la gente
-- Ejecutar DESPUÉS de 16_estadisticas_visibles.sql.
--
-- Hasta aquí el club tenía dos roles y medio: admin lo veía todo, staff casi
-- todo y el jugador lo suyo. Eso obliga a elegir entre no delegar nada o dar
-- las llaves enteras, y en un club la realidad es otra: uno lleva el material,
-- otro la tesorería, otra pone los avisos. Ninguno necesita lo demás.
--
-- Así que el permiso deja de ser un rango y pasa a ser una lista: a cada
-- persona se le da la llave de las secciones que lleva, una a una. Sigue
-- siendo Postgres quien lo impone, no la interfaz: un delegado del material
-- que se ponga a hacer peticiones a mano no saca ni una cuota.
--
-- Dar y quitar llaves es solo del admin. Un delegado no puede repartir lo suyo.

-- ---------------------------------------------------------------------------
-- Las llaves
-- ---------------------------------------------------------------------------

create table if not exists permisos (
  perfil_id     uuid not null references perfiles(id) on delete cascade,
  seccion       text not null check (seccion in (
                   'tesoreria', 'roster', 'documentos', 'calendario',
                   'avisos', 'liga', 'material', 'tienda')),
  concedido_en  timestamptz not null default now(),
  concedido_por uuid references perfiles(id) on delete set null,
  primary key (perfil_id, seccion)
);

create index if not exists permisos_perfil_idx on permisos (perfil_id);

comment on table permisos is
  'Que secciones lleva cada persona. Vacio = solo jugador. El admin lo ve todo sin necesitar filas aqui.';

-- ---------------------------------------------------------------------------
-- Quien puede que
--   El parametro se llama _seccion y no seccion para que no lo confunda con la
--   columna del mismo nombre dentro del exists.
-- ---------------------------------------------------------------------------

create or replace function puede(_seccion text)
returns boolean language sql stable security definer set search_path = public as $$
  select es_admin() or exists (
    select 1
    from permisos p
    join perfiles pe on pe.id = p.perfil_id
    where pe.user_id = auth.uid()
      and pe.acceso  = 'aprobado'
      and p.seccion  = _seccion);
$$;

comment on function puede is
  'Tiene esta persona la llave de esta seccion. El admin siempre la tiene.';

-- es_staff() pasa a significar "lleva algo del club", sea lo que sea. Es lo
-- que abre las lecturas generales —la lista de nombres y dorsales, el
-- calendario— que hacen falta para llevar cualquier seccion. Lo delicado
-- (dinero, documentos) no depende de esto, sino de puede().
create or replace function es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('staff','admin') from perfiles where user_id = auth.uid()), false)
      or exists (
        select 1 from permisos p
        join perfiles pe on pe.id = p.perfil_id
        where pe.user_id = auth.uid() and pe.acceso = 'aprobado');
$$;

-- La lista de llaves de uno mismo: la app la necesita para saber que enseñar.
create or replace function mis_permisos()
returns table (seccion text)
language sql stable security definer set search_path = public as $$
  select p.seccion
  from permisos p
  join perfiles pe on pe.id = p.perfil_id
  where pe.user_id = auth.uid();
$$;

alter table permisos enable row level security;

-- Cada uno ve las suyas; el admin, todas. Repartirlas es solo del admin.
drop policy if exists permisos_leer on permisos;
create policy permisos_leer on permisos
  for select to authenticated using (perfil_id = mi_perfil_id() or es_admin());

drop policy if exists permisos_admin on permisos;
create policy permisos_admin on permisos
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---------------------------------------------------------------------------
-- Y ahora, cada seccion a su llave
--   Se rehacen aqui las politicas que antes decian es_staff() o es_admin(),
--   para no tener que volver a pasar los ficheros anteriores.
-- ---------------------------------------------------------------------------

-- Tesoreria: cuotas, pagos y movimientos.
drop policy if exists cuotas_leer on cuotas;
create policy cuotas_leer on cuotas
  for select to authenticated using (jugador_id = mi_perfil_id() or puede('tesoreria'));

drop policy if exists cuotas_admin on cuotas;
create policy cuotas_admin on cuotas
  for all to authenticated using (puede('tesoreria')) with check (puede('tesoreria'));

drop policy if exists pagos_leer on pagos;
create policy pagos_leer on pagos
  for select to authenticated using (
    puede('tesoreria') or exists (
      select 1 from cuotas c where c.id = pagos.cuota_id and c.jugador_id = mi_perfil_id()));

drop policy if exists pagos_admin on pagos;
create policy pagos_admin on pagos
  for all to authenticated using (puede('tesoreria')) with check (puede('tesoreria'));

drop policy if exists movimientos_admin on movimientos;
create policy movimientos_admin on movimientos
  for all to authenticated using (puede('tesoreria')) with check (puede('tesoreria'));

-- Roster: las fichas de la gente y las solicitudes de entrada.
drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles
  for all to authenticated using (puede('roster')) with check (puede('roster'));

-- Documentos: licencias, seguros, reconocimientos y tutores.
drop policy if exists documentacion_leer on documentacion;
create policy documentacion_leer on documentacion
  for select to authenticated using (jugador_id = mi_perfil_id() or puede('documentos'));

drop policy if exists documentacion_admin on documentacion;
create policy documentacion_admin on documentacion
  for all to authenticated using (puede('documentos')) with check (puede('documentos'));

drop policy if exists tutores_admin on tutores;
create policy tutores_admin on tutores
  for all to authenticated using (puede('documentos')) with check (puede('documentos'));

drop policy if exists tutorias_leer on tutorias;
create policy tutorias_leer on tutorias
  for select to authenticated using (jugador_id = mi_perfil_id() or puede('documentos'));

drop policy if exists tutorias_admin on tutorias;
create policy tutorias_admin on tutorias
  for all to authenticated using (puede('documentos')) with check (puede('documentos'));

-- Calendario: horarios, eventos y la lista de asistencia.
drop policy if exists horarios_staff on horarios_entreno;
create policy horarios_staff on horarios_entreno
  for all to authenticated using (puede('calendario')) with check (puede('calendario'));

drop policy if exists eventos_staff on eventos;
create policy eventos_staff on eventos
  for all to authenticated using (puede('calendario') or puede('liga'))
  with check (puede('calendario') or puede('liga'));

drop policy if exists asistencias_staff on asistencias;
create policy asistencias_staff on asistencias
  for all to authenticated using (puede('calendario')) with check (puede('calendario'));

-- Avisos.
drop policy if exists avisos_staff on avisos;
create policy avisos_staff on avisos
  for all to authenticated using (puede('avisos')) with check (puede('avisos'));

drop policy if exists lecturas_staff on lecturas_aviso;
create policy lecturas_staff on lecturas_aviso
  for all to authenticated using (puede('avisos')) with check (puede('avisos'));

-- Material.
drop policy if exists material_staff on material;
create policy material_staff on material
  for all to authenticated using (puede('material')) with check (puede('material'));

drop policy if exists prestamos_staff on prestamos_material;
create policy prestamos_staff on prestamos_material
  for all to authenticated using (puede('material')) with check (puede('material'));

-- Tienda.
drop policy if exists productos_staff on productos;
create policy productos_staff on productos
  for all to authenticated using (puede('tienda')) with check (puede('tienda'));

drop policy if exists pedidos_staff on pedidos;
create policy pedidos_staff on pedidos
  for all to authenticated using (puede('tienda')) with check (puede('tienda'));

-- Liga: competiciones, equipos, partidos y estadisticas.
drop policy if exists competiciones_staff on competiciones;
create policy competiciones_staff on competiciones
  for all to authenticated using (puede('liga')) with check (puede('liga'));

drop policy if exists equipos_comp_staff on equipos_competicion;
create policy equipos_comp_staff on equipos_competicion
  for all to authenticated using (puede('liga')) with check (puede('liga'));

drop policy if exists partidos_comp_staff on partidos_competicion;
create policy partidos_comp_staff on partidos_competicion
  for all to authenticated using (puede('liga')) with check (puede('liga'));

drop policy if exists estadisticas_staff on estadisticas;
create policy estadisticas_staff on estadisticas
  for all to authenticated using (puede('liga')) with check (puede('liga'));

-- ---------------------------------------------------------------------------
-- El cerrojo de la ficha, al dia
--   Este disparador revierte los campos que son competencia del club cuando
--   quien edita no es admin. Ahora tambien los deja pasar a quien lleve el
--   roster. El rol y las llaves siguen siendo solo del admin: si no, un
--   delegado del roster podria ascenderse.
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

-- Resolver solicitudes pasa a ser cosa de quien lleve el roster.
create or replace function resolver_solicitud(p_jugador uuid, p_aprobar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not puede('roster') then
    raise exception 'No tienes permiso para resolver solicitudes';
  end if;

  update perfiles
  set acceso        = case when p_aprobar then 'aprobado'::acceso_estado else 'rechazado'::acceso_estado end,
      motivo_rechazo = case when p_aprobar then null else p_motivo end,
      resuelto_en   = now(),
      resuelto_por  = mi_perfil_id(),
      alta_en       = case when p_aprobar then current_date else alta_en end
  where id = p_jugador;

  if p_aprobar then
    perform preparar_temporada_de_jugador_manual(p_jugador);
  end if;
end $$;

-- Los importes de la cuota los pone quien lleva la tesoreria.
create or replace function aplicar_importe_cuota(p_temporada uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype; n int;
begin
  if not puede('tesoreria') then
    raise exception 'No tienes permiso para cambiar los importes';
  end if;

  select * into t from temporadas where id = p_temporada;
  if not found then raise exception 'Temporada no encontrada'; end if;

  update cuotas c
  set    importe_total = t.importe_cuota
  where  c.temporada_id = p_temporada
    and  c.importe_total = 0
    and  not c.exento
    and  not exists (select 1 from pagos p where p.cuota_id = c.id);

  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecucion
--   puede() y mis_permisos() son SECURITY DEFINER y las llama la propia app,
--   asi que se quedan abiertas a quien tenga sesion: solo hablan de quien
--   pregunta. Abrir y cerrar temporada siguen siendo del admin y ya lo
--   comprueban por dentro.
-- ---------------------------------------------------------------------------

grant execute on function puede(text) to authenticated;
grant execute on function mis_permisos() to authenticated;
