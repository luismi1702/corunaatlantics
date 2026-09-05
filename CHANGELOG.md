# Changelog — Coruña Atlantics Web

## [2026-09-05] — Repaso: la web, el jugador y los documentos

**Qué se hizo:**
- El **roster de la web** sale de la plantilla real (`24_plantilla_publica.sql`): dorsal, nombre de camiseta y posición, lo mismo que se ve en la espalda en un partido. Nada de contacto ni de cuotas, y sólo gente aprobada y de alta
- **Documentos** se queda en licencia, DNI y foto: el club no pide seguro ni reconocimiento médico (`25_sin_seguro_ni_reconocimiento.sql`). Con ellos, "¿quién puede jugar?" habría dicho que nadie, para siempre
- El **dorsal del jugador** pasa a ser el fondo de su app: centrado, a lo ancho de la pantalla. Ajustado al ancho y no al alto, porque forzarlo a llenar el alto lo recorta por los lados y deja de leerse
- En la barra de arriba del jugador, la **cabeza de Poseidón** en vez del logotipo entero
- El **cerrojo** deja de decir "esta app está bloqueada" y "desbloquear": la sesión sigue abierta y sólo hace falta confirmar quién eres
- Arreglada la **banda blanca** de iOS en las pantallas cortas: el fondo va también en `html`
- "Aplicar el importe a la plantilla" se muda de Ajustes a **Tesorería → Cuotas**, y sólo aparece cuando hay cuotas sin abrir
- La lista de temporadas sólo se enseña cuando hay más de una

## [2026-09-05] — Avisos al móvil

**Qué se hizo:**
- Notificaciones push funcionando: se publica un aviso y suena en el móvil de todo el que las tenga activadas, con la app cerrada
- Cada uno las activa desde **Mi ficha → Avisos en el móvil** (el staff, desde Ajustes). El permiso se pide con un toque suyo y nunca al abrir la app: el "no" de un navegador es para siempre
- En iPhone hace falta tener la app instalada en la pantalla de inicio; si no lo está, el botón lo explica con lo que hay que hacer en vez de dejarlo en "no se puede"
- El cifrado del contenido está escrito a mano con WebCrypto y **comprobado contra el vector de prueba del RFC 8291**, en vez de arrastrar una dependencia
- La función no usa la clave de servidor del proyecto: la base de datos expone dos operaciones (`suscripciones_para_enviar`, `borrar_suscripciones`) que sólo responden a quien lleva los avisos
- Las suscripciones muertas se borran solas al recibir un 404 o un 410
- Sólo suenan los avisos nuevos: corregir uno ya publicado no vuelve a molestar a nadie
- La función responde a una petición GET con su versión y el estado de sus secretos, para poder diagnosticarla desde fuera sin acceso al panel

**Lo que costó, para que no se repita:**
Tres fallos encadenados, todos de diagnóstico y no de diseño. "Cero enviados" se contaba
igual que "nadie apuntado", así que el mensaje mandaba a buscar donde no era. La propia
comprobación de vida traía dos variables con el mismo nombre y tumbaba la función entera.
Y el fallo real era **un salto de línea al final de la clave privada**, pegado sin querer
desde el fichero: `invalid b64 coordinate`, un error que no apunta ni de lejos a un
carácter invisible. Ahora los secretos se limpian antes de usarse.

**Pendiente en Supabase:** ejecutar `13` a `23` en orden (hecho), y guardar `vapid.txt`
fuera del ordenador: si se pierde la clave privada, todos los móviles tienen que volver a
activar los avisos.

## [2026-09-05] — La tienda, de punta a punta

**Qué se hizo:**
- El pedido llega hasta el final: **Pedido → Cobrado → Entregado**. Cada línea tiene ahora dos botones, y lo entregado sale de la lista de trabajo a un apartado propio (con la fecha y un "Deshacer" por si te confundes)
- La chincheta de Tienda deja de apagarse al cobrar: **cuenta lo que sigue abierto hasta que se entrega**, que es cuando ya no queda nada por hacer
- **Cobrar es apuntar:** marcar un pedido como pagado crea el ingreso en la caja al momento, con el producto y el nombre en el concepto (`cobrar_pedido()`, `app/db/20_cobro_directo.sql`). Desmarcarlo retira el apunte
- Quien lleva la tienda pero no la tesorería puede marcar el cobro, pero no escribe en la caja: queda pendiente y lo apunta luego quien lleve las cuentas. Marcar un cobro es de la tienda; escribir en la caja, de la tesorería
- Botón **"Apuntar en tesorería"** por producto, ahora como escoba de lo que quedó suelto: crea un ingreso en la caja como *merchandising* con todo lo cobrado que aún no había entrado, y marca esos pedidos para que no se cuenten dos veces. Va en la función `apuntar_tienda_en_tesoreria()` porque crear el apunte y marcar los pedidos tienen que pasar juntos o no pasar
- Si borras ese movimiento en Tesorería, los pedidos vuelven a estar sin apuntar y se pueden reapuntar
- **Agujero cerrado:** la política dejaba al jugador editar su propia fila de pedido entera, así que podía marcarse como pagado él solo. El nuevo disparador `bloquear_campos_del_pedido()` le deja una única cosa: retirar el pedido, y sólo mientras siga pendiente
- Un producto ya entregado se puede volver a pedir; antes el primer pedido bloqueaba el producto para siempre

**Por qué:**
El estado `entregado` existía en el enum desde el principio y no lo ponía nadie. El pedido
no se cerraba nunca, y como la app sólo impedía cancelar cuando estaba entregado, un jugador
podía retirar algo que ya había pagado. Y lo cobrado por la tienda no llegaba a la caja: se
sabía quién había pagado, pero ese dinero no existía para la tesorería.

**Pendiente en Supabase:** ejecutar `13`, `15`, `16`, `17`, `18`, `19` y `20`, en ese orden.

## [2026-09-05] — Capitanes

**Qué se hizo:**
- Se puede nombrar capitán a cualquiera desde su ficha del roster, y sale con una **C** dorada en la esquina del dorsal: en el roster del staff y en la plantilla que ven los jugadores
- Pueden ser varios, que es lo normal (uno de ataque, otro de defensa)
- Nueva columna `perfiles.es_capitan` y la C añadida a la vista `companeros` (`app/db/18_capitanes.sql`)
- Nombrar capitán es del club: el disparador `bloquear_campos_de_club()` impide que un jugador se ponga la C editando su propia ficha
- Quien pasa a baja suelta el galón automáticamente

**Por qué:**
Ser capitán no es un permiso: no abre ninguna pantalla ni deja tocar nada. Por eso es una
columna de la ficha y no una fila en `permisos` — quien además lleve la tesorería la lleva
porque se la han dado, no por llevar la C.

**Pendiente en Supabase:** ejecutar `13`, `15`, `16`, `17` y `18`, en ese orden.

## [2026-09-05] — Cada seccion, en manos de quien la lleva

**Qué se hizo:**
- Los permisos dejan de ser un rango y pasan a ser una lista: se elige a cualquiera de la plantilla y se le dan, una a una, las secciones que lleva (Tesorería, Roster, Documentos, Calendario, Avisos, Liga, Material, Tienda)
- Se reparten desde su propia ficha en el Roster, con un toque por sección. Repartir llaves es solo del admin
- Quien recibe una sección **no cambia de app**: sigue en la del jugador y las secciones le aparecen en su pantalla principal (Hoy), en un bloque "Del club" justo debajo del próximo entreno. Son las mismas pantallas que ve el admin
- Nueva tabla `permisos` y función `puede(seccion)` (`app/db/17_permisos.sql`): todas las políticas RLS pasan de `es_staff()` / `es_admin()` a la llave que les corresponde
- El disparador `bloquear_campos_de_club()` deja pasar a quien lleva el roster, pero el **rol sigue siendo solo del admin**: un delegado no puede ascender a nadie, ni a sí mismo
- `resolver_solicitud()` pasa a pedir la llave del roster; `aplicar_importe_cuota()`, la de tesorería
- La consola completa queda para el rol `admin`. El rol `staff`, que nunca se usó, ya no da acceso por sí solo: ahora se dan secciones
- Apagada la marca de agua del dorsal cuando un jugador está dentro de una sección del club: ahí no es su ficha, y estorbaba para leer cifras

**Por qué:**
En un club la responsabilidad no viene en bloque: uno lleva el material, otra la
tesorería, otro pone los avisos, y ninguno necesita lo demás. Con dos roles había que
elegir entre no delegar nada o dar las llaves enteras. Ahora se da exactamente lo que
alguien lleva, y quien lo impone es Postgres: un delegado del material que se ponga a
hacer peticiones a mano no saca ni una cuota.

**Pendiente en Supabase:** ejecutar `13_permisos_funciones.sql`, `15_competiciones.sql`, `16_estadisticas_visibles.sql` y `17_permisos.sql`, en ese orden.

## [2026-09-05] — Liga: la clasificación se calcula sola

**Qué se hizo:**
- Rehecha la sección de Liga alrededor de dos ideas: primero los equipos que juegan la competición, después los partidos
- La clasificación deja de teclearse. Se calcula desde los resultados (`clasificacion` pasa de tabla a vista): jugados, ganados, empatados, perdidos, puntos a favor y en contra, diferencia y puntos
- Se apuntan **todos** los partidos de la liga, no solo los nuestros: sin los de los demás entre ellos la tabla no puede salir
- Puntos por victoria y por empate configurables por competición, porque no todas las federaciones puntúan igual
- Nuestros partidos ya no se escriben dos veces: al apuntar uno en el que jugamos, se crea solo en el calendario con rival, campo y local/visitante, y desde ahí siguen funcionando pasar lista y las estadísticas por jugador
- El marcador se sincroniza en los dos sentidos: se toque en la liga o en la pantalla del partido, la tabla se entera
- Las estadísticas se apuntan donde se apunta el resultado: al guardar un partido nuestro con marcador, se abre directamente la lista de jugadores; y queda un botón en el partido para volver a ellas. Extraídas a `app/js/vistas/stats-partido.js`, compartidas con la pantalla del partido
- Añadido "Pases interceptados" en las estadísticas de ataque, la INT del que lanza (se llama distinto que la de defensa para que en la misma lista se sepa cuál es cuál). Sin migración: la tabla de estadísticas guarda una fila por concepto, así que añadir uno es editar una lista
- Nueva tabla `equipos_competicion` y `partidos_competicion` (`app/db/15_competiciones.sql`, reescrito); retirada la vista `balance_competicion`, que ahora es la fila de la tabla

**Por qué:**
Una clasificación escrita a mano envejece: se copia de la federación una vez y a la
tercera jornada ya contradice a los resultados que la propia app tiene apuntados. Metiendo
los partidos —que es lo que uno mira igualmente— la tabla no puede estar mal.

**Pendiente en Supabase:** ejecutar `13_permisos_funciones.sql`, `15_competiciones.sql` y `16_estadisticas_visibles.sql`.

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

- Añadida la equipacion del club (`app/db/14_tienda.sql`): productos con foto, descripcion, precio y tallas; el jugador pide su talla desde la app y el staff ve cuantas encargar de cada una y quien ha pagado
- Las fotos se suben al almacenamiento propio de Supabase, en un bucket publico donde solo el staff puede escribir
- Comparada la app con Clupik: su plan gratuito corta en 50 deportistas y deja entrenamientos y asistencia en el plan de 39 euros al mes

- Añadidas competiciones, clasificación y estadísticas (`app/db/15_competiciones.sql`): la tabla de la liga se teclea porque la app solo conoce nuestros partidos, y el balance propio sí lo calcula
- Las estadísticas van en filas y no en columnas, así que añadir un concepto nuevo es una línea en `ui.js` y no una migración
- Catálogo pensado para flag y para lo llamativo: TD, pases de TD, recepciones, conversiones, intercepciones, banderas, sacks y TD defensivos
- El resultado del partido se apunta en su propia pantalla, y desde ahí se meten los números de cada jugador

- Los jugadores ya ven la clasificación de la liga y las estadísticas (`app/db/16_estadisticas_visibles.sql`); meterlas sigue siendo cosa del staff
- La pestaña Equipo del jugador pasa a tener tres vistas —plantilla, clasificación y números— en vez de una sexta pestaña que no cabía abajo

- Recortado el catalogo de estadisticas a cinco conceptos: TD, pases de TD, intercepciones, sacks y TD defensivos

- Depurada la consola de quince pantallas a nueve: Resumen se funde con el menu, Cuotas y Tesoreria pasan a ser Dinero, Competiciones y Estadisticas pasan a ser Liga, Solicitudes entra dentro de Roster y la disponibilidad se consulta desde el propio partido
- La barra de abajo pasa a definirse en una lista propia (TABS_STAFF / TABS_JUGADOR) en vez de deducirse del orden del mapa de rutas

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
