-- Coruña Atlantics — Competiciones, clasificación y estadísticas
-- Ejecutar DESPUÉS de 14_tienda.sql.
--
-- Dos cosas que conviene tener claras antes de leer el modelo:
--
-- 1. La clasificación se teclea. La app solo conoce vuestros partidos, así que
--    no puede calcular una tabla de liga: no sabe cómo han quedado los demás
--    equipos entre ellos. Se copia de la federación y se edita.
--
-- 2. Las estadísticas van en filas, no en columnas. Una fila por partido,
--    jugador y concepto. Así, añadir un concepto nuevo el año que viene es
--    escribir una línea en la app, no migrar la base de datos. Y el histórico
--    acumulado es una suma.

do $$ begin
  create type tipo_competicion as enum ('liga', 'torneo', 'amistoso');
exception when duplicate_object then null; end $$;

create table if not exists competiciones (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references temporadas(id) on delete cascade,
  nombre        text not null,
  tipo          tipo_competicion not null default 'liga',
  notas         text,
  activa        boolean not null default true,
  creado_en     timestamptz not null default now()
);

create index if not exists competiciones_temporada_idx on competiciones (temporada_id);

-- Una fila por equipo de la tabla, tal cual la publica la federación.
create table if not exists clasificacion (
  id              uuid primary key default gen_random_uuid(),
  competicion_id  uuid not null references competiciones(id) on delete cascade,
  posicion        int,
  equipo          text not null,
  jugados         int not null default 0,
  ganados         int not null default 0,
  empatados       int not null default 0,
  perdidos        int not null default 0,
  puntos_favor    int not null default 0,
  puntos_contra   int not null default 0,
  puntos          int not null default 0,
  es_nuestro      boolean not null default false,
  actualizado_en  timestamptz not null default now()
);

create index if not exists clasificacion_comp_idx on clasificacion (competicion_id, posicion);

drop trigger if exists clasificacion_actualizado on clasificacion;
create trigger clasificacion_actualizado before update on clasificacion
  for each row execute function tocar_actualizado_en();

-- El resultado de nuestros partidos vive en el propio evento.
alter table eventos
  add column if not exists competicion_id uuid references competiciones(id) on delete set null,
  add column if not exists puntos_favor   int,
  add column if not exists puntos_contra  int;

-- ---------------------------------------------------------------------------
-- Estadísticas
--   clave es texto libre a propósito: el catálogo vive en la app, así que
--   añadir un concepto no toca la base de datos.
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

-- Totales por jugador y temporada: lo que alimenta el histórico.
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

-- Y el acumulado de siempre, sin separar por temporada.
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

-- Nuestro balance, que esto sí lo puede calcular la app.
create or replace view balance_competicion
with (security_invoker = on) as
select
  e.competicion_id,
  count(*)::int                                                as jugados,
  count(*) filter (where e.puntos_favor > e.puntos_contra)::int as ganados,
  count(*) filter (where e.puntos_favor = e.puntos_contra)::int as empatados,
  count(*) filter (where e.puntos_favor < e.puntos_contra)::int as perdidos,
  coalesce(sum(e.puntos_favor), 0)::int                        as puntos_favor,
  coalesce(sum(e.puntos_contra), 0)::int                       as puntos_contra
from eventos e
where e.tipo = 'partido' and not e.cancelado
  and e.puntos_favor is not null and e.puntos_contra is not null
group by e.competicion_id;

-- ---------------------------------------------------------------------------
-- Permisos
--   La competición y la clasificación las ve todo el equipo: es información
--   pública de la federación. Las estadísticas, solo el staff.
-- ---------------------------------------------------------------------------

alter table competiciones enable row level security;
alter table clasificacion enable row level security;
alter table estadisticas  enable row level security;

drop policy if exists competiciones_leer on competiciones;
create policy competiciones_leer on competiciones
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists competiciones_staff on competiciones;
create policy competiciones_staff on competiciones
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists clasificacion_leer on clasificacion;
create policy clasificacion_leer on clasificacion
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists clasificacion_staff on clasificacion;
create policy clasificacion_staff on clasificacion
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists estadisticas_staff on estadisticas;
create policy estadisticas_staff on estadisticas
  for all to authenticated using (es_staff()) with check (es_staff());
