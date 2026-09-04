-- Coruña Atlantics — Instalación completa
--
-- GENERADO. No editar a mano: es la unión de los ficheros numerados de esta
-- misma carpeta, en el orden en que hay que ejecutarlos. Si hay que cambiar
-- algo, se cambia el fichero suelto y se vuelve a generar.
--
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.
-- Después, ejecutar 03_arranque.sql con tu email para crear la temporada y
-- nombrarte administrador.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.


-- ==========================================================================
-- 01_schema.sql
-- ==========================================================================

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


-- ==========================================================================
-- 02_rls.sql
-- ==========================================================================

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


-- ==========================================================================
-- 04_tesoreria.sql
-- ==========================================================================

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


-- ==========================================================================
-- 05_calendario.sql
-- ==========================================================================

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


-- ==========================================================================
-- 06_jugador.sql
-- ==========================================================================

-- Coruña Atlantics — La parte del jugador
-- Ejecutar DESPUÉS de 05_calendario.sql.
--
-- Lo que un jugador dice que hará y lo que acaba haciendo son dos datos
-- distintos, y se guardan en columnas distintas:
--   confirmacion -> la escribe el jugador, antes del entreno
--   estado       -> la escribe el staff pasando lista, en el campo
-- Mezclarlos haría imposible saber quién dijo que iba y luego no apareció.

do $$ begin
  create type confirmacion_jugador as enum ('voy', 'no_voy', 'duda');
exception when duplicate_object then null; end $$;

alter table asistencias
  add column if not exists confirmacion confirmacion_jugador,
  add column if not exists confirmado_en timestamptz;

-- El estado pasa a ser opcional: una fila puede existir solo con la
-- confirmación del jugador, antes de que nadie haya pasado lista.
alter table asistencias alter column estado drop not null;

-- ---------------------------------------------------------------------------
-- Permisos del jugador sobre su propia asistencia
-- ---------------------------------------------------------------------------

drop policy if exists asistencias_confirmar_alta on asistencias;
create policy asistencias_confirmar_alta on asistencias
  for insert to authenticated
  with check (jugador_id = mi_perfil_id());

drop policy if exists asistencias_confirmar_cambio on asistencias;
create policy asistencias_confirmar_cambio on asistencias
  for update to authenticated
  using (jugador_id = mi_perfil_id())
  with check (jugador_id = mi_perfil_id());

-- Un jugador no puede escribir el resultado de la lista, solo su confirmación.
-- Sin esto, las políticas de arriba le dejarían marcarse presente él mismo.
create or replace function bloquear_lista_del_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not es_staff() then
    if tg_op = 'INSERT' then
      new.estado := null;
      new.registrado_por := null;
    else
      new.estado := old.estado;
      new.registrado_por := old.registrado_por;
      new.evento_id := old.evento_id;
      new.jugador_id := old.jugador_id;
    end if;
    new.confirmado_en := now();
  end if;
  return new;
end $$;

drop trigger if exists asistencias_bloquear_lista on asistencias;
create trigger asistencias_bloquear_lista before insert or update on asistencias
  for each row execute function bloquear_lista_del_jugador();

-- ---------------------------------------------------------------------------
-- Lo que el jugador ve del resto del equipo
--   Nombre, dorsal y posición: lo que ya se ve en una camiseta. Ni teléfonos,
--   ni documentación, ni cuotas, ni notas del staff.
-- ---------------------------------------------------------------------------

create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado
from perfiles
where estado <> 'baja';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos.';

-- ---------------------------------------------------------------------------
-- Recuento de confirmaciones de un evento
--   El jugador no puede leer las filas de sus compañeros, pero sí saber cuánta
--   gente ha dicho que va: es lo que hace que confirmar tenga sentido.
-- ---------------------------------------------------------------------------

create or replace function confirmados_de(p_evento uuid)
returns table (voy int, no_voy int, duda int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where confirmacion = 'voy')::int,
    count(*) filter (where confirmacion = 'no_voy')::int,
    count(*) filter (where confirmacion = 'duda')::int
  from asistencias
  where evento_id = p_evento;
$$;


-- ==========================================================================
-- 07_registro.sql
-- ==========================================================================

-- Coruña Atlantics — Registro de jugadores con aprobación
-- Ejecutar DESPUÉS de 06_jugador.sql.
--
-- Hasta aquí, cualquiera que conociera la dirección de la app podía entrar con
-- su email y quedarse dentro como jugador. Esto lo cierra: registrarse es
-- pedir entrar, no entrar.
--
-- El estado de acceso va en columna aparte del estado deportivo a propósito:
-- alguien puede estar lesionado y aprobado, o activo y pendiente. Mezclarlos en
-- un solo campo se enreda a las dos semanas.

do $$ begin
  create type acceso_estado as enum ('nuevo', 'pendiente', 'aprobado', 'rechazado');
exception when duplicate_object then null; end $$;

alter table perfiles
  add column if not exists acceso        acceso_estado not null default 'nuevo',
  add column if not exists solicitado_en timestamptz,
  add column if not exists resuelto_en   timestamptz,
  add column if not exists resuelto_por  uuid references perfiles(id) on delete set null,
  add column if not exists motivo_rechazo text;

-- Todo lo que ya existía lo dio de alta el club, así que está aprobado.
update perfiles set acceso = 'aprobado' where acceso = 'nuevo' and nombre is not null;

create index if not exists perfiles_acceso_idx on perfiles (acceso);

-- ---------------------------------------------------------------------------
-- Quién está dentro de verdad
-- ---------------------------------------------------------------------------

create or replace function es_aprobado()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select acceso = 'aprobado' from perfiles where user_id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Una ficha creada por el club entra ya aprobada; una creada al registrarse,
-- no. El disparador de alta tiene que distinguirlo.
-- ---------------------------------------------------------------------------

create or replace function enlazar_o_crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare encontrado uuid;
begin
  -- Si el club ya tenía su ficha, se enlaza y conserva su estado de acceso.
  select id into encontrado
  from perfiles
  where lower(email) = lower(new.email) and user_id is null
  limit 1;

  if encontrado is not null then
    update perfiles set user_id = new.id where id = encontrado;
  else
    -- Nadie le esperaba: entra como solicitud sin rellenar.
    insert into perfiles (user_id, nombre, email, acceso)
    values (new.id, split_part(new.email, '@', 1), new.email, 'nuevo');
  end if;

  return new;
end $$;

-- Las altas que haga el club desde el roster entran aprobadas.
create or replace function aprobar_altas_del_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if es_staff() and new.acceso = 'nuevo' then
    new.acceso := 'aprobado';
  end if;
  return new;
end $$;

drop trigger if exists perfiles_aprobar_altas on perfiles;
create trigger perfiles_aprobar_altas before insert on perfiles
  for each row execute function aprobar_altas_del_club();

-- ---------------------------------------------------------------------------
-- Un jugador puede entregar su solicitud, no aprobarla
-- ---------------------------------------------------------------------------

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
    new.resuelto_en := old.resuelto_en;
    new.resuelto_por := old.resuelto_por;
    new.motivo_rechazo := old.motivo_rechazo;

    -- Único movimiento que puede hacer por su cuenta: entregar la solicitud.
    if old.acceso = 'nuevo' and new.acceso = 'pendiente' then
      new.solicitado_en := now();
    else
      new.acceso := old.acceso;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Nada del club se ve sin estar aprobado
-- ---------------------------------------------------------------------------

drop policy if exists temporadas_leer on temporadas;
create policy temporadas_leer on temporadas
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists eventos_leer on eventos;
create policy eventos_leer on eventos
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists horarios_leer on horarios_entreno;
create policy horarios_leer on horarios_entreno
  for select to authenticated using (es_aprobado() or es_staff());

-- El staff sigue viendo la plantilla entera; un jugador, solo su propia ficha
-- (y para eso no hace falta estar aprobado: tiene que poder rellenarla).
drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles
  for select to authenticated using (user_id = auth.uid() or es_staff());

-- La vista de compañeros solo devuelve algo a quien ya está dentro, y solo
-- gente aprobada: las solicitudes pendientes no son plantilla todavía.
create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado
from perfiles
where estado <> 'baja'
  and acceso = 'aprobado'
  and (es_aprobado() or es_staff());

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

-- ---------------------------------------------------------------------------
-- Resolver una solicitud
-- ---------------------------------------------------------------------------

create or replace function resolver_solicitud(p_jugador uuid, p_aprobar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede resolver solicitudes';
  end if;

  update perfiles
  set acceso        = case when p_aprobar then 'aprobado'::acceso_estado else 'rechazado'::acceso_estado end,
      motivo_rechazo = case when p_aprobar then null else p_motivo end,
      resuelto_en   = now(),
      resuelto_por  = mi_perfil_id(),
      alta_en       = case when p_aprobar then current_date else alta_en end
  where id = p_jugador;

  -- Al aprobar se le prepara la cuota y la ficha de documentación, igual que
  -- en un alta hecha desde el roster.
  if p_aprobar then
    perform preparar_temporada_de_jugador_manual(p_jugador);
  end if;
end $$;

-- Una solicitud sin aprobar no es plantilla: no se le abre cuota ni ficha de
-- documentación hasta que entra de verdad.
create or replace function preparar_temporada_de_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype;
begin
  if new.acceso <> 'aprobado' then return new; end if;

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

create or replace function preparar_temporada_de_jugador_manual(p_jugador uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype;
begin
  select * into t from temporadas where activa limit 1;
  if not found then return; end if;

  insert into cuotas (jugador_id, temporada_id, importe_total)
  values (p_jugador, t.id, t.importe_cuota)
  on conflict (jugador_id, temporada_id) do nothing;

  insert into documentacion (jugador_id, temporada_id)
  values (p_jugador, t.id)
  on conflict (jugador_id, temporada_id) do nothing;
end $$;

