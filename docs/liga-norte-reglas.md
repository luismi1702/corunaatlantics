# Liga Norte Flag Senior Mixta 26-27: clasificación y playoffs

Sacado el 21/11/2026 de los correos de competiciones@fefapa.es (Gmail del club, etiqueta
Competiciones/FEFAPA): reglamento de competiciones de Flag-Football FEFAPA 26-27 (25 págs., venía
por error como "Convocatoria Liga Norte Senior Mixta" en el correo del 6 oct 18:01; también en
https://www.fefapa.es/descargas/), la convocatoria buena (correo del 6 oct 18:30, 7 págs.) y el
PDF del calendario (22 oct).

## Clasificación (reglamento, capítulo quinto)

- **Art. 32, puntuación:** cuenta el **número de victorias**. Si no todos han jugado los mismos
  partidos, el **porcentaje de victorias** sobre partidos jugados. No hay puntos por victoria.
- **Art. 35, no hay empates:** si acaba empatado se juegan prórrogas hasta que gane alguien. Al
  ganador se le suma **un solo punto** al marcador del tiempo reglamentario, marque lo que marque
  en la prórroga.
- **Art. 33, incomparecencia:** derrota, 2-0 oficial y victoria para el rival. Ese partido no
  cuenta como jugado para los porcentajes de puntos del que ganó así. La segunda incomparecencia
  supone la expulsión de la competición y perder la fianza.
- **Art. 34, desempate** (el que tenga una incomparecencia va el último):
  1. Enfrentamiento directo entre los empatados: a) más victorias entre ellos; b) mejor diferencia
     de puntos entre ellos; c) menos puntos recibidos entre ellos.
  2. Menor porcentaje de puntos recibidos en toda la competición (por partido jugado).
  3. Mayor porcentaje de diferencia de puntos en toda la competición.
  4. Menor porcentaje de jugadores expulsados.
  5. Sorteo en la sede de la federación.

## Playoffs

- **Formato: sin concretar.** La convocatoria (punto 2) dice que se busca asegurar 5 partidos por
  equipo "además de uno o dos partidos de play-off para los mejor clasificados", y que el formato
  se elige según los inscritos. Con 10 equipos el calendario da 9 partidos por equipo y deja hueco
  para **semifinales y final** (uno o dos partidos de playoff = semis y final). No dice cuántos
  pasan ni los cruces.
- **Fechas (calendario):** semifinales el **24-25 abr** (en el PDF también hay unas SEMIS el
  8-9 may, una de las dos es de las categorías base) y **finales el 22-23 may 2027**. La competición
  tiene que acabar antes de que termine mayo de 2027.
- **Sede de la final (convocatoria 3.1):** puede pedirla cualquier club, con propuesta antes de la
  jornada de mitad de la fase regular. Si nadie la pide, la organiza FEFAPA.
- **Roster en playoffs (convocatoria art. 9, corregido el 8 oct):** el mismo que en la última
  jornada de la fase regular. No se pueden añadir jugadores, técnicos ni staff. En fase regular se
  pueden añadir hasta el martes antes del partido a las 23:59.
- El mejor equipo **asturiano** va a la Spanish Flag Bowl de la FEFA (no nos afecta).

## En la app (desde el 21/11/2026)

La clasificación la calcula `app/js/clasificacion.js` con estas reglas (la usan la consola, la app
del jugador y la demo):
- Orden por porcentaje de victorias (columna %). Los que aún no han jugado van al final.
- Desempate: el que tiene una incomparecencia, último; luego enfrentamiento directo (victorias,
  diferencia y puntos recibidos entre los empatados); luego puntos recibidos por partido y
  diferencia por partido. Si siguen iguales salen con `*` (sorteo de FEFAPA). El criterio de
  expulsados no se aplica: la app no los lleva de los demás equipos.
- Al apuntar un partido no deja guardar un empate (al ganador de la prórroga se le suma 1).
- Campo "No se presentó" en el partido: pone el 2-0 solo y aplica el art. 33. Necesita
  `app/db/34_fefapa.sql`, que además borra la vista `clasificacion` antigua (3 pts/victoria).
- Ya no se piden "puntos por victoria / por empate" al crear la competición.
