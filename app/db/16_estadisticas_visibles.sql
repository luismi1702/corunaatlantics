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
