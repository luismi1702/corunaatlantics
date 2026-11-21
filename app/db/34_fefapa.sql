-- Coruña Atlantics — Clasificación con el reglamento de FEFAPA
-- Ejecutar DESPUÉS de 33_tallas_pedido.sql.
--
-- La clasificación ya no la calcula la base de datos: la app la saca de los
-- partidos con las reglas de FEFAPA (js/clasificacion.js; resumen en
-- docs/liga-norte-reglas.md). Lo que hace falta aquí es apuntar las
-- incomparecencias, que cuentan distinto que un 2-0 jugado: al que ganó así no
-- se le cuenta el partido para los porcentajes de puntos, y el que no fue queda
-- el último en los desempates.

alter table partidos_competicion
  add column if not exists no_presentado uuid references equipos_competicion(id) on delete set null;

comment on column partidos_competicion.no_presentado is
  'Equipo que no se presentó (art. 33 del reglamento de FEFAPA). El marcador oficial es 2-0.';

-- La vista de 15_competiciones.sql daba 3 puntos por victoria y 1 por empate,
-- que no es como cuenta FEFAPA. Nadie la lee ya.
drop view if exists clasificacion;

-- Comprobación: debe salir una fila con no_presentado.
select column_name from information_schema.columns
where table_name = 'partidos_competicion' and column_name = 'no_presentado';
