-- Coruña Atlantics — Calendario, asistencia y disponibilidad
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls.sql.

do $$ begin
  create type tipo_evento as enum ('entreno', 'partido', 'evento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unidad_equipo as enum ('todos', 'ataque', 'defensa', 'especiales');
exception when duplicate_object then null; end $$;

-- Lista pasada por el staff en el campo. Cuando los jugadores puedan confirmar
-- por su cuenta (fase 1B) eso irá en una columna aparte: son dos cosas
-- distintas, lo que alguien dice que hará y lo que acaba haciendo.
do $$ begin
  create type estado_asistencia as enum ('presente', 'ausente', 'justificado');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Horario semanal
--   Se define una vez y de aquí salen los entrenos. Poder añadir o cancelar
--   sesiones sueltas encima es lo que evita tener que elegir entre comodidad y
--   control.
-- ---------------------------------------------------------------------------

create table if not exists horarios_entreno (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references temporadas(id) on delete cascade,
  dia_semana    int  not null check (dia_semana between 1 and 7),   -- 1 = lunes
  hora          time not null,
  duracion_min  int  not null default 90,
  lugar         text,
  unidad        unidad_equipo not null default 'todos',
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------

create table if not exists eventos (
  id                uuid primary key default gen_random_uuid(),
  temporada_id      uuid not null references temporadas(id) on delete cascade,
  tipo              tipo_evento not null default 'entreno',
  fecha             date not null,
  hora              time,
  lugar             text,
  unidad            unidad_equipo not null default 'todos',
  rival             text,
  es_local          boolean,
  notas             text,
  cancelado         boolean not null default false,
  motivo_cancelacion text,
  horario_id        uuid references horarios_entreno(id) on delete set null,
  creado_por        uuid references perfiles(id) on delete set null,
  creado_en         timestamptz not null default now()
);

-- Evita que regenerar el calendario duplique un entreno ya creado.
create unique index if not exists eventos_de_horario
  on eventos (horario_id, fecha) where horario_id is not null;

create index if not exists eventos_fecha_idx on eventos (temporada_id, fecha);

-- ---------------------------------------------------------------------------
-- Asistencia
-- ---------------------------------------------------------------------------

create table if not exists asistencias (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references eventos(id) on delete cascade,
  jugador_id      uuid not null references perfiles(id) on delete cascade,
  estado          estado_asistencia not null,
  nota            text,
  registrado_por  uuid references perfiles(id) on delete set null,
  actualizado_en  timestamptz not null default now(),
  unique (evento_id, jugador_id)
);

create index if not exists asistencias_jugador_idx on asistencias (jugador_id);

drop trigger if exists asistencias_actualizado on asistencias;
create trigger asistencias_actualizado before update on asistencias
  for each row execute function tocar_actualizado_en();

-- Porcentaje de asistencia por jugador, contando solo entrenos no cancelados.
-- Los justificados no cuentan como falta: penalizarlos desincentiva avisar.
create or replace view asistencia_resumen
with (security_invoker = on) as
select
  a.jugador_id,
  e.temporada_id,
  count(*) filter (where a.estado = 'presente')     as presentes,
  count(*) filter (where a.estado = 'ausente')      as ausentes,
  count(*) filter (where a.estado = 'justificado')  as justificados,
  count(*) filter (where a.estado <> 'justificado') as computables,
  round(100.0 * count(*) filter (where a.estado = 'presente')
        / nullif(count(*) filter (where a.estado <> 'justificado'), 0)) as porcentaje
from asistencias a
join eventos e on e.id = a.evento_id
where e.tipo = 'entreno' and not e.cancelado
group by a.jugador_id, e.temporada_id;

-- ---------------------------------------------------------------------------
-- Disponibilidad para jugar
--   El dinero no entra aquí a propósito: quién juega y quién debe la cuota son
--   dos conversaciones distintas, y mezclarlas convierte una decisión del club
--   en un efecto secundario del software.
-- ---------------------------------------------------------------------------

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
    when d.licencia_caduca_en     is not null and d.licencia_caduca_en     < current_date then 'no'
    when d.seguro_caduca_en       is not null and d.seguro_caduca_en       < current_date then 'no'
    when d.reconocimiento_caduca_en is not null and d.reconocimiento_caduca_en < current_date then 'no'
    when d.seguro_estado = 'pendiente'                                 then 'no'
    when d.reconocimiento_estado = 'pendiente'                         then 'no'
    when d.licencia_estado = 'entregado'
      or d.seguro_estado = 'entregado'
      or d.reconocimiento_estado = 'entregado'                         then 'pega'
    when d.licencia_caduca_en     is not null and d.licencia_caduca_en     < current_date + 30 then 'pega'
    when d.seguro_caduca_en       is not null and d.seguro_caduca_en       < current_date + 30 then 'pega'
    when d.reconocimiento_caduca_en is not null and d.reconocimiento_caduca_en < current_date + 30 then 'pega'
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
         then 'Licencia caducada' end,
    case when d.seguro_estado = 'pendiente' then 'Sin seguro' end,
    case when d.seguro_estado = 'entregado' then 'Seguro sin validar' end,
    case when d.seguro_caduca_en is not null and d.seguro_caduca_en < current_date
         then 'Seguro caducado' end,
    case when d.reconocimiento_estado = 'pendiente' then 'Sin reconocimiento médico' end,
    case when d.reconocimiento_estado = 'entregado' then 'Reconocimiento sin validar' end,
    case when d.reconocimiento_caduca_en is not null and d.reconocimiento_caduca_en < current_date
         then 'Reconocimiento médico caducado' end
  ], null) as motivos
from perfiles p
left join documentacion d on d.jugador_id = p.id;

-- ---------------------------------------------------------------------------
-- Generación de entrenos desde el horario
-- ---------------------------------------------------------------------------

create or replace function generar_entrenos(p_temporada uuid, p_hasta date)
returns int language plpgsql security definer set search_path = public as $$
declare h horarios_entreno%rowtype; d date; t temporadas%rowtype; n int := 0;
begin
  if not es_staff() then
    raise exception 'Solo el staff puede generar entrenos';
  end if;

  select * into t from temporadas where id = p_temporada;
  if not found then raise exception 'Temporada no encontrada'; end if;

  for h in select * from horarios_entreno
           where temporada_id = p_temporada and activo loop
    d := greatest(current_date, t.fecha_inicio);
    -- Avanza hasta el primer día de la semana que toca.
    while extract(isodow from d) <> h.dia_semana loop
      d := d + 1;
    end loop;

    while d <= least(p_hasta, t.fecha_fin) loop
      insert into eventos (temporada_id, tipo, fecha, hora, lugar, unidad, horario_id)
      values (p_temporada, 'entreno', d, h.hora, h.lugar, h.unidad, h.id)
      on conflict (horario_id, fecha) do nothing;
      if found then n := n + 1; end if;
      d := d + 7;
    end loop;
  end loop;

  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Permisos
--   El calendario y la asistencia los ve todo el equipo; los escribe el staff.
-- ---------------------------------------------------------------------------

alter table horarios_entreno enable row level security;
alter table eventos          enable row level security;
alter table asistencias      enable row level security;

drop policy if exists horarios_leer on horarios_entreno;
create policy horarios_leer on horarios_entreno
  for select to authenticated using (true);

drop policy if exists horarios_staff on horarios_entreno;
create policy horarios_staff on horarios_entreno
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists eventos_leer on eventos;
create policy eventos_leer on eventos
  for select to authenticated using (true);

drop policy if exists eventos_staff on eventos;
create policy eventos_staff on eventos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Cada jugador ve su propia asistencia; el staff, la de todos.
drop policy if exists asistencias_leer on asistencias;
create policy asistencias_leer on asistencias
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists asistencias_staff on asistencias;
create policy asistencias_staff on asistencias
  for all to authenticated using (es_staff()) with check (es_staff());
