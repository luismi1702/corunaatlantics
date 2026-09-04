-- Coruña Atlantics — Arranque
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls.sql, una sola vez.
--
-- El primer administrador hay que nombrarlo desde aquí: si la app pudiera
-- crear admins, cualquiera que se registrase podría hacerse uno.

-- 1) Temporada en curso. Ajusta fechas e importe cuando los sepas: el importe
--    se cambia después desde la app, sin volver a tocar SQL.
insert into temporadas (nombre, fecha_inicio, fecha_fin, activa, importe_cuota, permite_plazos)
values ('2026-27', '2026-09-01', '2027-06-30', true, 0, true)
on conflict (nombre) do nothing;

-- 2) Nómbrate administrador.
--    Entra ANTES una vez en la app con tu email para que exista la cuenta,
--    y luego ejecuta esto cambiando el email por el tuyo.
update perfiles
set    rol = 'admin'
where  lower(email) = lower('CAMBIA_ESTO@ejemplo.com');

-- Comprobación: debe devolver tu fila con rol = admin.
select id, nombre, email, rol from perfiles where rol = 'admin';
