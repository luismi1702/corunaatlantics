# Pendiente — lo que tienes que hacer tú

Lo que no se puede hacer desde el código: pasos en el panel de Supabase, pruebas
con el móvil en la mano y decisiones del club. Al hacer algo, se tacha y se
borra de aquí.

Última revisión: 19 de septiembre de 2026.

## Próxima sesión (20 oct)

- [x] David: pedido pagado el 23/10, 557 USD (≈ 516 €). Prometió recibirlo antes del 18 nov; por contrato, envío garantizado el 19 nov
- [ ] David: dice que sale el 10-12 nov; si el 12 nov no ha dicho que está enviado, reclamárselo
- [ ] Fecha del primer partido (creen que a finales de noviembre): apuntarla en el calendario. Si es antes del 25 nov, avisar a David
- [ ] Nerion: firmar el acuerdo nuevo (21/10, se acepta tal cual). Antes, confirmar la junta en el Registro. Como la 5.a sigue cediendo "imagen", no mandarles fotos de jugadores sin su ok; los balones KS1 pedirlos como pedido de club (12 %, no 10 %). Después: anuncio en redes (2.f), logo en cartelería y streams (2.g), historia semanal (2.a) y un post cada 50 días (2.e)
- [ ] Nerion: pagar la factura NA2026035 (456,99 €) y cobrar su parte a los dos jugadores que pidieron con el club (reparto en `docs/privado/cuentas.md`)
- [x] David: dirección y camiseta local extra incluidas en el pedido
- [ ] NFL: los Dolphins contestaron el 27/10 y nos pasan con su Country Manager en España (hilo del correo del club); respondido el 27/10, esperar su contestación. Falta el formulario de NFL FLAG (2-3 semanas); LinkedIn a Rafa De Los Santos cuando quieras
- [ ] Bolsa de material: medir la Under Armour por dentro y probar la cremallera con los pylons antes de comprar la plancha y cortar (medidas en `docs/bolsa-material.md`); medir y contar los conos altos
- [ ] Muñequera grande: medir el plástico de la ventana por dentro; si no es 17 × 12 cm, cambiar `VENTANA` en `playbook/wristband_grande.py`
- [ ] Con el pedido hecho: `drop view if exists tallas_pedido;`
- [ ] Subvenciones: confirmar la segunda alerta de InfoSubvenciones (n.º 298650, la del Estado) con el enlace del correo que llegó a coruna.atlantics@. La de Galicia ya está activada
- [ ] Redes: publicar el post de Halloween el 31/10 (`redes/posts/fechas/`) y el Reel con la portada genérica local (`redes/posts/reel-training-day-local/`); al publicarlos, decirlo para apuntarlo en `redes/LEEME.md`

## Flag en los colegios (22 oct)

Plan, correos y lista de 83 centros en `docs/colegios/`.

- [ ] Sacar el certificado negativo de delitos sexuales (Luis y quien vaya a ir)
- [ ] Preguntar a la FEFA si la licencia de club incluye seguro de responsabilidad civil
- [ ] Preguntar en el grupo quién puede alguna mañana
- [ ] Hoja para casa con QR y la lista de interesados para el grupo infantil
- [x] Correos enviados a 115 centros el 22/10 (A Coruña + Oleiros, Arteixo, Culleredo, Cambre, Sada,
      Carral, Abegondo y Bergondo), con el dossier. Lista y estado en `docs/privado/colegios/envios.csv`
- [ ] Apuntar las respuestas en `envios.csv` y llamar a los que no contesten en una semana
- [ ] Contestar la semana del 26 oct a los 5 centros que respondieron (resumen en `docs/privado/colegios/respuestas.md`)

## Cuentas y cobros

Las cuentas de la temporada, los Bizums recibidos y quién debe qué están en
`docs/privado/cuentas.md`, fuera de git: el repo es público y la web sirve `docs/`.

Cómo dar de alta a cada jugador en Clupik para la licencia FEFA: `inscribir-licencias-fefa.md`.

- [x] 8 jugadores inscritos en Clupik con la licencia FEFA Nacional Flag Senior (22 oct); todos menos Yllanes
- [ ] Esperar a que la federación las valide (ahora están "en revisión") y ver cómo se pagan los 125 €
- [x] Corregidos el nombre y la fecha de nacimiento de Dan en la app, según su DNI (22 oct)
- [x] Luis inscrito también (22 oct): ya son 9 en Clupik

## Certificados para la Fundación Deporte Galego (17 oct)

1. ~~Pedir la certificación de inscripción en el REDEGA~~ — pedida el 17 oct por solicitud genérica
   (PR004A) a la Secretaría Xeral para o Deporte. Si el 31 oct no ha llegado nada, llamar o escribirles.
2. **Certificación federativa actualizada**: pedírsela a la FEFA (o ver si vale el documento del 15 oct).
3. **Cambiar el domicilio en el REDEGA** (PR946A, cambio de domicilio social): allí sale Luis Quintáns
   Goyanes 4, 4º B, y el domicilio social es Fragas do Eume 28, 5º D, 15190.

## Tallas para el pedido de equipaciones (17 oct)

1. **Ejecutar `app/db/33_tallas_pedido.sql`** en Supabase → SQL Editor (pegar y Run). Al final
   saca la lista de nombre de camiseta, dorsal y talla.
2. Avisar a Claude: lee la vista `tallas_pedido`, marca a quien le falte talla o dorsal y prepara
   el mensaje a David (lista, plazo de entrega y pago) para que lo apruebes antes de enviarlo.
3. Con el pedido hecho: `drop view if exists tallas_pedido;`

## Arreglos de la auditoría (16 oct)

1. ~~Ejecutar `app/db/32_privacidad.sql`~~ — hecho el 16 oct, salieron las tres filas. Código publicado.
2. **Fijar la cuota**: Tesorería → Cuotas → arriba, *Cuota de 2026-27* → 170 → *Poner la cuota*
   (guarda el importe y lo aplica a la plantilla). Hasta entonces a todos les sale "Cuota por fijar".
3. **Comprobar el correo de los códigos**: Supabase → Authentication → Emails → SMTP Settings.
   Si no hay SMTP propio, Supabase manda muy pocos correos por hora y a parte del equipo no le
   llegará el código. Brevo es gratis.

## "Ya he pagado": avisos de pago (16 oct)

1. ~~Ejecutar `app/db/31_pago_avisado.sql`~~ — hecho el 16 oct: `pagos_avisados · true`. Código publicado.
2. ~~Desplegar `enviar-push` v5~~ — no hace falta (16 oct): le basta con verlo en la app
   (menú y Tesorería). Si algún día quiere la notificación, desplegar la versión 5.
3. **Probarlo**: desde la cuenta de un jugador, Mi ficha → *Ya he pagado*; tiene que sonarte
   el móvil y salir en Tesorería → Cuotas → *Pagos por validar*. Validarlo y comprobar que
   su cuota pasa a al día.

## Documento de identidad desde la app (16 oct)

1. ~~Ejecutar `app/db/30_identidad.sql`~~ — hecho el 16 oct: devolvió
   `identidad · false · 3145728 · [image/jpeg]`.
2. ~~Publicar el código~~ — hecho el 16 oct.
3. **Probarlo con la app instalada en el móvil**: Mi ficha → Documento de identidad → tocar
   *Cara*, hacer la foto con la cámara y ver que aparece en la casilla. Luego, en la consola,
   Documentos → *Descargar todo en un ZIP* y abrirlo.
   De paso, en Safari o Chrome **sin instalar**: en la pantalla de entrada tiene que salir "Instalar la app" con
   los pasos (en Android puede salir el botón "Instalar en este móvil"); instalada, no sale.
4. Cuando la federación tenga los documentos: **Documentos → Borrar todos los documentos
   subidos**.

## Ahora mismo: probarlo con el equipo dentro

Hecho el 19 de septiembre: los dos SQL ejecutados —el `select` de control
devolvió `Luis Miguel · admin · aprobado`—, la función `enviar-push`
desplegada y respondiendo `version: 4` con sus secretos en orden, el código
publicado en GitHub Pages y **la app comprobada**: se entra con normalidad, o
sea que la librería de Supabase bajada a `app/js/vendor/` y la CSP están bien.

Queda comprobarlo con gente y con datos de verdad, **desde el móvil con la app
instalada** en la pantalla de inicio: en iPhone, sin instalar no llegan las
notificaciones.

1. **Cancelar un entreno de prueba** y ver que suena «Cancelado · Entreno».
   Desmarcar *Cancelado* y guardar otra vez lo deja como estaba y manda
   «Vuelve · Entreno».
2. **Avisar a quien no ha respondido**, desde la pantalla de un entreno
   próximo. Necesita gente que haya entrado y no haya confirmado.
3. **Avisar a quien debe la cuota**, en Cuotas. Necesita que haya cuotas
   abiertas, o sea el importe de la temporada puesto en Ajustes.

Los tres avisos dicen a cuántos de la lista ha llegado. Que el número sea bajo
al principio es normal: solo cuenta a quien tenga las notificaciones activadas.

## Seguridad: lo que quedó del análisis del 17 de septiembre

- ~~Los delegados leen el DNI y las notas del staff de todos~~ y ~~las fuentes vienen de
  Google~~: arreglados el 16 oct (`32_privacidad.sql` y `app/fonts/`). La web pública
  (`index.html` de la raíz) sigue cargándolas de Google.
- **Verificación en dos pasos en el correo del administrador.** La cuenta se
  abre con un enlace o un código al correo, así que ese correo es la llave del
  club. Esto no es del código: es de tu cuenta de Gmail.

## Del club, no del código

- **Guardar `vapid.txt` fuera del ordenador.** Está en `.gitignore` y no se ha
  subido nunca (comprobado en todo el historial), pero si se pierde ese fichero
  hay que rehacer las notificaciones y todos los móviles tienen que volver a
  activarlas.
- **Fijar el importe de la cuota y el horario de entrenos** en Ajustes, y darle
  a *Aplicar el importe a la plantilla*.
- **Probar con un correo ajeno** que alguien registrado y sin aprobar no ve
  nada del club.
- **Alta en grupo en un entreno**, con el QR de Solicitudes: en iPhone las
  notificaciones solo llegan si la app está instalada en la pantalla de inicio.

## Cosas del código que quedaron a medias

- **Impedir borrar un producto de la tienda** que ya tenga pedidos cobrados.
- **Subir los justificantes a Supabase Storage**: hoy se guarda un enlace.


## Liga Norte de flag (FEFAPA) — URGENTE (07/10/2026)

Convocatoria de la Liga Norte Senior Mixta 5x5, temporada 26-27 (FEFAPA, Asturias).
Contacto: competiciones@fefapa.es · pagos: tesoreria@fefapa.es.

**Primera jornada: domingo 22 de noviembre de 2026** (en principio, dicho el 21 oct; falta saber la sede).

- [ ] **Antes del 18 oct, 23:59 — inscripción** del club y del equipo en el portal
      Clupik (no LEVERADE, según el presidente, 17 oct), con los justificantes de pago subidos.
- [ ] **Preguntar a FEFAPA** qué piden a un club gallego para estar "integrado en FEFA"
      (¿basta con AGFA?). Borrador en `correo-fefapa.md`.
- [x] **Federación:** ya federados en FEFA, con documento (15 oct). Nadie ha pedido ningún
      registro; lo del Registro de Entidades Deportivas solo hará falta si lo pide alguien.
- [ ] **Cuenta del club** para pagar. Si se paga desde una personal, avisar antes a tesorería.
      Mirado el 8 oct: gratis y 100 % online no hay para asociaciones (Revolut, ING, Openbank
      no las admiten). **Viernes 9: llamar al Sabadell, 962 000 610**, y preguntar por la línea
      Tercer Sector (0 €), si se abre sin ir a oficina y qué papeles piden; condiciones por
      escrito. Alta online de CaixaBank empezada: comprobar que es para la asociación y su
      comisión. Si falla, NeusBank (online, unos 40 €/año). Antes, mirar si la cuenta antigua
      del club sigue abierta. Todos piden NIF, estatutos, certificado del registro y acta.
- [ ] **Pagar por separado**: 400 € de inscripción y 100 € de fianza.
- [ ] **Antes del 15 nov — mínimo 6 licencias** de jugador (15 € cada una). Sin 5 en el
      campo no se juega y cuenta como incomparecencia.
- [ ] **Licencia de staff** para quien haga de auxiliar en los partidos de local.
- **Qué documentación pide FEFAPA (mirado el 16 oct)**: el *Reglamento de competiciones de
  Flag 2026-2027* (fefapa.es → Descargas) no dice qué papeles ni en qué formato hay que
  presentar para sacar la licencia. Solo dice que cada licencia se inscribe por persona
  (art. 7) y que en el partido vale la licencia o, si no ha llegado, **DNI, NIE, pasaporte o
  carnet de conducir** (art. 27). El trámite va por Clupik (la convocatoria dice LEVERADE; corregido por el presidente el 17 oct): al hacer la inscripción, mirar
  qué archivos pide la ficha de cada jugador y en qué formato (imagen o PDF).
- [ ] **Material de local**: cámara para grabar, marcador de downs, marcador y pilones,
      2 petos amarillos.
      Pylons: **8 por campo**, 4 en cada end zone (art. 21.5 del Reglamento de competiciones de
      Flag 2026-27 de FEFAPA). Quién los pone en cada sede lo fija el calendario definitivo.
      Decidido el 23 oct: 4 este año y 4 el que viene. Más baratos en networldsports.es (FORZA, 46 cm,
      base con arena, relleno blando): pack de 4 a 54,99 €, pack de 8 a 99,99 €; sin stock hasta el
      17 nov (se puede reservar). En Amazon, GoSports pack de 4 a 77,61 €.
  - Marcador de downs: FORZA "Marca jugada" en networldsports.es, 74,99 €, 2,2 m, en stock
      (en Amazon.de el mismo cuesta 129,99 € + 27,13 € de envío).
  - Simulado el 23 oct en networldsports.es con el código SAVE15 (−15 %, caducaba hacia el 25-26 oct):
    solo 8 pylons = 99,99 − 15,00 + 12,99 envío + 1,30 combustible = **99,28 €**; 8 pylons +
    marcador = 174,98 − 26,25 + 19,99 + 2,00 = **170,72 €** (envío 4-8 días laborables; los pylons
    salen cuando haya stock, ≈ 17 nov). Quedó en el carrito sin comprar.
    Decidido el 23 oct: solo los 8 pylons (99,28 €); el marcador de downs se quita del carrito y queda pendiente
    23 oct: reservados y pagados (99,28 €) desde el móvil (agotados, preorden; vuelve el stock el 17 nov, llegan a finales de nov).
    Si la 1.ª jornada (22 nov) es en casa y no han llegado, pedirlos prestados. Gasto ya apuntado en la app
  - Marcador del resultado (art. 21.12, obligatorio, visible para la grada): si el campo no tiene,
    uno manual de 4 dígitos (≈ 39 × 23 cm) en Amazon a 20-22 € (B0F2DP52BH 19,99 €; QWORK B0CZHKLDT1
    21,98 €). Confirmar con la instalación si tiene marcador
- **Más normas del Reglamento de competiciones (repaso completo, 23 oct):**
  - [ ] Calendario (art. 18): 15 días naturales desde que se publica para pedir cambios de fecha.
        Llegó el 22 oct ("Calendario y organización Sedes temporada 26-27") → hasta ≈ 6 nov
  - Si organizamos sede (art. 18.1): comunicar instalación y horarios a competiciones@ con 15 días
    de antelación como mínimo. Cambiar una fecha ya fijada (art. 19): avisar con 15 días
  - Pagos (art. 38): facturas de árbitros en 4 días laborables; si no, se cobran de la fianza, y
    sin la fianza completa el **miércoles** antes del partido, se pierde como incomparecencia
  - Auxiliar del down marker (art. 21.6 y 28): con licencia, en nuestro roster y mayor de 16 →
    licencia de staff
  - [ ] Canal de YouTube del club para subir los vídeos en privado (art. 36); los enlaces deben
        seguir activos hasta 10 días después de la final (art. 37)
  - Fotógrafo o quien grabe del club: acreditado por FEFAPA y con peto amarillo (art. 21.11 y 26)
  - Delegado (art. 22.3): con los árbitros media hora antes; al acabar, los dos delegados revisan
    el acta en menos de 30 min o hay sanción
  - Lesionados en el área de equipo (art. 27): con la camiseta de juego puesta
  - Entrenador con licencia de personal técnico (art. 5): pide titulación homologada por FEFAPA
- **Lo que pide el Reglamento de competiciones de Flag 2026-27 (repasado el 23 oct):**
  - Siempre (art. 22): cinturón y 2 flags tipo POP de 5 × 38 cm, sin cortar, de un color que
    contraste con el pantalón (negro en la local, blanco en la visitante); uniforme idéntico
    salvo el número; un delegado por partido; revisión de licencias 5 min antes
  - Balón (art. 13): de cuero, o Wilson Revo. Composite solo sub-13
  - Bucal (art. 25): recomendable en senior, no obligatorio
  - Si organizamos sede (art. 21 y 36): campo de hierba marcado con mediocampo, 8 pylons,
    marcador de downs con auxiliar con licencia y peto, áreas de equipo iguales, grada de dos
    alturas, marcador visible, petos amarillos para prensa, y grabar el partido (720p 30 fps,
    plano elevado) y subirlo a YouTube privado antes del lunes 23:59
  - Cámara y trípode/pértiga: esta temporada se piden prestados; comprarlos la temporada 2027-28
  - [ ] Conseguir quién nos presta cámara y trípode antes del primer partido de local
- Presupuesto con 10 jugadores: 650 € de entrada, más árbitros de local (mínimo 3, se pagan
  en 4 días laborables, con viaje y dietas si vienen de fuera) y desplazamientos a Asturias.
- **Tarifas de arbitraje (respuesta de la liga, 10 oct):** arbitraje 30 € por partido; dieta
  55 € fuera de Asturias; media dieta 35 € en Asturias si quien arbitra está 3 partidos o más
  en el campo (jugando o arbitrando); kilometraje 0,26 €/km. Estiman 5 partidos de local
  ("tendréis que pagar 2", sin aclarar si son 2 árbitros, 2 partidos o 2 jornadas) y no saben
  cuántos se juegan en Asturias y cuántos fuera.
  **16 oct, tras hablar con el presidente: hay que pagar 3 jornadas de árbitros.** Con 3
  árbitros a 30 € y un partido por jornada son **270 €**, más dietas y kilometraje si vienen
  de fuera. Falta saber cuántos partidos entran en cada jornada.
- **Presupuesto a 10 oct, 12 jugadores:** inscripción 400 + fianza 100 + licencia FEFA 300 +
  12 licencias 180 + equipación ≈ 441 + material 90 = **≈ 1.511 €**. Con cuota de 150 € se
  recaudan 1.800 €: quedan 289 € para árbitros, licencia de staff y cuenta bancaria. Los viajes
  los paga cada jugador y los cinturones de flag ya se tienen.
- **Presupuesto a 15 oct, 10 jugadores:** inscripción 400 + fianza 100 + licencia FEFA 300 +
  10 licencias 150 + equipación 20 conjuntos ≈ 368 (21 USD/conjunto si David mantiene el precio
  con menos unidades) + material 90 = **≈ 1.408 € → 141 € por persona**, sin árbitros, licencia de
  staff ni cuenta. **Decidido el 15 oct: se piden 12 de cada igual** (24 conjuntos, 441 €), así
  que el total es **≈ 1.481 € → 148 € por persona**. Quien se apunte después y use uno de los dos
  de sobra paga su conjunto (≈ 37 €) y se descuenta del resto.
  **Patrocinio de 500 € (15 oct)**: lo fijo baja a ≈ 981 € → **≈ 98 € por persona**. Con cuota
  de 150 € entran 2.000 € y quedan ≈ 519 € para árbitros, licencia de staff y cuenta.
  **Cuota decidida el 15 oct: 170 €** → entran 2.200 € y quedan **≈ 719 €** de margen.
  La fianza (100 €) se recupera al final si no hay sanciones.
- Durante la liga: horarios confirmados 9 días antes; altas al roster hasta el martes antes
  del partido a las 23:59; de visitante, llevar 3 copias del roster.

## Equipación de flag: proveedor (09/10/2026)

**Decidido el 13 de octubre: el pedido se hace con David (Phenix)**, 504 USD ≈ 441 € por los 24
conjuntos con envío, aranceles e IVA incluidos, 3-4 semanas; reposiciones desde 3 conjuntos a
20 USD más envío. Se le dijo ese día que las tallas van a finales de semana y después el pago.
La comparativa completa, con la ficha de cada empresa, está en `proveedores-equipacion.md`.

1. **Lista de tallas, nombres y números** de los 12 jugadores, para enviársela a David a finales
   de la semana del 12 de octubre.
2. **Avisar a Winnie y a Gloria** de que se ha elegido a otro proveedor (no se les ha dicho).
3. **Tipografía de los números (decidido el 11/10/2026): Jersey M54.** El proveedor que diseñe la
   camiseta tiene que usarla en todos los dorsales (pecho, espalda y mangas). Archivo en
   `equipacion/fuentes/Jersey M54.ttf` (y `JerseyM54.zip` para el chat de Alibaba); pruebas con el
   17 en `equipacion/pruebas-numeros/prueba17-m54-*.png`. Se comparó con Freshman, que gustó al
   principio y se descartó al verla puesta. Falta decidir si los nombres y el ATLANTICS del pecho
   cambian de fuente (ahora Graduate).
4. Antes de pagar: que el pedido diga **"DDP, import duties and Spanish VAT included"** y vaya
   con Trade Assurance.
5. **Acuerdo con Nerion (20/10/2026):** el documento que mandaron sigue igual que el del 15. Se le pide a
   Javier solo el cambio de la 5.a (imagen): `docs/nerion/` (fuera de git) tiene la versión con solo ese
   cambio y otra con todos. Antes de firmar como presidente, confirmar la junta en el Registro.
   Revisión del 15/10, por si se retoma: antes de firmar, pedir que la licencia cubra solo el nombre y
   el logo del club (fotos de jugadores con su consentimiento), que la terminación valga para las dos
   partes con plazo para corregir, quitar la 2.d (buscarles compradores), CIF y domicilio de las dos
   partes, el 12 % en los balones KS1, un % concreto en la ropa, tribunales de A Coruña y quitar los
   restos de tackle ("equipo nacional", cascos y corazas).
6. **Nerion Athletics:** enviar el mensaje de colaboración por Instagram o WhatsApp y aclarar si
   el Flag A Tag de 18,90 € es por unidad o por juego de 12.

## Playbook y entrenos (13/10/2026)

El playbook se ve en el móvil (artifact privado fijado) y se rehace con `python generar.py` en
`playbook/`. La hoja del jueves está en `entrenos/sesion-1.pdf`.

1. **Repasar las reglas del capítulo 1**: salen del playbook de 2016 y no se han contrastado con
   el reglamento actual de la federación.
2. Distancia del shotgun: el capítulo 2 dice 6,5 yardas y el 3 dice 6. Elegir una.
3. Trips Stacked 1: confirmar que los dos de fuera hacen Slant y que la ruta del center (Out a
   5 yardas a la izquierda, puesta por Claude) vale.
4. Hoja del jueves: cómo se reparte la zona 2-1-2 si hay menos de cinco defensores.
5. Reel de las vallas: publicar con `redes/posts/reel-training-day-vallas/texto.txt` y apuntar la
   fecha en `redes/LEEME.md`.

## Sudaderas para vender: TeamPrinted (11/10/2026)

Decidido: las sudaderas de calle se piden a TeamPrinted (teamprinted.eu) y se venden por encargo
para sacar dinero para el club. Datos y precios en `proveedores-equipacion.md`.
**Para más adelante, sin fecha:** primero va la equipación de juego.

1. **Pedir el pack de muestras** (3 piezas en 3 tallas, 27,36 €, con el escudo): lo haces tú,
   pide datos de pago y de envío.
2. **Preguntarles por WhatsApp** (+48 698 493 676): si la tienda del club deja poner un precio de
   venta por encima del coste y quedarse la diferencia, el precio real del modelo y color elegidos,
   tejido y gramaje, y si tienen camisetas de entreno.
3. **Elegir color** entre los 14 (que haya un teal o un azul marino que valga) y el precio de venta.
4. Si la tienda no deja margen, cobrar por la tienda de la app y que el club haga el pedido.

Idea de venta: por encargo (se cobra antes de pedir, sin stock), a jugadores, familia y seguidores.
Con un precio de ejemplo de 35 € y un coste desde 15,20 €, quedan unos 20 € por sudadera: unos
400 € con 20 vendidas. El precio de venta está sin decidir.

Mensaje preparado para su WhatsApp:

> Hola, somos Coruña Atlantics, un club de flag football de A Coruña. Queremos vender sudaderas
> del club a jugadores y seguidores a través de vuestra tienda de club. Unas dudas antes de pedir
> las muestras:
> 1. ¿Podemos poner un precio de venta por encima del vuestro y que la diferencia sea para el club?
> 2. ¿Cuál es el precio final por unidad de la Musai Premium Sports Jacket, con escudo, nombre y número?
> 3. ¿Qué tejido y gramaje tiene?
> 4. ¿Tenéis también camisetas de entrenamiento y sudaderas con capucha?
> Gracias.

## Redes y patrocinio (26/09/2026)

- **Dossier a las hamburgueserías.** Mensajes ya personalizados, uno por local, en
  `redes/dossier/mensajes-hamburgueserias.md` (14/10): 3 correos y 16 DM. Ninguno enviado aún;
  de 4 a 5 al día para que Instagram no los mande a solicitudes. Apuntar respuestas en la tabla del final. Enviar desde el Gmail del club: el conector de Gmail está en otra
  cuenta. Adjuntar `Dossier-Patrocinio-Coruna-Atlantics-ligero.pdf`.
- **Artabro (14/10):** su @ de Instagram (en `redes/posts/patrocinador-artabro/texto.txt` pone @ARTABRO), el día
  del post en el calendario y el logo en buena calidad (el actual sale de una captura).
- **ROJO figura como cerrado temporalmente** en Páxinas Galegas: confirmarlo antes de publicar su cartel.
- **@ de Instagram de ROJO**, para cerrar su post (el de Nanys es @nanysfotomaton). ROJO: publicar y añadir al dossier cuando sea oficial.
- **Versión para Instagram del cartel de captación** (sábado 10 de octubre).
- **Clips de cada martes** para los Reels de los jueves.
- **Decidir si `redes/` entra en git** (unos 30 MB).
- Opcional: "Enviar como" atlantics@corunaatlantics.com en el Gmail del club con el SMTP de Brevo
  (y SPF con `include:spf.brevo.com` + DKIM) para que los correos salgan con el dominio.

## Playbook: defensa sin subir (18/10/2026)

- [x] **Capítulo 6 (Defensa) subido**, también a la app (Equipo → Playbook → Defensa) el 26/10/2026.
- [ ] Ver la defensa en el móvil con la app instalada (si solo sale el ataque, cerrarla del todo y abrirla).
- **Hombre a hombre, profundidad del S:** el PDF de los Ducs dice 8-9 yd en el texto y 5-6 en el
  dibujo; se ha seguido el texto. Confirmarlo con su autora.
- **Wristband:** medir el hueco transparente de la ventana para ajustar el margen (ahora 4 mm).
- **Playsheet de ataque:** revisar el reparto de jugadas por situación (es un borrador).
