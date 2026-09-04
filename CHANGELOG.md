# Changelog — Coruña Atlantics Web

## [2026-09-04] — App del equipo: plan y consola de gestión (fase 1A)

**Qué se hizo:**
- Decidido el alcance de la app tras concretar público (plantilla y staff), dolores a resolver y disposición a mantenerla; documentado en `docs/app-plan.md`
- Elegido el stack: PWA vanilla en `corunaatlantics.com/app/` + Supabase free, coste 0 € y sin tiendas de apps
- Reordenadas las fases al pedir el usuario una consola de gestión propia: la fase 1A pasa a ser el panel de admin, porque aporta valor aunque ningún jugador instale la app
- Escrito el esquema de base de datos (`app/db/01_schema.sql`): temporadas, perfiles, cuotas, pagos, documentación con caducidades y tutores legales previstos para categoría base
- Escritas las políticas RLS (`app/db/02_rls.sql`): los datos económicos solo los ve el rol admin, impuesto por Postgres y no por la interfaz
- Construida la consola: panel diario, roster con control de dorsales, cuotas con pagos fraccionados y exentos, documentación con semáforo y exportación a CSV
- Añadido `app/demo.html` con 18 jugadores inventados, para ver la app sin crear cuenta en Supabase
- Generados los iconos de la PWA a partir del logo circular
- Añadida la tesorería completa (`app/db/04_tesoreria.sql` + `app/js/vistas/tesoreria.js`): saldo de temporada, ingresos separados entre cuotas y otros, desglose de gastos por categoría y exportación a CSV
- Evitado el doble conteo del dinero: `movimientos` excluye las cuotas por restricción de la base de datos, y el resumen las suma desde `pagos`
- Rediseñada la entrada de la app: la primera pantalla pasa a ser un menú de baldosas sin cifras de dinero, con chinchetas que solo indican cuántas cosas hay pendientes; el panel de cifras queda como "Resumen"
- Incorporados los logos del club a la interfaz: el **logotipo principal** (`avatar Sin fondo.png`) preside el menú y el login, y el tridente queda como filigrana tenue del resto de pantallas (`app/img/`, versiones sin fondo y en WebP)
- Dado carácter visual a la app: fondo con líneas de yardas al 3,5 % y resplandor de focos, oro para las áreas de dinero y teal para las de personas, filo de luz en las tarjetas para separarlas de las filas de lista, indicador de pestaña activa, rótulos con marca dorada, cifras con `tabular-nums` y entrada escalonada respetando `prefers-reduced-motion`
- Movidos los Ajustes de la barra inferior al engranaje de la cabecera, para que cinco pestañas sigan siendo cómodas en un móvil estrecho

- Añadido el calendario (`app/db/05_calendario.sql`): horario semanal que genera los entrenos, más sesiones sueltas y partidos con rival
- Añadido "pasar lista" para el staff: un toque en la fila cicla presente / falta / justificado y guarda al momento, con pintado optimista para que vaya al ritmo del dedo
- Añadida la pantalla de disponibilidad, que cruza lesiones, licencia, seguro y reconocimiento médico y agrupa en puede jugar / con pegas / no puede; el dinero queda deliberadamente fuera
- Añadido contacto de un toque en la ficha (llamar y WhatsApp), contacto de emergencia destacado y porcentaje de asistencia por jugador
- Añadido el recordatorio de cuota individual por WhatsApp, con el mensaje escrito y el envío en manos del usuario

- Añadida la app del jugador (`app/db/06_jugador.sql` + vistas `jug-*`): Hoy con confirmación de asistencia y recuento de confirmados, Agenda, Equipo y Mi ficha con su papeleo y su cuota
- Separadas `confirmacion` (la escribe el jugador) y `estado` (la escribe el staff pasando lista), con un disparador que impide a un jugador marcarse presente
- Añadida la vista `companeros`, que expone solo nombre, dorsal y posición
- El armazón monta un mapa de pantallas distinto según el rol; eliminada la pantalla de "sin permisos", que ya no tiene sentido
- Añadido a la vista previa un interruptor para alternar entre staff y jugador

- Personalizada la app del jugador: su dorsal en hueco ocupando el fondo de sus pantallas, chapa con dorsal, posiciones y unidad, y aviso cuando la sesión no es de su unidad
- Centralizadas en `ui.js` las listas de posiciones por unidad, que estaban repetidas en tres vistas

- Añadido el bloqueo biométrico opcional (`app/js/cerrojo.js`): Face ID, huella o código del dispositivo para abrir la app, vía WebAuthn y por dispositivo, con salida de emergencia por correo
- Descartado el reconocimiento facial para pasar lista: dato biométrico de categoría especial, desproporcionado frente a tocar un nombre en una lista, y con categoría base a la vista

- Añadido el registro de jugadores con aprobación (`app/db/07_registro.sql`): pantalla de entrada con dos caminos, formulario de ficha completa, estado pendiente y pantalla de solicitudes para aprobar o rechazar
- Cerrado el agujero de que cualquiera con el enlace se convirtiera en jugador con acceso: el estado de acceso va en columna aparte del deportivo y las políticas de calendario, temporadas y compañeros exigen estar aprobado
- Las altas hechas por el club desde Roster entran aprobadas sin pasar por solicitud

- Validado todo el SQL con el parser real de PostgreSQL (libpg_query): 152 sentencias sin errores de sintaxis
- Corregido que el disparador que impide a un jugador tocar campos del club se aplicara también a los disparadores del sistema, lo que revertía el enlace de una ficha con su cuenta recién creada
- Corregido que una solicitud sin aprobar recibiera ya cuota y ficha de documentación, y apareciera en el roster como si fuera plantilla
- Añadido `app/db/00_instalar.sql`, generado, para montar la base de datos de una sola pegada

- Añadido que el jugador elija su dorsal (`app/db/08_dorsales.sql`): rejilla de 0 a 99 en Mi ficha con los ocupados marcados, solo para aprobados, y el bloqueo garantizado por el índice único

- Separado "quitar el acceso" de "dar de baja" y de "borrar": quitar el acceso impide entrar en la app sin tocar el histórico, y es reversible con un toque
- Sustituido el error técnico de "tu cuenta no tiene ficha asociada" por una pantalla que explica qué ha pasado y a quién dirigirse
- Documentado en el README el borrado completo para una petición de RGPD: la ficha desde la app y la cuenta desde el panel de Supabase

- Añadido el tablón de avisos (`app/db/09_avisos.sql`): publicación desde el staff, dirigible a una unidad, urgentes fijados arriba, y registro de quién lo ha leído con la lista de quién no
- Añadido el inventario de material (`app/db/10_material.sql`): piezas por tipo, entregas y devoluciones con estado y fianza, y aviso de lo que está en manos de gente que causó baja
- Añadido un QR del enlace de la app en Solicitudes, para repartirla en un entreno de una vez
- La pantalla Hoy del jugador abre con una franja de avisos sin leer, por encima del próximo entreno

- Añadido `aplicar_importe_cuota` (`app/db/11_importe_cuota.sql`): permite fijar el precio de la cuota después de que la gente ya se haya registrado, poniendo al día las cuotas que quedaron a cero sin tocar las que tienen pagos, importe propio o exención

- Cambiado el icono de la app al Poseidón: es el que mejor aguanta el tamaño de un icono y hace que la pantalla de inicio y la portada de la app hablen el mismo idioma

- Simplificada la puesta en marcha (`app/db/12_arranque_automatico.sql`): el instalador crea ya una temporada y la primera cuenta que entra en la app se convierte en administradora, así que sobra el paso manual de nombrarse admin desde el editor SQL

- Revisión exhaustiva del proyecto. Corregido que `hoyISO()` calculara la fecha en UTC: en España, entre medianoche y las dos, el entreno del propio día se contaba como pasado y desaparecía de "próximos"
- Cerradas dos funciones que quedaban expuestas como llamada remota sin comprobar quién llamaba (`app/db/13_permisos_funciones.sql`)
- Endurecidos otros dos sitios donde el ancho podía apretar: las tiras de la pantalla del jugador y las etiquetas de la barra de pestañas en pantallas estrechas
- Quitadas cuatro importaciones sin usar

**Archivos nuevos:**
- `app/` completo (HTML, CSS, JS, SQL, iconos, README)
- `docs/app-plan.md`

**Archivos modificados:**
- `docs/decisiones.md`, `CHANGELOG.md`

**Pendiente:**
- Crear el proyecto de Supabase y rellenar `app/js/config.js` (pasos en `app/README.md`)
- Fijar el importe de la cuota de la temporada
- Fase 1B: asistencia a entrenos y tablón de avisos

## [2026-09-01] — Web caída: certificado SSL de GitHub Pages

**Qué se hizo:**
- Diagnosticado el fallo de `corunaatlantics.com`: no estaba caída, GitHub Pages servía su certificado genérico `*.github.io` en vez de uno para el dominio, y Chrome lo bloqueaba con `ERR_CERT_COMMON_NAME_INVALID`
- Verificado que el DNS estaba correcto (A records a las 4 IPs de GitHub y `www` como CNAME a `luismi1702.github.io`): el fallo era solo del certificado
- Reprovisionado el certificado vía API de GitHub quitando y volviendo a asignar el custom domain; Let's Encrypt lo emitió en menos de un minuto
- Activado **Enforce HTTPS**, que estaba desactivado
- Verificado el resultado: certificado `CN=corunaatlantics.com` con SAN para `www`, válido hasta el 30-nov-2026, HTTP 200 en el dominio raíz y redirección 301 desde `http://` y desde `www`
- Causa probable: el certificado anterior era del 2 de agosto y falló la renovación automática de GitHub (~60 días)

**Archivos modificados:**
- Ninguno del repo; los cambios fueron en la configuración de GitHub Pages
- `CHANGELOG.md`, `docs/decisiones.md`, `CLAUDE.md`

**Pendiente:**
- Revisar el estado del certificado a finales de noviembre de 2026, antes de que expire el actual

## [2026-08-27] — Reel de entrenamiento y contacto con ESN

**Qué se hizo:**
- Montado pack de producción de vídeo en `videos/assets/`: endcard animado 3s, endcard estático (sirve de portada), 6 logos recortados al contenido y fuentes Anton + Barlow descargadas de Google Fonts
- Generados 5 overlays de texto en PNG transparente con Anton, para poder editar en móvil sin instalar fuentes
- Escrito `videos/GUION_REEL_HYPE.md`: timeline de 24s escena a escena, pasos de CapCut (PC y móvil), copy de Instagram y hashtags
- Reel de entrenamiento montado y publicado en Instagram por el usuario
- Redactado `docs/contacto-esn-coruna.md`: correo a ESN A Coruña en español e inglés, versión DM y mensajes de seguimiento
- Enviado DM a ESN A Coruña el 27/08 (registrado en el documento); correo pendiente de envío
- Reenfocado el mensaje a ESN por indicación del usuario: sin mencionar la refundación y sin hablar de gratuidad

**Archivos modificados:**
- `videos/GUION_REEL_HYPE.md` (nuevo)
- `videos/assets/` (nuevo: endcard, logos, fuentes, textos)
- `docs/contacto-esn-coruna.md` (nuevo)
- `docs/decisiones.md` (nuevo)
- `CLAUDE.md`

**Pendiente:**
- Archivar el Reel exportado en `videos/output/` como `2026-08-27_entreno-hype_reel.mp4`
- Rellenar días, hora y lugar de entreno en los textos de `docs/contacto-esn-coruna.md`
- Enviar el correo a ESN y valorar enviarlo también a la ORI de la UDC y residencias
- Si ESN no responde, recordatorio el 3 de septiembre
- Publicar el mismo vídeo en TikTok con uno o dos días de diferencia

## [2026-05-21] — Fuentes, móvil y ajustes visuales

**Qué se hizo:**
- Probadas y descartadas Russo One y Bebas Neue para el hero title; se quedó Bebas Neue
- Aumentado tamaño del título hero en desktop y móvil
- Arreglados efectos de lluvia/relámpago: movidos de `position:fixed` a `position:absolute` dentro del hero para que no sangren por debajo del footer
- Corregido layout móvil completo: mascota, botones, grids de secciones, gaps y paddings
- Corregido desbordamiento horizontal en móvil (`overflow-x: hidden` en `html` + `body`, `max-width: none` → `100%` en móvil)
- Eliminado `mix-blend-mode: multiply` de la mascota del hero (oscurecía la imagen)
- Restaurado tamaño correcto de la mascota en desktop (`max-width: none`)
- Mascota del hero movida un poco más a la izquierda (`translateX -80px`)

**Archivos modificados:**
- `index.html`

**Pendiente:**
- Ninguno (web considerada completa por el usuario)
