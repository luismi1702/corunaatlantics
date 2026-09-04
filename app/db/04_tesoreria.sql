-- Coruña Atlantics — Tesorería
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls.sql.
--
-- Aquí hay una trampa que conviene tener presente: los pagos de cuota YA están
-- registrados en la tabla `pagos`. Si además se apuntasen como movimiento de
-- ingreso, ese dinero se contaría dos veces y el saldo mentiría.
--
-- Por eso `movimientos` guarda TODO MENOS las cuotas, y el resumen suma las
-- cuotas por su lado, desde los pagos. La app no deja crear un movimiento en la
-- categoría 'cuotas' justamente para que nadie lo duplique sin darse cuenta.

do $$ begin
  create type tipo_movimiento as enum ('ingreso', 'gasto');
exception when duplicate_object then null; end $$;

create table if not exists movimientos (
  id                uuid primary key default gen_random_uuid(),
  temporada_id      uuid not null references temporadas(id) on delete cascade,
  tipo              tipo_movimiento not null,
  concepto          text not null,
  categoria         text not null default 'otros',
  importe           numeric(10,2) not null check (importe > 0),
  fecha             date not null default current_date,
  metodo            metodo_pago,
  justificante_url  text,
  nota              text,
  registrado_por    uuid references perfiles(id) on delete set null,
  creado_en         timestamptz not null default now(),

  -- Las cuotas no se apuntan a mano: salen de los pagos.
  constraint movimientos_sin_cuotas check (categoria <> 'cuotas')
);

create index if not exists movimientos_temporada_idx on movimientos (temporada_id, fecha desc);

comment on table movimientos is
  'Ingresos y gastos del club EXCEPTO las cuotas de jugadores, que se calculan desde pagos.';

-- Resumen por temporada. Junta las dos fuentes de ingreso en una sola cifra
-- para que el saldo sea el de verdad y no haga falta sumarlo a mano.
create or replace view tesoreria_resumen
with (security_invoker = on) as
with cuotas_cobradas as (
  select c.temporada_id, coalesce(sum(p.importe), 0) as total
  from pagos p join cuotas c on c.id = p.cuota_id
  group by c.temporada_id
),
otros as (
  select temporada_id,
         coalesce(sum(importe) filter (where tipo = 'ingreso'), 0) as ingresos,
         coalesce(sum(importe) filter (where tipo = 'gasto'), 0)   as gastos
  from movimientos
  group by temporada_id
)
select
  t.id                                              as temporada_id,
  t.nombre,
  coalesce(cc.total, 0)                             as ingresos_cuotas,
  coalesce(o.ingresos, 0)                           as ingresos_otros,
  coalesce(cc.total, 0) + coalesce(o.ingresos, 0)   as ingresos_total,
  coalesce(o.gastos, 0)                             as gastos_total,
  coalesce(cc.total, 0) + coalesce(o.ingresos, 0)
    - coalesce(o.gastos, 0)                         as saldo
from temporadas t
left join cuotas_cobradas cc on cc.temporada_id = t.id
left join otros o            on o.temporada_id  = t.id;

-- Desglose por categoría, para ver en qué se va el dinero.
create or replace view tesoreria_por_categoria
with (security_invoker = on) as
select temporada_id, tipo, categoria,
       sum(importe) as total,
       count(*)     as n
from movimientos
group by temporada_id, tipo, categoria;

-- --- Permisos --------------------------------------------------------------
-- La tesorería es solo del admin. Ni siquiera el staff la ve: saber cuánto
-- dinero hay en caja no es necesario para entrenar a nadie.

alter table movimientos enable row level security;

drop policy if exists movimientos_admin on movimientos;
create policy movimientos_admin on movimientos
  for all to authenticated using (es_admin()) with check (es_admin());
