-- Coruña Atlantics — Material del club
-- Ejecutar DESPUÉS de 09_avisos.sql.
--
-- En fútbol americano el material es el activo caro y el que más se pierde.
-- Saber que el casco 14 lo tiene alguien que se dio de baja en marzo vale
-- dinero real.

do $$ begin
  create type tipo_material as enum
    ('casco', 'hombreras', 'jersey', 'pantalon', 'balon', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_material as enum ('nuevo', 'bueno', 'usado', 'retirado');
exception when duplicate_object then null; end $$;

create table if not exists material (
  id            uuid primary key default gen_random_uuid(),
  tipo          tipo_material not null,
  identificador text not null,             -- "Casco 14", "Hombreras L-03"
  talla         text,
  estado        estado_material not null default 'bueno',
  fecha_compra  date,
  coste         numeric(10,2),
  notas         text,
  creado_en     timestamptz not null default now()
);

create index if not exists material_tipo_idx on material (tipo, identificador);

create table if not exists prestamos_material (
  id                uuid primary key default gen_random_uuid(),
  material_id       uuid not null references material(id) on delete cascade,
  jugador_id        uuid not null references perfiles(id) on delete cascade,
  entregado_en      date not null default current_date,
  devuelto_en       date,
  estado_entrega    estado_material,
  estado_devolucion estado_material,
  fianza            numeric(10,2),
  notas             text,
  registrado_por    uuid references perfiles(id) on delete set null,
  creado_en         timestamptz not null default now()
);

create index if not exists prestamos_material_idx on prestamos_material (material_id);
create index if not exists prestamos_jugador_idx  on prestamos_material (jugador_id);

-- Una pieza solo puede estar prestada a una persona a la vez.
create unique index if not exists prestamos_una_vez
  on prestamos_material (material_id) where devuelto_en is null;

-- Cada pieza con quién la tiene ahora mismo, si es que la tiene alguien.
create or replace view material_estado
with (security_invoker = on) as
select
  m.*,
  p.id            as prestamo_id,
  p.jugador_id,
  p.entregado_en,
  p.fianza
from material m
left join prestamos_material p
  on p.material_id = m.id and p.devuelto_en is null;

-- ---------------------------------------------------------------------------
-- Permisos
--   El inventario es cosa del club. Un jugador solo ve lo que tiene él, para
--   saber qué le toca devolver.
-- ---------------------------------------------------------------------------

alter table material           enable row level security;
alter table prestamos_material enable row level security;

drop policy if exists material_leer on material;
create policy material_leer on material
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists material_staff on material;
create policy material_staff on material
  for all to authenticated using (es_staff()) with check (es_staff());

drop policy if exists prestamos_leer on prestamos_material;
create policy prestamos_leer on prestamos_material
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists prestamos_staff on prestamos_material;
create policy prestamos_staff on prestamos_material
  for all to authenticated using (es_staff()) with check (es_staff());
