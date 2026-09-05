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
