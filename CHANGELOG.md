# Changelog — Coruña Atlantics Web

## [2026-10-16] — Árbitros de tres jornadas y el documento de identidad en la app

**Qué se hizo:**
- **Árbitros:** tras hablar con el presidente, hay que pagar 3 jornadas. Con 3 árbitros a 30 € salen 270 €, y hasta ≈ 765 € con dietas completas, frente a ≈ 719 € de margen
- **Qué documentación pide FEFAPA:** el reglamento de flag 2026-27 no dice el formato. Para la revisión en el partido acepta DNI, NIE, pasaporte o carnet de conducir
- **App: documento de identidad.** El jugador sube cara, dorso (no en el pasaporte) y foto de carnet desde Mi ficha. El staff los ve en Documentos, los baja en un ZIP con `jugadores.csv` y los borra cuando ya no hacen falta. Almacén privado con permisos en Postgres (`30_identidad.sql`). Probado en la demo: subida, cambio a pasaporte, ZIP válido y sin errores en consola

**Archivos modificados:** `app/db/30_identidad.sql` (nuevo), `app/db/00_instalar.sql`, `app/db/generar_instalador.py`, `app/js/zip.js` (nuevo), `app/js/vistas/identidad.js` (nuevo), `app/js/vistas/jug-ficha.js`, `app/js/vistas/documentacion.js`, `app/js/db.js`, `app/js/db-demo.js`, `app/css/app.css`, `app/sw.js` (v75), `app/README.md`, `docs/pendiente.md`, `docs/decisiones.md`.

**Pendiente:** ejecutar `30_identidad.sql` en Supabase, publicar y probar la subida con la app instalada en el móvil; en LEVERADE, mirar qué formato piden para los documentos.

## [2026-10-15] — Presupuesto de la liga con 10 jugadores, avatar de redes y acuerdo con Nerion

**Qué se hizo:**
- **Training Day de flag** (teal oscuro, la foto que quedaba libre) con tres textos en `redes/posts/training-day-flag/`; recomendado el C, el de captar
- **Avatar para redes** en 1080×1080 (`redes/avatar/generar_avatar.py`): Poseidón, cabeza y escudo sobre el teal de los destacados. El logo se encaja midiendo hasta dónde llega el dibujo, no su rectángulo, porque las letras de ATLANTICS pisaban el aro
- **Revisión del acuerdo con Nerion Athletics:** firmable con cambios. Hay que quitar la cesión de la imagen de los jugadores, que la terminación valga para las dos partes, quitar la obligación de buscarles compradores y añadir CIF y domicilio. Además, los balones KS1 tienen el mismo 10 % que el código público y quedan restos de una plantilla de tackle
- **Presupuesto de la Liga Norte:** 10 jugadores, 12 equipaciones de cada, patrocinio de 500 € y cuota de 170 €. Gastos fijos de ≈ 1.481 €, entran 2.200 € y quedan ≈ 719 € para árbitros, staff y cuenta
- **Inscripción en FEFAPA:** el club ya está federado en FEFA y nadie ha pedido registros. En el calendario están la llamada del viernes 16 al presidente de la liga, con sus preguntas, y el límite del domingo 18 a las 23:59

**Archivos modificados:** `docs/pendiente.md`, `docs/decisiones.md`, `CHANGELOG.md`. Fuera de git: `redes/posts/training-day-flag/` (nuevo), `redes/avatar/` (nuevo) y `redes/calendario/calendario-octubre-2026.html`, republicado en la misma URL.

**Pendiente:** llamar el viernes 16 al presidente de la liga y hacer la inscripción en LEVERADE antes del domingo 18 a las 23:59 (400 € + 100 €, con el documento de FEFA); elegir el avatar y, si es la cabeza, cambiar también `web/avatar-ig.png`; responder a Nerion con los cambios del acuerdo; mandar a David las tallas, nombres y números de los 10, más 2 conjuntos comodín; poner la cuota de 170 € en la app; apuntar en `redes/LEEME.md` el día en que salga el Training Day de flag.

## [2026-10-14] — Artabro, nuevo patrocinador, y patrocinio a las hamburgueserías

**Qué se hizo:**
- **Planning del jueves 15:** Training Day de las botas en el feed y en story, sesión 1 del entreno (`entrenos/sesion-1.pdf`) y grabar clips para el Reel del martes 20
- **Cartel de patrocinador de Artabro Organic Gin** (modelo tridente-especial) en `redes/posts/patrocinador-artabro/`, con dos textos. El logo se recortó de una captura de su Instagram y se dejó en blanco, sin fondo
- **Dossier al día:** Artabro aparece junto a O'Culto y Nanys en "Nuestros patrocinadores". Se rehicieron los dos PDF; el ligero pesa 636 KB
- **Mensajes para 19 hamburgueserías**, uno por local, en `redes/dossier/mensajes-hamburgueserias.md`: 3 correos (Hermes' Journey, Uptown y Feypo) y 16 DM. Llevan la frase de la bacon cheeseburger y terminan con "si os apetece ser nuestros patrocinadores", sin pedir visita
- **Contactos comprobados en la web de cada local y en Páxinas Galegas.** ROJO figura como cerrado temporalmente, en el local de La Burguería ahora está Jack's, la web de Devoto está hackeada y los locales de La Pepita en Coruña los lleva un franquiciado de la ciudad
- **Envío por el navegador:** no se pudo, porque Chrome no tiene abierta la sesión de Instagram del club

**Archivos modificados:** `docs/pendiente.md`, `docs/decisiones.md`. Fuera de git, en `redes/`: `posts/patrocinador-artabro/` (nuevo), `plantillas/_editables/logo-artabro-blanco.png` y su HTML, `dossier/dossier-patrocinio.html`, los dos PDF del dossier, `dossier/img/logo-artabro-blanco.png`, `dossier/mensajes-hamburgueserias.md` (nuevo), `dossier/mensajes-patrocinio.txt` y `LEEME.md`.

**Pendiente:** enviar los 19 mensajes, de 4 a 5 al día; el @ de Instagram de Artabro y el día de su post; preguntar a ROJO si sigue abierto antes de publicar su cartel; pedir a Artabro el logo en buena calidad.

## [2026-10-13] — Equipación con David (Phenix), playbook del club y hoja del entreno

**Qué se hizo:**
- **Proveedor elegido: David Young (Phenix)**, 504 USD ≈ 441 € por 24 conjuntos con envío, aranceles e IVA incluidos, 3-4 semanas. Se le comunicó por Alibaba; las tallas van a finales de semana y después el pago
- **Datos nuevos de los tres** en `docs/proveedores-equipacion.md`: telas (David camiseta 180 g y pantalón interlock 160 g; Winnie 180 g, malla 230 g a +1 USD), pedido mínimo de reposición (David 3 conjuntos a 20 USD más envío; Gloria 10; Winnie sin cifra) y bocetos corregidos
- **Playbook del club** (`playbook/generar.py`): el de 2016-2017 pasado a nuestro formato y puesto al día: sin RB, quarterback siempre en shotgun, nombres de NFL Flag (Spread, Twins, Trips, Bunch, Trips Stacked), audible único "Blanco" y 12 jugadas con su explicación
- **Playbook en el móvil:** versión adaptable publicada como artifact privado y fijado; se republica en la misma URL
- **Hoja del entreno del jueves** (`entrenos/sesion-1.pdf`, 2 A4): ataque y defensa trabajan a la vez en grupos fijos (rutas y tres jugadas; backpedal y zona 2-1-2), scrimmage final y hoja de jugadas (Spread 1, Spread 2, Trips Stacked 1)
- **Redes:** portada de Reel de las vallas (teal oscuro) entregada con tres textos en `redes/posts/reel-training-day-vallas/texto.txt`; sin publicar
- **Alibaba:** un mensaje para David salió por error en el chat de Gloria; desde entonces se envía chat a chat comprobando el nombre antes de pulsar Enviar

**Archivos modificados:** `docs/proveedores-equipacion.md`, `docs/pendiente.md`, `docs/decisiones.md`, `CLAUDE.md`; nuevos y fuera de git: `playbook/` (`generar.py`, `playbook.html`, `playbook.pdf`, `playbook-movil.html`), `entrenos/sesion-1.html` y `.pdf`, `redes/posts/reel-training-day-vallas/`.

**Pendiente:** lista de tallas, nombres y números para David y el pago (con "DDP, import duties and Spanish VAT included" y Trade Assurance); avisar a Winnie y a Gloria; contrastar las reglas del playbook con el reglamento actual; shotgun a 6 o 6,5 yardas; publicar el Reel de las vallas; inscripción en la liga antes del 18 oct.

## [2026-10-12] — Equipación: tres finalistas con boceto, números en Jersey M54 y sudaderas con TeamPrinted

**Qué se hizo:**
- **Proveedores (10-12 oct):** quedan tres. Gloria (Normzl) bajó el envío a 103 USD DDP → 463 USD ≈ 405 €; Winnie (Kuzhida) 485,56 USD ≈ 425 €; David (Phenix) 504 USD ≈ 441 €. Fichas, ofertas y el estado de cada boceto en `docs/proveedores-equipacion.md`
- **Bocetos:** Winnie lleva tres rondas y solo le falta poner el tridente vertical y centrado en la manga de la visitante; David corrigió "AYLANTICS" y le falta el canesú de la espalda; Gloria aún no ha mandado ninguno. A él le gusta más la base (corte) de David
- **Tipografía de los números: Jersey M54**, elegida viéndola puesta en la camiseta con el 17 (antes gustó Freshman y se descartó). Enviada a David y a Winnie con una prueba; manga: número en la local, tridente en la visitante
- **Fichas del proveedor regeneradas** con los dorsales de pecho y espalda en Jersey M54 (`equipacion/numeros_render.py`); los renders originales quedan guardados como `-original.png`
- **Sudaderas de calle para vender:** se harán con TeamPrinted (desde 15,20 €/pieza), más adelante y sin fecha; las de Alibaba quedan descartadas. Pasos y mensaje de WhatsApp en `docs/pendiente.md`
- **Redes:** Reel del entreno publicado el 10 oct con la portada `training-day-qb2-local.png`; calendario del móvil republicado
- De paso: muñequera de QB (Cutters Playmaker Triple, 17,50 € en Forelle) y comparativa de la tipografía de los Commanders

**Archivos modificados:** `docs/proveedores-equipacion.md`, `docs/pendiente.md`, `docs/decisiones.md`; fuera de git: `equipacion/numeros_render.py`, `equipacion/fuentes/`, `equipacion/pruebas-numeros/`, `equipacion/render-proveedor-*` y `ficha-proveedor-*`, `redes/posts/reel-training-day-qb2/`, `redes/calendario/calendario-octubre-2026.html`, `redes/LEEME.md`.

**Pendiente:** bocetos del 13 oct (David con el canesú, el primero de Gloria, el de Winnie con el tridente) y elegir proveedor; que el pedido diga "DDP, import duties and Spanish VAT included" y vaya con Trade Assurance (a Gloria no se le dio correo); lista de tallas, nombres y números; decidir si el ATLANTICS del pecho y los nombres cambian de fuente; inscripción en la liga antes del 18 oct.

## [2026-10-09] — Proveedor de la equipación de flag: comparativa en Alibaba y tridente en vectorial

**Qué se hizo:**
- **Comparativa de proveedores** para 24 conjuntos (12 local + 12 visitante, sublimados, nombre y número distintos, entrega en A Coruña), a 0,875 €/USD: revisadas las conversaciones y los perfiles de Alibaba, abiertos chats nuevos y negociado precio con mensajes aprobados uno a uno
- **Estilo aclarado a todos:** es flag, se quiere corte de réplica/fan NFL (tipo Fanatics), no camiseta de tackle; el corte de fútbol vale solo como segunda opción si sale más barato
- **En principio se trabaja con David Young (Shenzhen Phenix):** réplica a 21 USD/conjunto con envío y tasas incluidos = 504 USD ≈ 441 € (36,75 €/jugador), 3-4 semanas en total, reposición mínima 5 conjuntos; corte fútbol 18 USD
- **Resto:** Jenny Gu (Vosea) 457,63 € y no baja el envío de 199 USD; Ella Qi 343 € pero solo corte fútbol; Borsco réplica 623,88 €; Rhea Lin rechazó la contraoferta; Misha, Kuzhida, Lishang y Aowei sin precio cerrado
- **Tridente en vectorial** para la manga (David lo pidió para editar los colores): trazado del PNG con `vtracer` a 12 colores planos → `equipacion/tridente-vector.{svg,pdf,zip}`, enviado junto con la tipografía (Graduate)
- **Alibaba:** apagada la traducción automática de los mensajes enviados (salían en chino); ahora salen en inglés tal cual
- De paso: inflador eléctrico de balones en Amazon (Pumteck MY01, 25,99 €) y material/colaboración con Nerion Athletics, con borrador de mensaje para que lo envíe él

**Archivos modificados:** `equipacion/tridente-vector.svg`, `.pdf`, `.zip` y `tridente-vector-comparativa.png` (nuevos, fuera de git), `docs/decisiones.md`, `docs/pendiente.md`.

**Pendiente:** boceto de David con los dos diseños y el teal/oro en CMYK, y saber si le vale el vectorial; decidir la semana del 12 oct; lista de tallas, nombres y números de los 12; que el pedido diga por escrito "DDP, aranceles e IVA español incluidos" y vaya con Trade Assurance; bocetos de Jenny el lunes 12; enviar el mensaje a Nerion.

## [2026-10-08] — Training Day de la escalera y búsqueda de cuenta para el club

**Qué se hizo:**
- **Instagram:** publicado el Training Day de la escalera en azul noche (`foto-escalera-local.png`) con el texto B; imagen y los tres textos en `redes/posts/training-day-escalera/`
- **Registro de Training Day subidos** en `redes/LEEME.md`: balón (1 oct) y escalera (8 oct) publicados, botas (15) y lanzamiento (29) programados, flag y flags libres
- **Calendario del móvil** republicado en la misma dirección: el jueves 8 como publicado, la llamada al Sabadell el viernes 9 (962 000 610, se toca para llamar) y un color nuevo "Gestión del club"
- **Cuenta bancaria del club:** comparadas las opciones. No hay ninguna gratuita y 100 % online para una asociación: Revolut, ING, Openbank, imagin y N26 no las admiten. A 0 € solo Sabadell (línea Tercer Sector, por correo); online de pago, NeusBank (unos 40 €/año) y Qonto (desde 9 €/mes)
- Revisado el aviso de protección de datos del alta online de CaixaBank (estándar, no compromete)

**Archivos modificados:** `docs/pendiente.md`, `redes/LEEME.md`, `redes/calendario/calendario-octubre-2026.html`, `redes/posts/training-day-escalera/` (nuevo). Todo `redes/` sigue fuera de git.

**Pendiente:** llamar al Sabadell el viernes 9 y pedir las condiciones por escrito; confirmar que el alta de CaixaBank es para la asociación y no personal, y qué comisión lleva; averiguar si la cuenta antigua del club sigue abierta; la inscripción en la liga sigue venciendo el 18 oct.

## [2026-10-07] — Patrocinadores en la web, calendario en el móvil, varsity, liga y renders de la equipación

**Qué se hizo:**
- **Web:** sección "Nuestros patrocinadores" con O'Culto y Nanys Fotomatón entre el roster y el Instagram, con CTA de patrocinio (commits `cc12f47` y `aff1206`, publicados y comprobados)
- **Calendario de redes en el móvil:** artifact privado (https://claude.ai/artifact/WaU3rgqeaLjonN6rE7emSk) que marca el día de hoy y deja tachar lo publicado (se guarda en su base, colección `hecho`)
- **Instagram:** portadas de destacados (`generar_destacados.py`, El juego con la cabeza de Poseidón), marco transparente vacío para fotos (`generar_marcos.py`), textos del Training Day y @nanysfotomaton en su post
- **Chaqueta varsity** (`equipacion/generar_varsity.py`): 12 opciones inspiradas en NFL/streetwear; elegida la **2C** con el punto del proveedor **JKS-63** (teal con raya blanca), ficha final `equipacion/varsity/final-2c-3.png`
- **Equipación de flag:** renders de catálogo (`generar_render.py`), el render del proveedor ampliado con Real-ESRGAN y fichas con los colores y dónde va cada uno (`ficha_proveedor.py` → `ficha-proveedor-{local,visitante}.png`)
- **Montaje** de un jugador NFL con la equipación de football de Atlantics (casco negro con tridentes): `equipacion/montaje-jugador-football.jpg`, solo como boceto, no publicable
- **Liga Norte FEFAPA:** leída la convocatoria; checklist con plazos y costes en `docs/pendiente.md` y borrador de correo a FEFAPA en `docs/correo-fefapa.md`

**Archivos modificados:** `index.html`, `web/patrocinador-{oculto,nanys}.png`, `docs/pendiente.md`, `docs/correo-fefapa.md` (nuevo), `equipacion/` (`generar_varsity.py`, `generar_render.py`, `ficha_proveedor.py`, `varsity/`, renders y fichas; fuera de git), `redes/` (destacados, marcos, calendario, posts; fuera de git).

**Pendiente:** inscripción en la liga **antes del 18 oct a las 23:59** (registro de entidades deportivas, cuenta del club, correo a FEFAPA) y 6 licencias antes del 15 nov; día de publicación de Nanys y mover el post de posiciones (ya publicado el 6) en el calendario; @ de ROJO; siguen sin revisar los PNG borrados de la raíz (`Game Day.png`, `MVP.png`…).

## [2026-09-30] — Ropa del club en bocetos, captación por Instagram y entrenos en jueves

**Qué se hizo:**
- **Web:** la tarjeta "Quiero jugar" pasa a "Ven a probar" y abre un DM de Instagram; la app queda como enlace pequeño para los que ya son del equipo (commit `1a9e69c`, publicado y comprobado en corunaatlantics.com)
- **Entrenos los jueves:** calendario de octubre rehecho (Training Day los jueves, Reel el martes siguiente, Nanys al sábado 3) y el post de la NFL en Madrid corregido; hoy se publicó el carrusel de las 7 razones
- **Uniformes de flag** en ficha técnica (`equipacion/generar.py`): local teal con pantalón negro y franjas en los hombros, visitante blanca con los tridentes del club en las mangas; números de bloque dibujados a mano con doble perfil, PLAYER NAME a la espalda y fila de colores al pie
- **Sudaderas y chándales** (`equipacion/generar_ropa.py`): cuatro rondas de 6 + 6 diseños inspirados en NFL/college (Sideline, Starter, Pro Standard, Mitchell & Ness, Kith, Tech Fleece), guardadas en `equipacion/rondaN/`, y catálogo numerado S1–S24 / C1–C24 (`catalogo.py`)
- **Definitivas** pulidas una a una con `equipacion/mejoras.py`: sudaderas S6, S18 y S21 y chándales C2, C12 y C19 (`mejoras-*FINAL.png`, cada una con sus códigos de color)
- **Redes:** los carruseles del glosario y de posiciones alternan fondo azul noche / teal / teal oscuro (`redes/plantillas/_editables/cambiar_fondo.py`); los azules de antes quedan en `_copia-fondo-azul/`
- Logo principal nuevo pasado a PNG transparente y enviado al móvil

**Archivos modificados:** `index.html`, `docs/decisiones.md`, `CLAUDE.md`, `equipacion/` (nuevo, sin subir), `redes/calendario/calendario-octubre-2026.html`, `redes/posts/fechas/nfl-madrid.*`, `redes/posts/glosario-0{1,2,4,6}-*/`, `redes/posts/posiciones-general/`, `redes/plantillas/_editables/` (`cambiar_fondo.py` y fondos), `redes/LEEME.md`.

**Pendiente:** decidir con qué definitivas se queda el club y pedir a la proveedora Pantone y muestra impresa; subir `CLAUDE.md` y decidir si `equipacion/` entra en git; aparecen borrados en git `Game Day.png`, `MVP.png`, `game day 3.png`, `gameday 2.png` y `resultado final.png` en la raíz (no los borró esta sesión: revisar); falta el @ de Nanys antes del sábado 3.

## [2026-09-26] — La marca nueva en todo: guía, plantillas, web, app, vídeo y patrocinio

**Qué se hizo:**
- **Guía de marca** publicada (https://claude.ai/artifact/TjT3b29EXEJF58LczDB4RE, copia en `redes/guia-marca/`). Teal de la equipación elegido: **#006E82** (CMYK C85 M35 Y28 K14 con perfil SWOP); el negro no es de la equipación; fondo de casa en azul noche #0A1626
- **Plantillas de Instagram** en `redes/plantillas/<tipo>/<estilo>-<color>.png` (Game Day, Victoria, Resultado final, Resultados 3/4 partidos, Clasificación, MVP, Training Day, Patrocinador, portadas de Reel), casi todas en 4 colores. Editables y `render.py`/`catalogo.py` en `_editables/`; índice en `redes/LEEME.md` y `CATALOGO.png`
- **Posts listos** en `redes/posts/`: carrusel de identidad (publicado), O'Culto (publicado el 26/09), Nanys y ROJO, 7 razones para jugar, Glosario NFL #01–#06, posiciones tackle y flag, Halloween, NFL Madrid y cartel de captación A4
- **Web:** título en Anton (fuera Bebas Neue), avatar nuevo en WebP, botón de Instagram en oro y quitadas las temporadas para que sea atemporal (commit `cdf5565`)
- **App:** logo nuevo, botones y filtros en teal G, "Mi ficha" de la demo arreglada (faltaba `VAPID_PUBLICA` en `config-demo.js`) y service worker v74 (commit `4a80935`)
- **Vídeo:** LUT de marca y `videos/estilo_atlantics.py` para los clips; cierre oficial `videos/assets/cierre_atlantics_tormenta.mp4`, con el logo animado y sin marca de IA. Instalado `rembg` para recortar jugadores
- **Patrocinio:** dossier en PDF A4 sin niveles ni precios, con datos contrastados de la NFL en España (`redes/dossier/`), contactos de hamburgueserías y mensajes para enviarlo. Calendario de octubre publicado (https://claude.ai/artifact/Q8xMfTCwNadWvqTi8cuU7m)

**Archivos modificados:** `index.html`, `web/avatar-hero*.{png,webp}` (nuevos), `avatar sin fondo v2.png` (nuevo; borrado `avatar Sin fondo.png`), `boceto camis flag*.png`, `app/img/logo-principal.webp`, `app/css/app.css`, `app/js/config-demo.js`, `app/sw.js`, `videos/estilo_atlantics.py` y `videos/assets/{lut,cierre}/` (nuevos), `videos/README.md`, `redes/` (nuevo, fuera de git).

**Pendiente:** enviar el dossier a las hamburgueserías desde el Gmail del club (el conector de Gmail está en otra cuenta), @ de Instagram de Nanys y ROJO, versión para Instagram del cartel de captación y decidir si `redes/` entra en git.

## [2026-09-19] — Avisos al móvil a quien le toca, y dos agujeros de seguridad

**Qué se hizo:**
- **Las notificaciones van a una lista de personas**, no siempre a todo el equipo (`28_push_dirigido.sql`). Un aviso para la defensa se veía solo en su tablón pero sonaba en los cincuenta móviles: eso queda arreglado
- **Cancelar o mover un evento avisa a los convocados**, con una casilla en la ficha del evento marcada por defecto. Solo suena si cambia el día, la hora, el lugar o se cancela; corregir una nota no molesta a nadie
- **Dos botones nuevos:** avisar a quien no ha dicho si viene a un entreno, y a quien debe la cuota. El de la cuota no lleva el importe, porque sale en la pantalla bloqueada
- Se cuentan personas y no aparatos, y tras cada envío la app dice a cuántos de la lista ha llegado: el resto hay que perseguirlo por WhatsApp
- **Auditada la app entera** —23 tablas, políticas, vistas, funciones, navegador, service worker e historial de git— a raíz de una pregunta sobre seguridad. El modelo de permisos aguantó; salieron dos cosas
- **Quitarle el acceso a alguien del staff no le cerraba la API** (`29_acceso_manda.sql`): `es_staff()` y `es_admin()` miraban el rol y no el acceso, así que con su correo podía seguir leyendo teléfonos, DNI y notas. La migración repara antes a los admin con el acceso en `nuevo`, que si no se quedarían fuera de su propio club
- **`supabase-js` y el generador de QR ya no se bajan de un CDN al arrancar**: viven en `app/js/vendor/` y se actualizan con `vendor/actualizar.py`, que falla si queda una referencia a internet. `index.html` lleva además una Content-Security-Policy
- Encontrado de paso que `generar_instalador.py` se había quedado sin los archivos 26 y 27: el instalador los tenía, pero se habrían perdido al regenerarlo
- **Analizados Abler, 360Player y Veo** a petición: lo que merece la pena copiar está en la respuesta de cada uno; de Veo la conclusión es que no, 800-1.400 € al año más la cámara
- Probado con navegador automático sobre la demo y sobre la app: los cuatro envíos, la CSP sin violaciones, el QR con la copia local y cero peticiones al CDN

**Archivos modificados:** `app/db/28_push_dirigido.sql` y `29_acceso_manda.sql` (nuevos), `app/db/00_instalar.sql`, `03_arranque.sql`, `generar_instalador.py`, `app/js/vendor/` (nuevo), `app/index.html`, `app/js/db.js`, `db-demo.js`, `ui.js`, `vistas/{avisos,calendario,cuotas,lista}.js`, `app/sw.js` (v71 → v73), `supabase/functions/enviar-push/index.ts` (v4), `app/README.md`, `docs/decisiones.md`, `docs/pendiente.md` (nuevo), `CLAUDE.md`.

**Pendiente:** todo lo que queda vive ahora en `docs/pendiente.md`, para no ir persiguiéndolo por el changelog. Lo inmediato: probar los tres avisos con la app instalada en el móvil (el SQL, la función y el login ya están comprobados). Sigue ahí lo de que los delegados leen el DNI y las notas del staff, las fuentes de Google por el RGPD, `vapid.txt` fuera del ordenador, el importe de la cuota y el horario, y `app/js/instalar.js` sin enganchar.

## [2026-09-08] — La app no bajaba con la rueda ni con el dedo

**Qué se hizo:**
- Arreglado el fallo que impedía **hacer scroll en la app**: sólo bajaba arrastrando la barra lateral. `overflow-x: hidden` y `overscroll-behavior-y: none` estaban en `html, body`; pasan a `html` a secas
- La causa, para no repetirla: cuando `html` lleva un overflow distinto de `visible`, el del `body` **deja de propagarse al viewport** y el body pasa a ser su propio contenedor de scroll. Como crece con su contenido, ese contenedor nunca desborda, así que no tiene recorrido; el gesto debería encadenarse al de arriba y `overscroll-behavior-y: none` es justo lo que lo bloquea
- Comprobado con el CSS real sobre una réplica de la pantalla de alta: el body queda en `overflow: visible` y la rueda llega hasta el botón de enviar
- Verificado de paso que **la app sí cumple los requisitos para instalarse** en Android: manifest servido con el tipo correcto y enlazado, los tres iconos responden, y el service worker tiene su manejador de `fetch`

**Archivos modificados:** `app/css/app.css`, `app/sw.js` (v70 → v71).

**Pendiente:**
- Decidir qué hacer con `app/js/instalar.js`: escrito y sin enganchar a ninguna pantalla. Ofrecería un botón "Instalar en este móvil" en Android —capturando `beforeinstallprompt`— y las instrucciones exactas en iPhone, donde esa API no existe. Hoy la app no dice en ningún sitio cómo instalarse, y de ahí salió el "por internet no se puede bajar"
- Lo que ya venía de antes: guardar `vapid.txt` fuera del ordenador; fijar el importe de la cuota y el horario de entrenos; probar con un correo ajeno que un registrado sin aprobar no ve nada; impedir borrar un producto de la tienda con pedidos ya cobrados

## [2026-09-07] — El tablón del jugador, y tres fallos que llevaban ahí desde el principio

**Qué se hizo:**
- **Hoy pasa a ser un tablón de anuncios**: pared turquesa con una trama de tridentes, balones y rayos, notas de papel claro clavadas con chincheta y un poco torcidas, el dorsal pintado en cobre en la esquina y el logotipo clavado abajo. Sólo en Hoy; el resto de pantallas conservan el campo
- **Cada clase de cita tiene su dibujo**, en relieve sobre la tarjeta: cono el entreno, balón el amistoso, trofeo la competición, tele la sesión de vídeo (`27_sesiones_de_video.sql`)
- **Ajustes → Ver como jugador**: abre la app del jugador con su propia ficha, para comprobar cómo le llega a la plantilla lo que publica
- **Un logo de fondo por pestaña**: circular en Agenda, balón en Equipo, Football 2 en Avisos; Mi ficha se queda con el dorsal
- **Exportar a CSV la plantilla y cada competición**, que era lo único sin respaldo. `descargarCSV()` deja de estar escrito cuatro veces y vive en `ui.js`
- Cerrada la vista `companeros` (`26_companeros_cerrado.sql`): un registrado sin aprobar podía pedírsela a la API y leer apellidos, ids y quién estaba lesionado
- En la web, el formulario "Quiero jugar" deja de abrir el correo del visitante y lleva a la app. Añadidos descripción, Open Graph y favicon

**Tres fallos viejos, invisibles hasta ahora:**
- La filigrana del fondo vive en `body::before` con `z-index: -1`, y un hijo con z-index negativo se pinta **por detrás del fondo de su propio padre**. Con el degradado opaco del body encima, las líneas del campo no se habían visto nunca. Ahora el degradado va dentro de esa misma capa
- Faltaba `--safe-t`. Con `viewport-fit=cover` y la barra de estado en translúcido, en la app **instalada** la cabecera quedaba bajo el reloj y el icono de la tienda no se podía tocar. En Safari no se notaba
- `pantallaApp` registraba un oyente de `hashchange` por arranque sin quitar el anterior. Con una sola app la duplicidad no se veía; con dos caras provocaba saltos a la consola

**Archivos modificados:** `app/css/app.css`, `app/js/app.js`, `app/js/ui.js`, `app/js/db.js`, `app/index.html`, `app/sw.js` (v55 → v70), las vistas `jug-hoy`, `jug-agenda`, `calendario`, `lista`, `competiciones`, `roster`, `ajustes`, `tesoreria`, `documentacion`; `app/db/25`, `26` y `27`; `app/img/{circular,balon,football}.webp`; `index.html` y `web/`.

**Pendiente:** guardar `vapid.txt` fuera del ordenador; fijar el importe de la cuota y el horario de entrenos; probar con un correo ajeno que un registrado sin aprobar no ve nada; impedir borrar un producto de la tienda con pedidos ya cobrados.

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
