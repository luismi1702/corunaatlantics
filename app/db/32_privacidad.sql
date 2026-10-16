-- Coruña Atlantics — Cada uno ve solo lo que necesita
-- Ejecutar DESPUÉS de 31_pago_avisado.sql.
--
-- Sale de la auditoría del 16 de octubre (docs/auditoria-app-2026-10-16.md).
-- Cuatro cosas:
--
--   1. La ficha entera (teléfono, correo, fecha de nacimiento, número de
--      documento) la leían todos los que llevan alguna sección del club. Quien
--      lleva el material no necesita el DNI de nadie. Ahora la ficha entera la
--      leen solo roster y documentos, y las demás secciones trabajan con
--      `plantilla_club`, que lleva lo que sus pantallas usan y nada más.
--   2. Las notas del staff iban dentro de la ficha del jugador y de su fila de
--      documentación, filas que el propio jugador puede leer. Pasan a tablas
--      aparte que solo leen roster y documentos.
--   3. Disponibilidad salía "no apto" para todos si quien la miraba no llevaba
--      documentos: la vista leía la documentación con los permisos de quien
--      pregunta. Ahora la calcula la base de datos y solo devuelve el resultado.
--   4. Las fotos de la tienda las podía cambiar cualquiera con una sección.
--      Ahora solo quien lleva la tienda.
--
-- Más el alta de los menores de 14 años: el consentimiento lo da el tutor
-- (LOPDGDD, art. 7), y la app no tenía dónde apuntarlo.

-- ---------------------------------------------------------------------------
-- 1. La plantilla para las secciones del club
-- ---------------------------------------------------------------------------

create or replace view plantilla_club
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, rol, telefono,
       talla_equipacion, foto_url, estado, acceso, es_capitan,
       alta_en, baja_en, solicitado_en, creado_en, actualizado_en
from perfiles
where es_staff();

alter view plantilla_club owner to postgres;
revoke all on plantilla_club from anon, authenticated;
grant select on plantilla_club to authenticated;

comment on view plantilla_club is
  'La plantilla para quien lleva una seccion: sin correo, fecha de nacimiento, documento ni notas.';

drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles
  for select to authenticated
  using (user_id = auth.uid() or puede('roster') or puede('documentos'));

-- ---------------------------------------------------------------------------
-- 2. Las notas del staff, fuera de las filas del jugador
-- ---------------------------------------------------------------------------

create table if not exists notas_ficha (
  perfil_id       uuid primary key references perfiles(id) on delete cascade,
  texto           text not null,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid references perfiles(id) on delete set null
);

create table if not exists notas_documentacion (
  documentacion_id uuid primary key references documentacion(id) on delete cascade,
  texto            text not null,
  actualizado_en   timestamptz not null default now(),
  actualizado_por  uuid references perfiles(id) on delete set null
);

alter table notas_ficha enable row level security;
alter table notas_documentacion enable row level security;

drop policy if exists notas_ficha_roster on notas_ficha;
create policy notas_ficha_roster on notas_ficha
  for all to authenticated using (puede('roster')) with check (puede('roster'));

drop policy if exists notas_documentacion_documentos on notas_documentacion;
create policy notas_documentacion_documentos on notas_documentacion
  for all to authenticated using (puede('documentos')) with check (puede('documentos'));

grant select, insert, update, delete on notas_ficha, notas_documentacion to authenticated;

-- Lo que ya hubiera escrito se pasa a las tablas nuevas antes de borrar las
-- columnas. Si el script se ejecuta dos veces, la segunda no encuentra las
-- columnas y no hace nada.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'perfiles' and column_name = 'notas_staff') then
    insert into notas_ficha (perfil_id, texto)
    select id, notas_staff from perfiles where nullif(trim(notas_staff), '') is not null
    on conflict (perfil_id) do nothing;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'documentacion' and column_name = 'notas_staff') then
    insert into notas_documentacion (documentacion_id, texto)
    select id, notas_staff from documentacion where nullif(trim(notas_staff), '') is not null
    on conflict (documentacion_id) do nothing;
  end if;
end $$;

-- El disparador que protege los campos del club nombraba la columna: hay que
-- cambiarlo antes de borrarla. Es el de 18_capitanes.sql sin esa línea.
create or replace function bloquear_campos_de_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not es_admin() then
    new.rol := old.rol;
  end if;

  if not puede('roster') then
    new.user_id     := old.user_id;
    new.estado      := old.estado;
    new.es_capitan  := old.es_capitan;
    new.alta_en     := old.alta_en;
    new.baja_en     := old.baja_en;
    new.resuelto_en := old.resuelto_en;
    new.resuelto_por := old.resuelto_por;
    new.motivo_rechazo := old.motivo_rechazo;

    if not es_aprobado() then
      new.dorsal := old.dorsal;
    end if;

    if old.acceso = 'nuevo' and new.acceso = 'pendiente' then
      new.solicitado_en := now();
    else
      new.acceso := old.acceso;
    end if;
  end if;

  return new;
end $$;

alter table perfiles drop column if exists notas_staff;
alter table documentacion drop column if exists notas_staff;

-- ---------------------------------------------------------------------------
-- 3. Disponibilidad
-- ---------------------------------------------------------------------------

create or replace view aptitud_jugadores
with (security_invoker = off) as
select
  p.id                as jugador_id,
  d.temporada_id,
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
left join documentacion d on d.jugador_id = p.id
where es_staff();

alter view aptitud_jugadores set (security_invoker = off);
alter view aptitud_jugadores owner to postgres;
revoke all on aptitud_jugadores from anon, authenticated;
grant select on aptitud_jugadores to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Fotos de la tienda: solo quien lleva la tienda
-- ---------------------------------------------------------------------------

do $bloque$
begin
  execute $p$ drop policy if exists productos_foto_subir on storage.objects $p$;
  execute $p$ create policy productos_foto_subir on storage.objects
             for insert to authenticated with check (bucket_id = 'productos' and puede('tienda')) $p$;

  execute $p$ drop policy if exists productos_foto_cambiar on storage.objects $p$;
  execute $p$ create policy productos_foto_cambiar on storage.objects
             for update to authenticated using (bucket_id = 'productos' and puede('tienda')) $p$;

  execute $p$ drop policy if exists productos_foto_borrar on storage.objects $p$;
  execute $p$ create policy productos_foto_borrar on storage.objects
             for delete to authenticated using (bucket_id = 'productos' and puede('tienda')) $p$;
exception when others then
  raise notice 'No se han podido cambiar los permisos de las fotos de la tienda (%). Lo demas SI se ha aplicado.', sqlerrm;
end $bloque$;

-- ---------------------------------------------------------------------------
-- 5. Menores de 14 años: el tutor da el consentimiento
--   El propio jugador, mientras rellena su alta, apunta a su tutor. No puede
--   escribir en `tutores` directamente (eso es de documentos), así que va por
--   aquí, y solo mientras su ficha está sin entregar.
-- ---------------------------------------------------------------------------

create or replace function registrar_tutor(
  p_nombre text, p_telefono text, p_email text default null, p_relacion text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_yo    perfiles%rowtype;
  v_tutor uuid;
begin
  select * into v_yo from perfiles where user_id = auth.uid();
  if not found then raise exception 'Sin ficha'; end if;
  if v_yo.acceso <> 'nuevo' then
    raise exception 'Tu solicitud ya está entregada: el tutor lo apunta el club';
  end if;
  if nullif(trim(p_nombre), '') is null or nullif(trim(p_telefono), '') is null then
    raise exception 'Falta el nombre o el teléfono del tutor';
  end if;

  -- Si ya había apuntado uno (volvió atrás y lo cambió), se sustituye.
  delete from tutores t using tutorias r
   where r.tutor_id = t.id and r.jugador_id = v_yo.id;

  insert into tutores (nombre, telefono, email)
  values (trim(p_nombre), trim(p_telefono), nullif(trim(p_email), ''))
  returning id into v_tutor;

  insert into tutorias (tutor_id, jugador_id, relacion, consentimiento_en)
  values (v_tutor, v_yo.id, nullif(trim(p_relacion), ''), now());

  return v_tutor;
end $$;

revoke execute on function registrar_tutor(text, text, text, text) from public, anon;
grant  execute on function registrar_tutor(text, text, text, text) to authenticated;

-- Comprobación: tienen que salir tres filas, las dos tablas de notas y
-- plantilla_club.
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('plantilla_club', 'notas_ficha', 'notas_documentacion')
 order by table_name;
