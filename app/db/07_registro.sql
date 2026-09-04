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
  if not es_admin() then
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
