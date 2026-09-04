-- Coruña Atlantics — Esquema de base de datos (Fase 1A: consola de gestión)
-- Ejecutar en Supabase: SQL Editor -> New query -> pegar -> Run.
-- Es idempotente: se puede volver a ejecutar sin romper nada.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

do $$ begin
  create type rol_usuario as enum ('jugador', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_jugador as enum ('activo', 'lesionado', 'baja_temporal', 'baja');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_cuota as enum ('pendiente', 'parcial', 'al_dia', 'exento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type metodo_pago as enum ('bizum', 'transferencia', 'efectivo', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_documento as enum ('pendiente', 'entregado', 'validado', 'caducado');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Temporadas
--   El importe de la cuota vive aquí, no en el código: cambiarlo el año que
--   viene es editar un campo desde la app.
-- ---------------------------------------------------------------------------

create table if not exists temporadas (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null unique,          -- "2026-27"
  fecha_inicio      date not null,
  fecha_fin         date not null,
  activa            boolean not null default false,
  importe_cuota     numeric(10,2) not null default 0,
  permite_plazos    boolean not null default true,
  creado_en         timestamptz not null default now()
);

-- Solo una temporada activa a la vez.
create unique index if not exists temporadas_una_activa
  on temporadas (activa) where activa;

-- ---------------------------------------------------------------------------
-- Perfiles
--   Un perfil es una FICHA DE JUGADOR, no una cuenta de usuario. Se puede
--   cargar la plantilla entera sin que nadie se haya registrado todavía, que es
--   justo lo que necesita la fase 1A.
--
--   user_id enlaza la ficha con una cuenta cuando esa persona entra por primera
--   vez. Hasta entonces es null y la ficha existe igual.
-- ---------------------------------------------------------------------------

create table if not exists perfiles (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid unique references auth.users(id) on delete set null,
  nombre                        text not null,
  apellidos                     text,
  apodo                         text,
  dorsal                        int check (dorsal between 0 and 99),
  posiciones                    text[] not null default '{}',
  rol                           rol_usuario not null default 'jugador',
  email                         text,
  telefono                      text,
  fecha_nacimiento              date,
  dni                           text,
  talla_equipacion              text,
  foto_url                      text,
  estado                        estado_jugador not null default 'activo',
  alta_en                       date not null default current_date,
  baja_en                       date,
  consentimiento_rgpd_en        timestamptz,
  notas_staff                   text,
  creado_en                     timestamptz not null default now(),
  actualizado_en                timestamptz not null default now()
);

-- Dorsal único entre los que siguen en el equipo. Quien causa baja libera su
-- número sin que haya que tocar su ficha histórica.
create unique index if not exists perfiles_dorsal_activo
  on perfiles (dorsal) where dorsal is not null and estado <> 'baja';

-- El email es la llave con la que se enlaza la ficha a la cuenta al registrarse.
create unique index if not exists perfiles_email_unico
  on perfiles (lower(email)) where email is not null;

create index if not exists perfiles_estado_idx on perfiles (estado);

comment on column perfiles.dni is
  'Dato de categoría reforzada. Se conserva solo mientras la federación lo exija.';
comment on column perfiles.user_id is
  'Null mientras la persona no se haya registrado. La ficha funciona igual.';

-- ---------------------------------------------------------------------------
-- Cuotas y pagos
--   La cuota es lo que se debe. El pago es lo que ha entrado. Separarlos es lo
--   que permite fraccionar, y lo que permitiría añadir una pasarela más
--   adelante sin rehacer el modelo.
-- ---------------------------------------------------------------------------

create table if not exists cuotas (
  id              uuid primary key default gen_random_uuid(),
  jugador_id      uuid not null references perfiles(id) on delete cascade,
  temporada_id    uuid not null references temporadas(id) on delete cascade,
  importe_total   numeric(10,2) not null default 0,
  exento          boolean not null default false,
  exento_nota     text,
  nota            text,
  creado_en       timestamptz not null default now(),
  unique (jugador_id, temporada_id)
);

create table if not exists pagos (
  id              uuid primary key default gen_random_uuid(),
  cuota_id        uuid not null references cuotas(id) on delete cascade,
  importe         numeric(10,2) not null check (importe > 0),
  fecha           date not null default current_date,
  metodo          metodo_pago not null default 'bizum',
  referencia      text,
  nota            text,
  registrado_por  uuid references perfiles(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists pagos_cuota_idx on pagos (cuota_id);

-- Lo pagado y el estado se calculan, nunca se escriben a mano: así no pueden
-- desincronizarse de los pagos reales.
create or replace view cuotas_estado
with (security_invoker = on) as
select
  c.id,
  c.jugador_id,
  c.temporada_id,
  c.importe_total,
  c.exento,
  c.exento_nota,
  c.nota,
  coalesce(sum(p.importe), 0)                     as importe_pagado,
  c.importe_total - coalesce(sum(p.importe), 0)   as importe_pendiente,
  max(p.fecha)                                    as ultimo_pago,
  case
    when c.exento                                     then 'exento'::estado_cuota
    when coalesce(sum(p.importe), 0) >= c.importe_total
     and c.importe_total > 0                          then 'al_dia'::estado_cuota
    when coalesce(sum(p.importe), 0) > 0              then 'parcial'::estado_cuota
    else                                                   'pendiente'::estado_cuota
  end                                             as estado
from cuotas c
left join pagos p on p.cuota_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Documentación
--   Las fechas de caducidad son lo que permite avisar ANTES de que algo venza,
--   en vez de descubrirlo el día del partido.
-- ---------------------------------------------------------------------------

create table if not exists documentacion (
  id                          uuid primary key default gen_random_uuid(),
  jugador_id                  uuid not null references perfiles(id) on delete cascade,
  temporada_id                uuid not null references temporadas(id) on delete cascade,
  licencia_estado             estado_documento not null default 'pendiente',
  licencia_caduca_en          date,
  seguro_estado               estado_documento not null default 'pendiente',
  seguro_caduca_en            date,
  reconocimiento_estado       estado_documento not null default 'pendiente',
  reconocimiento_caduca_en    date,
  dni_entregado               boolean not null default false,
  foto_entregada              boolean not null default false,
  notas_staff                 text,
  actualizado_en              timestamptz not null default now(),
  unique (jugador_id, temporada_id)
);

-- ---------------------------------------------------------------------------
-- Tutores legales (preparado para categoría base; hoy sin uso)
-- ---------------------------------------------------------------------------

create table if not exists tutores (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  telefono    text,
  email       text,
  creado_en   timestamptz not null default now()
);

create table if not exists tutorias (
  tutor_id                uuid not null references tutores(id) on delete cascade,
  jugador_id              uuid not null references perfiles(id) on delete cascade,
  relacion                text,
  consentimiento_en       timestamptz,
  consentimiento_imagen   boolean not null default false,
  primary key (tutor_id, jugador_id)
);

-- ---------------------------------------------------------------------------
-- Automatismos
-- ---------------------------------------------------------------------------

-- Al registrarse alguien, se busca su ficha por email y se enlaza. Si no
-- existe, se le crea una en blanco. Así el orden no importa: da igual que
-- primero cargues el roster o que primero entre el jugador.
create or replace function enlazar_o_crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare encontrado uuid;
begin
  select id into encontrado
  from perfiles
  where lower(email) = lower(new.email) and user_id is null
  limit 1;

  if encontrado is not null then
    update perfiles set user_id = new.id where id = encontrado;
  else
    insert into perfiles (user_id, nombre, email)
    values (new.id, split_part(new.email, '@', 1), new.email);
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function enlazar_o_crear_perfil();

-- Marca de tiempo de última modificación.
create or replace function tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

drop trigger if exists perfiles_actualizado on perfiles;
create trigger perfiles_actualizado before update on perfiles
  for each row execute function tocar_actualizado_en();

drop trigger if exists documentacion_actualizado on documentacion;
create trigger documentacion_actualizado before update on documentacion
  for each row execute function tocar_actualizado_en();

-- Al dar de alta a un jugador se le crea la cuota y la ficha de documentación
-- de la temporada activa, con el importe vigente.
create or replace function preparar_temporada_de_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype;
begin
  select * into t from temporadas where activa limit 1;
  if not found then return new; end if;

  insert into cuotas (jugador_id, temporada_id, importe_total)
  values (new.id, t.id, t.importe_cuota)
  on conflict (jugador_id, temporada_id) do nothing;

  insert into documentacion (jugador_id, temporada_id)
  values (new.id, t.id)
  on conflict (jugador_id, temporada_id) do nothing;

  return new;
end $$;

drop trigger if exists perfiles_preparar_temporada on perfiles;
create trigger perfiles_preparar_temporada after insert on perfiles
  for each row execute function preparar_temporada_de_jugador();

-- Al abrir una temporada nueva, prepara cuota y documentación de toda la
-- plantilla que siga activa. Evita 60 altas a mano cada agosto.
create or replace function abrir_temporada(p_temporada uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype; n int;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede abrir una temporada';
  end if;

  select * into t from temporadas where id = p_temporada;
  if not found then raise exception 'Temporada no encontrada'; end if;

  insert into cuotas (jugador_id, temporada_id, importe_total)
  select p.id, t.id, t.importe_cuota from perfiles p where p.estado <> 'baja'
  on conflict (jugador_id, temporada_id) do nothing;

  get diagnostics n = row_count;

  insert into documentacion (jugador_id, temporada_id)
  select p.id, t.id from perfiles p where p.estado <> 'baja'
  on conflict (jugador_id, temporada_id) do nothing;

  return n;
end $$;
