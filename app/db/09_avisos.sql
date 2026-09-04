-- Coruña Atlantics — Tablón de avisos
-- Ejecutar DESPUÉS de 08_dorsales.sql.
--
-- Los avisos son unidireccionales: el club publica y el equipo lee. Si se
-- pudieran contestar, en dos semanas serían el grupo de WhatsApp otra vez, que
-- es justo de lo que se quiere salir.

do $$ begin
  create type prioridad_aviso as enum ('normal', 'urgente');
exception when duplicate_object then null; end $$;

create table if not exists avisos (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references temporadas(id) on delete cascade,
  autor_id      uuid references perfiles(id) on delete set null,
  titulo        text not null,
  cuerpo        text,
  prioridad     prioridad_aviso not null default 'normal',
  destinatarios unidad_equipo not null default 'todos',
  fijado        boolean not null default false,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists avisos_temporada_idx on avisos (temporada_id, creado_en desc);

drop trigger if exists avisos_actualizado on avisos;
create trigger avisos_actualizado before update on avisos
  for each row execute function tocar_actualizado_en();

-- Quién ha leído qué. Es lo que permite saber a quién hay que avisar por otro
-- canal cuando algo importa de verdad.
create table if not exists lecturas_aviso (
  aviso_id    uuid not null references avisos(id) on delete cascade,
  jugador_id  uuid not null references perfiles(id) on delete cascade,
  leido_en    timestamptz not null default now(),
  primary key (aviso_id, jugador_id)
);

create index if not exists lecturas_jugador_idx on lecturas_aviso (jugador_id);

-- Recuento de lecturas por aviso, para la pantalla del staff.
create or replace view avisos_leidos
with (security_invoker = on) as
select aviso_id, count(*)::int as leidos
from lecturas_aviso
group by aviso_id;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table avisos          enable row level security;
alter table lecturas_aviso  enable row level security;

drop policy if exists avisos_leer on avisos;
create policy avisos_leer on avisos
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists avisos_staff on avisos;
create policy avisos_staff on avisos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Cada uno marca lo suyo como leído; el staff ve todas las lecturas.
drop policy if exists lecturas_leer on lecturas_aviso;
create policy lecturas_leer on lecturas_aviso
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists lecturas_propia on lecturas_aviso;
create policy lecturas_propia on lecturas_aviso
  for insert to authenticated with check (jugador_id = mi_perfil_id());

drop policy if exists lecturas_staff on lecturas_aviso;
create policy lecturas_staff on lecturas_aviso
  for all to authenticated using (es_staff()) with check (es_staff());
