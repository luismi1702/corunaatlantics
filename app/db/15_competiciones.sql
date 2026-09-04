-- Coruña Atlantics — Competiciones, clasificación y estadísticas
-- Ejecutar DESPUÉS de 14_tienda.sql.
--
-- La clasificación NO se teclea: se calcula. Metiendo todos los partidos de la
-- liga —los nuestros y los de los demás entre ellos— la tabla sale sola y no
-- puede desactualizarse ni contradecir a los resultados.
--
-- Las estadísticas van en filas, no en columnas: una por partido, jugador y
-- concepto. Añadir un concepto nuevo es editar una lista en la app, no migrar
-- la base de datos. Y el histórico acumulado es una suma.

do $$ begin
  create type tipo_competicion as enum ('liga', 'torneo', 'amistoso');
exception when duplicate_object then null; end $$;

-- Sobra de la primera version, cuando la tabla se tecleaba a mano. Y la vista
-- que la sustituye se tira antes de rehacerla porque `create or replace view`
-- no admite que cambien las columnas.
drop table if exists clasificacion cascade;
drop view  if exists clasificacion cascade;
drop view  if exists balance_competicion cascade;

create table if not exists competiciones (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references temporadas(id) on delete cascade,
  nombre        text not null,
  tipo          tipo_competicion not null default 'liga',
  notas         text,
  activa        boolean not null default true,
  -- Cada federación puntúa a su manera; en flag no siempre son tres por victoria.
  puntos_victoria int not null default 3,
  puntos_empate   int not null default 1,
  creado_en     timestamptz not null default now()
);

create index if not exists competiciones_temporada_idx on competiciones (temporada_id);

-- ---------------------------------------------------------------------------
-- Los equipos que la juegan
-- ---------------------------------------------------------------------------

create table if not exists equipos_competicion (
  id              uuid primary key default gen_random_uuid(),
  competicion_id  uuid not null references competiciones(id) on delete cascade,
  nombre          text not null,
  es_nuestro      boolean not null default false,
  creado_en       timestamptz not null default now()
);

create unique index if not exists equipos_competicion_nombre
  on equipos_competicion (competicion_id, lower(nombre));

-- Solo uno puede ser el nuestro en cada competición.
create unique index if not exists equipos_competicion_nuestro
  on equipos_competicion (competicion_id) where es_nuestro;

-- ---------------------------------------------------------------------------
-- Los partidos, todos
--   evento_id enlaza los nuestros con su entrada del calendario, que es donde
--   viven la asistencia y las estadísticas. Los de los demás no tienen evento:
--   solo cuentan para la tabla.
-- ---------------------------------------------------------------------------

create table if not exists partidos_competicion (
  id                uuid primary key default gen_random_uuid(),
  competicion_id    uuid not null references competiciones(id) on delete cascade,
  jornada           int,
  fecha             date,
  hora              time,
  lugar             text,
  local_id          uuid not null references equipos_competicion(id) on delete cascade,
  visitante_id      uuid not null references equipos_competicion(id) on delete cascade,
  puntos_local      int,
  puntos_visitante  int,
  evento_id         uuid references eventos(id) on delete set null,
  notas             text,
  creado_en         timestamptz not null default now(),
  check (local_id <> visitante_id)
);

create index if not exists partidos_comp_idx on partidos_competicion (competicion_id, fecha);
create index if not exists partidos_evento_idx on partidos_competicion (evento_id);

-- El calendario guarda a qué competición pertenece cada partido nuestro.
alter table eventos
  add column if not exists competicion_id uuid references competiciones(id) on delete set null,
  add column if not exists puntos_favor   int,
  add column if not exists puntos_contra  int;

-- ---------------------------------------------------------------------------
-- La clasificación, calculada
-- ---------------------------------------------------------------------------

create or replace view clasificacion
with (security_invoker = on) as
with jugados as (
  select competicion_id, local_id as equipo_id,
         puntos_local as pf, puntos_visitante as pc
  from partidos_competicion
  where puntos_local is not null and puntos_visitante is not null
  union all
  select competicion_id, visitante_id,
         puntos_visitante, puntos_local
  from partidos_competicion
  where puntos_local is not null and puntos_visitante is not null
)
select
  e.competicion_id,
  e.id                                                as equipo_id,
  e.nombre                                            as equipo,
  e.es_nuestro,
  count(j.equipo_id)::int                             as jugados,
  count(*) filter (where j.pf >  j.pc)::int           as ganados,
  count(*) filter (where j.pf =  j.pc)::int           as empatados,
  count(*) filter (where j.pf <  j.pc)::int           as perdidos,
  coalesce(sum(j.pf), 0)::int                         as puntos_favor,
  coalesce(sum(j.pc), 0)::int                         as puntos_contra,
  (coalesce(sum(j.pf), 0) - coalesce(sum(j.pc), 0))::int as diferencia,
  (count(*) filter (where j.pf > j.pc) * c.puntos_victoria
   + count(*) filter (where j.pf = j.pc) * c.puntos_empate)::int as puntos
from equipos_competicion e
join competiciones c on c.id = e.competicion_id
left join jugados j on j.equipo_id = e.id
group by e.id, e.competicion_id, e.nombre, e.es_nuestro, c.puntos_victoria, c.puntos_empate;

-- ---------------------------------------------------------------------------
-- Estadísticas
-- ---------------------------------------------------------------------------

create table if not exists estadisticas (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  jugador_id  uuid not null references perfiles(id) on delete cascade,
  clave       text not null,
  valor       int  not null default 0 check (valor >= 0),
  unique (evento_id, jugador_id, clave)
);

create index if not exists estadisticas_jugador_idx on estadisticas (jugador_id);
create index if not exists estadisticas_evento_idx  on estadisticas (evento_id);

create or replace view estadisticas_temporada
with (security_invoker = on) as
select
  e.temporada_id,
  s.jugador_id,
  s.clave,
  sum(s.valor)::int as total,
  count(distinct s.evento_id)::int as partidos
from estadisticas s
join eventos e on e.id = s.evento_id
where s.valor > 0
group by e.temporada_id, s.jugador_id, s.clave;

create or replace view estadisticas_historico
with (security_invoker = on) as
select
  s.jugador_id,
  s.clave,
  sum(s.valor)::int as total,
  count(distinct s.evento_id)::int as partidos
from estadisticas s
where s.valor > 0
group by s.jugador_id, s.clave;

-- ---------------------------------------------------------------------------
-- Permisos
--   La competición, los equipos, los partidos y la clasificación los ve todo el
--   equipo. Las estadísticas también (16), pero escribirlo todo es del staff.
-- ---------------------------------------------------------------------------

alter table competiciones        enable row level security;
alter table equipos_competicion  enable row level security;
alter table partidos_competicion enable row level security;
alter table estadisticas         enable row level security;

drop policy if exists competiciones_leer on competiciones;
create policy competiciones_leer on competiciones
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists competiciones_staff on competiciones;
create policy competiciones_staff on competiciones
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists equipos_comp_leer on equipos_competicion;
create policy equipos_comp_leer on equipos_competicion
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists equipos_comp_staff on equipos_competicion;
create policy equipos_comp_staff on equipos_competicion
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists partidos_comp_leer on partidos_competicion;
create policy partidos_comp_leer on partidos_competicion
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists partidos_comp_staff on partidos_competicion;
create policy partidos_comp_staff on partidos_competicion
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists estadisticas_staff on estadisticas;
create policy estadisticas_staff on estadisticas
  for all to authenticated using (es_staff()) with check (es_staff());
