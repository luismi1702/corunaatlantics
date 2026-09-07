-- Coruña Atlantics — Las sesiones de vídeo son otra cosa
-- Ejecutar DESPUÉS de 26_companeros_cerrado.sql.
--
-- El calendario tenía tres clases de cita: entreno, partido y un 'evento'
-- comodín. Ver vídeo del rival no es entrenar —no cuenta igual para la
-- asistencia, no se va al campo y no hace falta equipación— y meterlo en el
-- comodín lo dejaba sin nombre en la app.
--
-- El partido de liga no necesita valor nuevo: un amistoso y uno de competición
-- son los dos 'partido' y ya se distinguen por tener competicion_id o no.
-- Añadir 'liga' aquí sería guardar dos veces el mismo hecho, y el día que se
-- contradijeran no habría forma de saber cuál manda.

alter type tipo_evento add value if not exists 'video';
