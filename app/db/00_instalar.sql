-- Coruña Atlantics — Instalación completa
--
-- GENERADO. No editar a mano: es la unión de los ficheros numerados de esta
-- misma carpeta, en el orden en que hay que ejecutarlos. Si hay que cambiar
-- algo, se cambia el fichero suelto y se vuelve a generar.
--
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.
--
-- Con esto queda todo montado, incluida una temporada para empezar. No hace
-- falta nada más: la PRIMERA persona que entre en la app será la
-- administradora, así que entra tú antes de repartir el enlace.
--
-- 03_arranque.sql queda como alternativa manual por si hace falta nombrar
-- administradora a otra persona.
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


-- ==========================================================================
-- 08_dorsales.sql
-- ==========================================================================

-- Coruña Atlantics — El jugador elige su dorsal
-- Ejecutar DESPUÉS de 07_registro.sql.
--
-- Quien lo coge primero se lo queda. El bloqueo de verdad no lo hace la app:
-- lo hace el índice único `perfiles_dorsal_activo` de 01_schema.sql, que además
-- resuelve solo el caso de dos jugadores tocando el mismo número a la vez —
-- uno de los dos se lleva un error de duplicado y la app se lo explica.
--
-- Solo puede elegir quien ya está aprobado. Si se pudiera al registrarse,
-- cualquiera con el enlace se reservaría un número sin ser del equipo.

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

comment on index perfiles_dorsal_activo is
  'El bloqueo real del dorsal. Quien causa baja libera su número.';


-- ==========================================================================
-- 09_avisos.sql
-- ==========================================================================

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


-- ==========================================================================
-- 10_material.sql
-- ==========================================================================

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


-- ==========================================================================
-- 11_importe_cuota.sql
-- ==========================================================================

-- Coruña Atlantics — Aplicar el importe de la cuota a posteriori
-- Ejecutar DESPUÉS de 10_material.sql.
--
-- El caso real: se monta la app antes de saber cuánto va a costar la cuota, así
-- que la temporada arranca con importe 0. La gente se va registrando y a cada
-- uno se le abre su cuota... a 0. Cuando semanas después se fija el precio,
-- cambiar el importe de la temporada NO toca las cuotas ya creadas, y quedan
-- sesenta fichas a cero que habría que editar a mano.
--
-- Esta función las pone al día de una vez. Solo toca las que están a cero, sin
-- ningún pago y sin exención: una cuota con un importe distinto es una decisión
-- que alguien tomó, y no se pisa.

create or replace function aplicar_importe_cuota(p_temporada uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype; n int;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede cambiar los importes';
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

comment on function aplicar_importe_cuota is
  'Pone al importe vigente las cuotas que quedaron a cero. No toca las que ya tienen pagos, un importe propio o exención.';


-- ==========================================================================
-- 12_arranque_automatico.sql
-- ==========================================================================

-- Coruña Atlantics — Arranque automático
-- Ejecutar DESPUÉS de 11_importe_cuota.sql. Va incluido en 00_instalar.sql.
--
-- Quita dos pasos de la puesta en marcha: crea la temporada y hace que la
-- primera persona que entre sea la administradora. Así, después de ejecutar el
-- instalador, basta con abrir la app y entrar con tu email.
--
-- OJO: "la primera persona que entre" es literal. Hay que entrar uno mismo
-- ANTES de repartir el enlace o el QR, o el primero que se registre se llevará
-- el mando del club.

-- ---------------------------------------------------------------------------
-- Una temporada para empezar
--   Las fechas y el importe se ajustan luego desde Ajustes; lo que importa es
--   que exista, porque sin temporada activa la app no tiene dónde colgar nada.
-- ---------------------------------------------------------------------------

insert into temporadas (nombre, fecha_inicio, fecha_fin, activa, importe_cuota, permite_plazos)
select
  extract(year from current_date)::text || '-' ||
    right((extract(year from current_date) + 1)::text, 2),
  make_date(extract(year from current_date)::int, 9, 1),
  make_date(extract(year from current_date)::int + 1, 6, 30),
  true, 0, true
where not exists (select 1 from temporadas);

-- ---------------------------------------------------------------------------
-- El primero que entra manda
-- ---------------------------------------------------------------------------

create or replace function aprobar_altas_del_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Club recién montado: quien llega primero se queda con la administración.
  -- Es la alternativa a nombrar al admin a mano desde el editor SQL.
  if not exists (select 1 from perfiles where rol = 'admin') then
    new.rol    := 'admin';
    new.acceso := 'aprobado';
    return new;
  end if;

  -- A partir de ahí, lo normal: lo que da de alta el club entra aprobado, y
  -- quien se registra por su cuenta espera a que alguien le apruebe.
  if es_staff() and new.acceso = 'nuevo' then
    new.acceso := 'aprobado';
  end if;

  return new;
end $$;

comment on function aprobar_altas_del_club is
  'La primera cuenta que se crea es la administradora. Entrar antes de repartir el enlace.';


-- ==========================================================================
-- 13_permisos_funciones.sql
-- ==========================================================================

-- Coruña Atlantics — Cerrar funciones que quedaban demasiado abiertas
-- Ejecutar DESPUÉS de 12_arranque_automatico.sql.
--
-- Todo lo que vive en el esquema `public` de Supabase queda expuesto como
-- llamada remota, incluidas las funciones auxiliares. Las que además son
-- SECURITY DEFINER se saltan las políticas RLS, así que si no comprueban quién
-- llama, cualquiera con una sesión abierta puede ejecutarlas.
--
-- Repasando las diecinueve del proyecto, dos estaban en ese caso.

-- ---------------------------------------------------------------------------
-- 1. preparar_temporada_de_jugador_manual
--    Solo la usa resolver_solicitud() por dentro, pero al estar en public
--    cualquiera podía llamarla con el id de otro jugador y crearle filas de
--    cuota y documentación. No hacía daño real (son filas que iban a existir
--    igual, y el insert ignora duplicados), pero no tiene por qué ser
--    alcanzable desde fuera.
-- ---------------------------------------------------------------------------

revoke execute on function preparar_temporada_de_jugador_manual(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. confirmados_de
--    Devuelve cuánta gente ha confirmado un entreno. Es información inocua y el
--    jugador la necesita, pero quien está pendiente de aprobación no debería
--    poder sacar nada del club: si no, la pantalla de espera deja de ser lo que
--    dice ser.
-- ---------------------------------------------------------------------------

create or replace function confirmados_de(p_evento uuid)
returns table (voy int, no_voy int, duda int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where confirmacion = 'voy')::int,
    count(*) filter (where confirmacion = 'no_voy')::int,
    count(*) filter (where confirmacion = 'duda')::int
  from asistencias
  where evento_id = p_evento
    and (es_aprobado() or es_staff());
$$;

comment on function confirmados_de is
  'Recuento de confirmaciones de un evento. Devuelve ceros a quien no esté aprobado.';


-- ==========================================================================
-- 14_tienda.sql
-- ==========================================================================

-- Coruña Atlantics — Equipación y merchandising
-- Ejecutar DESPUÉS de 13_permisos_funciones.sql.
--
-- No es una tienda con pasarela de pago: es la lista de lo que vende el club y
-- quién ha pedido qué. El dinero sigue entrando por Bizum, igual que las cuotas,
-- por las mismas razones que en su día (ver docs/decisiones.md).
--
-- Lo que resuelve es el lío de verdad: saber cuántas sudaderas hay que pedir,
-- de qué tallas, y quién ha pagado ya.

do $$ begin
  create type estado_pedido as enum ('pedido', 'entregado', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists productos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  precio       numeric(10,2) not null default 0,
  foto_url     text,
  tallas       text[] not null default '{}',   -- vacío = producto sin tallas
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists productos_actualizado on productos;
create trigger productos_actualizado before update on productos
  for each row execute function tocar_actualizado_en();

create table if not exists pedidos (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references productos(id) on delete cascade,
  jugador_id   uuid not null references perfiles(id) on delete cascade,
  talla        text,
  cantidad     int not null default 1 check (cantidad between 1 and 20),
  estado       estado_pedido not null default 'pedido',
  pagado       boolean not null default false,
  nota         text,
  creado_en    timestamptz not null default now()
);

create index if not exists pedidos_producto_idx on pedidos (producto_id);
create index if not exists pedidos_jugador_idx  on pedidos (jugador_id);

-- Resumen por producto: cuánto se ha pedido y cuánto queda por cobrar.
create or replace view pedidos_resumen
with (security_invoker = on) as
select
  p.producto_id,
  sum(p.cantidad)::int                                             as unidades,
  count(distinct p.jugador_id)::int                                as personas,
  sum(p.cantidad * pr.precio)                                      as total,
  sum(p.cantidad * pr.precio) filter (where p.pagado)              as cobrado
from pedidos p
join productos pr on pr.id = p.producto_id
where p.estado <> 'cancelado'
group by p.producto_id;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table productos enable row level security;
alter table pedidos   enable row level security;

drop policy if exists productos_leer on productos;
create policy productos_leer on productos
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists productos_staff on productos;
create policy productos_staff on productos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Cada uno ve y hace sus pedidos; el staff los ve todos.
drop policy if exists pedidos_leer on pedidos;
create policy pedidos_leer on pedidos
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists pedidos_propio on pedidos;
create policy pedidos_propio on pedidos
  for insert to authenticated with check (jugador_id = mi_perfil_id());

drop policy if exists pedidos_staff on pedidos;
create policy pedidos_staff on pedidos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Un jugador puede cancelar lo suyo mientras no esté entregado, pero no
-- marcarse el pago a sí mismo: eso lo decide quien cobra.
create or replace function bloquear_pago_del_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not es_staff() then
    new.pagado     := old.pagado;
    new.producto_id := old.producto_id;
    new.jugador_id := old.jugador_id;
    if old.estado = 'entregado' then
      new.estado := old.estado;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_bloquear_pago on pedidos;
create trigger pedidos_bloquear_pago before update on pedidos
  for each row execute function bloquear_pago_del_jugador();

drop policy if exists pedidos_cambiar_propio on pedidos;
create policy pedidos_cambiar_propio on pedidos
  for update to authenticated
  using (jugador_id = mi_perfil_id()) with check (jugador_id = mi_perfil_id());

-- ---------------------------------------------------------------------------
-- Almacén de las fotos
--   Bucket público: una foto de una sudadera no es un dato sensible y así se
--   sirve directa, sin firmar cada URL. Subir y borrar, solo el staff.
--
--   Va dentro de un bloque que atrapa cualquier error a propósito. Según cómo
--   esté configurado el proyecto, el rol del editor SQL puede no tener permiso
--   para tocar las políticas de `storage.objects`. Como el editor ejecuta todo
--   el script en una sola transacción, un fallo aquí deshacía TODO lo anterior
--   y las tablas de arriba no llegaban a crearse.
--
--   Si sale el aviso, las tablas quedan creadas igual y el bucket se crea a
--   mano desde el panel: Storage -> New bucket -> nombre "productos" -> Public.
-- ---------------------------------------------------------------------------

do $bloque$
begin
  insert into storage.buckets (id, name, public)
  values ('productos', 'productos', true)
  on conflict (id) do nothing;

  execute $p$ drop policy if exists productos_foto_ver on storage.objects $p$;
  execute $p$ create policy productos_foto_ver on storage.objects
             for select to public using (bucket_id = 'productos') $p$;

  execute $p$ drop policy if exists productos_foto_subir on storage.objects $p$;
  execute $p$ create policy productos_foto_subir on storage.objects
             for insert to authenticated with check (bucket_id = 'productos' and es_staff()) $p$;

  execute $p$ drop policy if exists productos_foto_cambiar on storage.objects $p$;
  execute $p$ create policy productos_foto_cambiar on storage.objects
             for update to authenticated using (bucket_id = 'productos' and es_staff()) $p$;

  execute $p$ drop policy if exists productos_foto_borrar on storage.objects $p$;
  execute $p$ create policy productos_foto_borrar on storage.objects
             for delete to authenticated using (bucket_id = 'productos' and es_staff()) $p$;

  raise notice 'Almacen de fotos listo.';
exception when others then
  raise notice 'No se ha podido configurar el almacen de fotos (%). Las tablas SI se han creado. Crea el bucket "productos" a mano desde Storage y marcalo como Public.', sqlerrm;
end $bloque$;


-- ==========================================================================
-- 15_competiciones.sql
-- ==========================================================================

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


-- ==========================================================================
-- 16_estadisticas_visibles.sql
-- ==========================================================================

-- Coruña Atlantics — Los jugadores ven las estadísticas
-- Ejecutar DESPUÉS de 15_competiciones.sql.
--
-- Las mete el staff, como estaba. Lo que cambia es que ahora todo el equipo
-- puede leerlas: la gracia de llevar la cuenta de touchdowns e intercepciones
-- es que la gente vea sus números, no que se queden en la consola.
--
-- La clasificación y las competiciones ya eran visibles desde 15: son
-- información pública de la federación.

drop policy if exists estadisticas_leer on estadisticas;
create policy estadisticas_leer on estadisticas
  for select to authenticated using (es_aprobado() or es_staff());

-- Escribir sigue siendo cosa del staff: un solo criterio y datos fiables.
drop policy if exists estadisticas_staff on estadisticas;
create policy estadisticas_staff on estadisticas
  for all to authenticated using (es_staff()) with check (es_staff());


-- ==========================================================================
-- 17_permisos.sql
-- ==========================================================================

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

-- Generar los entrenos del horario es cosa de quien lleva el calendario. Se
-- quedo pidiendo es_staff(), que con el reparto de secciones ya no dice nada.
-- El cuerpo es el mismo de 05_calendario.sql; solo cambia quien puede.
create or replace function generar_entrenos(p_temporada uuid, p_hasta date)
returns int language plpgsql security definer set search_path = public as $$
declare h horarios_entreno%rowtype; d date; t temporadas%rowtype; n int := 0;
begin
  if not puede('calendario') then
    raise exception 'No llevas el calendario';
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


-- ==========================================================================
-- 18_capitanes.sql
-- ==========================================================================

-- Coruña Atlantics — Capitanes
-- Ejecutar DESPUÉS de 17_permisos.sql.
--
-- Ser capitán no es un permiso: no abre ninguna pantalla ni deja tocar nada.
-- Es galón, y por eso es una columna de la ficha y no una fila en `permisos`.
-- Quien además lleve alguna sección del club la lleva porque se la han dado,
-- no por llevar la C.
--
-- Puede haber varios, que es lo normal: uno de ataque y otro de defensa.

alter table perfiles
  add column if not exists es_capitan boolean not null default false;

comment on column perfiles.es_capitan is
  'Galon, no permiso. Sale como una C en el roster y en la plantilla.';

-- Los jugadores se ven entre ellos por esta vista, y la C es justo de las cosas
-- que se ven en el campo: tiene que estar aqui.
create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado, es_capitan
from perfiles
where estado <> 'baja';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos.';

-- ---------------------------------------------------------------------------
-- El cerrojo de la ficha, con la C dentro
--   Sin esto un jugador se pone la C solo editando su propia ficha: la politica
--   le deja escribir su fila entera. Nombrar capitan es del club, asi que va
--   con los demas campos que solo pasa quien lleva el roster.
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
    new.es_capitan  := old.es_capitan;
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

-- Quien deja el equipo deja de ser capitan: la C es del que esta.
create or replace function soltar_galon_en_baja()
returns trigger language plpgsql as $$
begin
  if new.estado = 'baja' and old.estado <> 'baja' then
    new.es_capitan := false;
  end if;
  return new;
end $$;

drop trigger if exists perfiles_soltar_galon on perfiles;
create trigger perfiles_soltar_galon before update on perfiles
  for each row execute function soltar_galon_en_baja();


-- ==========================================================================
-- 19_tienda_cierre.sql
-- ==========================================================================

-- Coruña Atlantics — Cerrar el ciclo de la tienda
-- Ejecutar DESPUÉS de 18_capitanes.sql.
--
-- El estado 'entregado' existía en el enum desde el principio y no lo ponía
-- nadie: no había ningún botón que lo pusiera. El pedido nunca se cerraba, y
-- como la app solo impide cancelar cuando está entregado, un jugador podía
-- retirar un pedido que ya había pagado.
--
-- Y lo cobrado por la tienda no llegaba a la caja. Se apuntaba quién había
-- pagado, pero ese dinero no existía para la tesorería.
--
-- Esto cierra las dos cosas: el pedido llega a entregado, y lo cobrado se pasa
-- a tesorería una sola vez.

alter table pedidos
  add column if not exists entregado_en date,
  add column if not exists movimiento_id uuid references movimientos(id) on delete set null;

comment on column pedidos.movimiento_id is
  'El apunte de tesoreria que ya se llevo este cobro. Sin el, el dinero no ha entrado en la caja; con el, no se puede meter dos veces. Si se borra el movimiento vuelve a null y se puede reapuntar.';

create index if not exists pedidos_sin_apuntar_idx
  on pedidos (producto_id) where pagado and movimiento_id is null;

-- ---------------------------------------------------------------------------
-- El pedido del jugador, con cerrojo
--   La politica le deja escribir su propia fila entera, asi que hasta ahora
--   podia marcarse como pagado el solo. Lo unico que le toca decidir es si
--   retira el pedido, y solo mientras no se lo hayan dado.
-- ---------------------------------------------------------------------------

create or replace function bloquear_campos_del_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or puede('tienda') then
    return new;
  end if;

  new.producto_id   := old.producto_id;
  new.jugador_id    := old.jugador_id;
  new.talla         := old.talla;
  new.cantidad      := old.cantidad;
  new.pagado        := old.pagado;
  new.entregado_en  := old.entregado_en;
  new.movimiento_id := old.movimiento_id;

  -- Único movimiento suyo: retirarlo, y solo si sigue pendiente.
  if not (old.estado = 'pedido' and new.estado = 'cancelado') then
    new.estado := old.estado;
  end if;

  return new;
end $$;

drop trigger if exists pedidos_bloquear_campos on pedidos;
create trigger pedidos_bloquear_campos before update on pedidos
  for each row execute function bloquear_campos_del_pedido();

-- ---------------------------------------------------------------------------
-- Pasar lo cobrado a la caja
--   Un solo apunte por producto con todo lo que se haya cobrado y no se haya
--   llevado aun. Va en una funcion y no en la app porque las dos escrituras
--   —crear el movimiento y marcar los pedidos— tienen que ser una sola: si se
--   quedasen a medias, el dinero entraria dos veces o ninguna.
-- ---------------------------------------------------------------------------

create or replace function apuntar_tienda_en_tesoreria(p_producto uuid, p_temporada uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_total numeric(10,2);
  v_nombre text;
  v_mov uuid;
begin
  if not puede('tienda') or not puede('tesoreria') then
    raise exception 'Hace falta llevar la tienda y la tesorería para apuntar el cobro';
  end if;

  select nombre into v_nombre from productos where id = p_producto;
  if not found then raise exception 'Producto no encontrado'; end if;

  select coalesce(sum(pr.precio * pe.cantidad), 0) into v_total
  from pedidos pe
  join productos pr on pr.id = pe.producto_id
  where pe.producto_id = p_producto
    and pe.estado <> 'cancelado'
    and pe.pagado
    and pe.movimiento_id is null;

  if v_total <= 0 then
    raise exception 'No hay nada cobrado pendiente de apuntar';
  end if;

  insert into movimientos (temporada_id, tipo, concepto, categoria, importe, metodo, registrado_por)
  values (p_temporada, 'ingreso', 'Tienda — ' || v_nombre, 'merchandising', v_total, 'bizum', mi_perfil_id())
  returning id into v_mov;

  update pedidos
  set movimiento_id = v_mov
  where producto_id = p_producto
    and estado <> 'cancelado'
    and pagado
    and movimiento_id is null;

  return v_mov;
end $$;

comment on function apuntar_tienda_en_tesoreria is
  'Mete en la caja lo cobrado de un producto que aun no se habia apuntado, y lo marca para no repetirlo.';

revoke execute on function apuntar_tienda_en_tesoreria(uuid, uuid) from anon;
grant execute on function apuntar_tienda_en_tesoreria(uuid, uuid) to authenticated;


-- ==========================================================================
-- 20_cobro_directo.sql
-- ==========================================================================

-- Coruña Atlantics — Cobrar es apuntar
-- Ejecutar DESPUÉS de 19_tienda_cierre.sql.
--
-- El paso de "pasar lo cobrado a la caja" sobraba: marcar que alguien te ha
-- pagado y apuntar ese dinero son el mismo hecho, y separarlos solo servía para
-- que se olvidase el segundo. Ahora el botón Cobrar hace las dos cosas.
--
-- Con un matiz: quien lleva la tienda pero no la tesorería puede seguir
-- marcando quién le ha pagado, pero ese apunte no lo hace él. Se queda
-- pendiente y lo mete en la caja quien lleva las cuentas, con el botón que ya
-- existe. Marcar un cobro es de la tienda; escribir en la caja, de la
-- tesorería, y esa frontera no se cruza por comodidad.

create or replace function cobrar_pedido(p_pedido uuid, p_pagado boolean, p_temporada uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pedido    pedidos%rowtype;
  v_producto  productos%rowtype;
  v_quien     text;
  v_mov       uuid;
begin
  if not puede('tienda') then
    raise exception 'No llevas la tienda';
  end if;

  select * into v_pedido from pedidos where id = p_pedido;
  if not found then raise exception 'Pedido no encontrado'; end if;

  select * into v_producto from productos where id = v_pedido.producto_id;

  -- Deshacer un cobro que ya esta en la caja es tocar la caja.
  if not p_pagado and v_pedido.movimiento_id is not null then
    if not puede('tesoreria') then
      raise exception 'Ese cobro ya está en la caja: solo puede deshacerlo quien lleve la tesorería';
    end if;
    delete from movimientos where id = v_pedido.movimiento_id;
    update pedidos set pagado = false, movimiento_id = null where id = p_pedido;
    return null;
  end if;

  if not p_pagado then
    update pedidos set pagado = false where id = p_pedido;
    return null;
  end if;

  -- Ya estaba cobrado y apuntado: no se duplica.
  if v_pedido.pagado and v_pedido.movimiento_id is not null then
    return v_pedido.movimiento_id;
  end if;

  -- Sin la llave de la tesoreria se marca el cobro y ahi se queda, esperando a
  -- quien lleve las cuentas.
  if not puede('tesoreria') then
    update pedidos set pagado = true where id = p_pedido;
    return null;
  end if;

  select trim(nombre || ' ' || coalesce(apellidos, '')) into v_quien
  from perfiles where id = v_pedido.jugador_id;

  insert into movimientos (temporada_id, tipo, concepto, categoria, importe, metodo, registrado_por)
  values (p_temporada, 'ingreso',
          'Tienda — ' || v_producto.nombre || coalesce(' · ' || v_quien, ''),
          'merchandising',
          v_producto.precio * v_pedido.cantidad,
          'bizum', mi_perfil_id())
  returning id into v_mov;

  update pedidos set pagado = true, movimiento_id = v_mov where id = p_pedido;
  return v_mov;
end $$;

comment on function cobrar_pedido is
  'Marca un pedido como cobrado y mete ese dinero en la caja de una vez. Al desmarcarlo, retira el apunte.';

revoke execute on function cobrar_pedido(uuid, boolean, uuid) from anon;
grant execute on function cobrar_pedido(uuid, boolean, uuid) to authenticated;


-- ==========================================================================
-- 21_companeros_aprobados.sql
-- ==========================================================================

-- Coruña Atlantics — La plantilla son los aprobados
-- Ejecutar DESPUÉS de 20_cobro_directo.sql.
--
-- La vista `companeros` es por donde los jugadores se ven entre ellos, y
-- filtraba solo las bajas. Eso dejaba dentro a quien acaba de registrarse y
-- todavia no has aprobado: en el roster del club no aparecia —ese si filtra por
-- acceso— pero en la pantalla del jugador si.
--
-- Ademas de enseñar de mas, enseñaba mal: alguien que ha entrado con su correo
-- y no ha llegado a rellenar la ficha sale como una camiseta sin dorsal y con
-- el trozo de delante de su email por nombre.
--
-- La plantilla es la gente aprobada. Punto.

create or replace view companeros
with (security_invoker = off) as
select id, nombre, apellidos, apodo, dorsal, posiciones, estado, es_capitan
from perfiles
where estado <> 'baja'
  and acceso = 'aprobado';

alter view companeros owner to postgres;
revoke all on companeros from anon, authenticated;
grant select on companeros to authenticated;

comment on view companeros is
  'Vista deliberadamente sin datos sensibles: la usan los jugadores para verse entre ellos. Solo gente aprobada y de alta.';


-- ==========================================================================
-- 22_push.sql
-- ==========================================================================

-- Coruña Atlantics — Avisar al móvil
-- Ejecutar DESPUÉS de 21_companeros_aprobados.sql.
--
-- Un aviso que hay que abrir la app para ver no es un aviso: si se cancela el
-- entreno a las siete, la gente tiene que enterarse sin hacer nada.
--
-- Cada móvil que acepta notificaciones deja aquí su dirección de entrega. No es
-- una por persona: alguien con móvil y tablet deja dos, y hay que mandarlo a
-- las dos. Por eso lo unico unico es el endpoint.
--
-- Estas filas no las lee nadie desde la app. Las usa la función `enviar-push`
-- por dentro, con permisos de servidor. Cada uno solo puede tocar las suyas: si
-- un jugador pudiera leer las de los demas tendria la lista de dispositivos del
-- equipo, que no es asunto suyo.

create table if not exists suscripciones_push (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references perfiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  agente     text,
  creado_en  timestamptz not null default now()
);

create index if not exists suscripciones_push_perfil_idx on suscripciones_push (perfil_id);

comment on table suscripciones_push is
  'A donde entregar una notificacion. Una fila por dispositivo, no por persona.';

alter table suscripciones_push enable row level security;

drop policy if exists suscripciones_propias on suscripciones_push;
create policy suscripciones_propias on suscripciones_push
  for all to authenticated
  using (perfil_id = mi_perfil_id())
  with check (perfil_id = mi_perfil_id());

-- Cuántos móviles hay escuchando. Lo enseña la consola para saber si merece la
-- pena mandar algo o si media plantilla no lo ha activado todavia.
create or replace function moviles_con_avisos()
returns int language sql stable security definer set search_path = public as $$
  select case when es_staff()
    then (select count(distinct perfil_id)::int from suscripciones_push)
    else 0 end;
$$;

grant execute on function moviles_con_avisos() to authenticated;

