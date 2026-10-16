# Pendiente — lo que tienes que hacer tú

Lo que no se puede hacer desde el código: pasos en el panel de Supabase, pruebas
con el móvil en la mano y decisiones del club. Al hacer algo, se tacha y se
borra de aquí.

Última revisión: 19 de septiembre de 2026.

## "Ya he pagado": avisos de pago (16 oct)

1. ~~Ejecutar `app/db/31_pago_avisado.sql`~~ — hecho el 16 oct: `pagos_avisados · true`. Código publicado.
2. **Desplegar otra vez la función `enviar-push`** (Edge Functions → enviar-push → pegar
   `supabase/functions/enviar-push/index.ts` → Deploy). Al abrir su URL en el navegador tiene
   que decir `version: 5`. Sin esto todo funciona, pero a tesorería no le suena el móvil.
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

- **Los delegados leen el DNI y las notas del staff de todos.** Quien lleva el
  material no necesita eso. Se arregla dejando esos dos campos solo para quien
  lleva roster o documentos. Decidir si se hace.
- **Las fuentes vienen de Google.** Cada jugador que abre la app le manda su IP
  a Google. Es asunto de RGPD, no de seguridad: se quita sirviéndolas desde el
  repositorio.
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

- [ ] **Antes del 18 oct, 23:59 — inscripción** del club y del equipo en el portal
      LEVERADE de FEFAPA, con los justificantes de pago subidos.
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
  carnet de conducir** (art. 27). El trámite va por LEVERADE: al hacer la inscripción, mirar
  qué archivos pide la ficha de cada jugador y en qué formato (imagen o PDF).
- [ ] **Material de local**: cámara para grabar, marcador de downs, marcador y pilones,
      2 petos amarillos.
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
5. **Acuerdo con Nerion (15/10/2026):** antes de firmar, pedir que la licencia cubra solo el nombre y
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
