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
