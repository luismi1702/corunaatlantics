# Decisiones — Coruña Atlantics

## [2026-09-04] — La primera cuenta que entra es la administradora

**Decisión:** el instalador crea la temporada, y un disparador convierte en administradora
a la primera persona que se registre, mientras no exista ninguna.

**Motivo:** nombrar al primer admin ejecutando SQL a mano era el paso que más se atragantaba
de la puesta en marcha, y el que obligaba a volver al editor después de haber entrado en la
app. Con esto, instalar y entrar es todo.

**El riesgo, asumido:** quien entre primero se lleva la administración del club. Hay que
entrar uno mismo antes de repartir el enlace o el QR. Queda anotado en el propio SQL y en
el README, y `03_arranque.sql` sigue disponible para nombrar admin a mano.

## [2026-09-04] — Los avisos no se contestan

**Decisión:** el tablón es unidireccional. El club publica y el equipo lee; no hay
respuestas ni comentarios. Lo que sí hay es registro de quién lo ha leído.

**Motivo:** si se pudieran contestar, en dos semanas el tablón sería el grupo de WhatsApp
otra vez, que es justo de lo que se quiere salir. Y lo que de verdad aporta no es publicar
—eso ya se hacía— sino saber quién **no** lo ha leído, para perseguir a esos cuatro por
otro canal en vez de repetir el aviso a los sesenta.

**Alternativas descartadas:** permitir respuestas; pedir al jugador que confirme
explícitamente la lectura (con un botón de "enterado" el dato deja de ser fiable en una
semana; marcar al abrir es menos exacto pero mucho más honesto).

## [2026-09-04] — El dorsal lo elige el jugador, pero solo tras ser aprobado

**Decisión:** cada jugador escoge su número desde Mi ficha; quien lo coge primero se lo
queda. Solo puede elegir quien ya está aprobado, no quien acaba de registrarse.

**Motivo:** si se pudiera elegir en el formulario de alta, cualquiera con el enlace de la
app podría entrar y reservarse el 7 sin pertenecer al equipo. El bloqueo lo garantiza el
índice único `perfiles_dorsal_activo`, no la interfaz, y eso resuelve además el caso de
dos jugadores tocando el mismo número a la vez: uno recibe un error de duplicado que la
app traduce a "ese dorsal lo acaba de coger otro".

**Alternativas descartadas:** que el club siga asignando todos los dorsales a mano;
permitir elegir durante el registro.

## [2026-09-04] — Registrarse es pedir entrar, no entrar

**Decisión:** cualquiera con el enlace puede registrarse y rellenar su ficha, pero queda
en estado `pendiente` y no ve nada del club hasta que un administrador le aprueba. El
estado de acceso (`acceso`) es una columna distinta del estado deportivo (`estado`).

**Motivo:** el disparador que enlazaba cuentas creaba una ficha de jugador a cualquiera
que entrase con su email, así que quien conociera la dirección entraba al calendario y a
la plantilla. Además, dejar que cada uno rellene su ficha resuelve el problema de tener
que teclear sesenta altas a mano, y el teléfono lo escribe quien se lo sabe.

**Alternativas descartadas:** un código de invitación del club en vez de aprobación (un
código que saben sesenta personas es medio público y no deja rastro de quién entra);
invitaciones individuales (control total, pero devuelve el trabajo por cada persona).

**Nota:** hoy los menores se registran igual que un adulto. La pantalla de solicitudes
avisa de la edad y recuerda pedir el consentimiento del tutor antes de aprobar.

## [2026-09-04] — Face ID sí, reconocimiento facial no

**Decisión:** la app puede bloquearse con Face ID, huella o código del dispositivo
(WebAuthn, `app/js/cerrojo.js`). No habrá reconocimiento facial para pasar lista.

**Motivo:** son cosas distintas. Con Face ID el dato biométrico no sale del teléfono y la
app solo recibe un sí o un no, así que no se trata ningún dato biométrico. El
reconocimiento facial obligaría al club a guardar un patrón de cada jugador: dato de
categoría especial, desproporcionado cuando la alternativa es tocar un nombre en una
lista, y con categoría base prevista es terreno que conviene evitar del todo. Además no
funcionaría con cascos, de noche y a distancia.

**Alternativas descartadas:** reconocimiento facial en el navegador; identificación por
QR al llegar al entreno (queda disponible si algún día interesa el registro de
puntualidad).

**Ojo:** el cerrojo es local, no un segundo factor. No hay servidor verificando la firma.

## [2026-09-04] — Lo que dice el jugador y lo que hace el jugador van separados

**Decisión:** `asistencias` tiene dos columnas: `confirmacion`, que escribe el jugador
antes del entreno, y `estado`, que escribe el staff pasando lista en el campo. Un
disparador impide que un jugador toque la segunda.

**Motivo:** si fueran el mismo dato no se podría saber quién dijo que iba y luego no
apareció, que es justo la información que hace falta para gestionar una plantilla.

**Alternativas descartadas:** una sola columna que el jugador rellena y el staff corrige.

## [2026-09-04] — Un jugador ve de sus compañeros lo que se ve en una camiseta

**Decisión:** la vista `companeros` expone nombre, apodo, dorsal, posiciones y estado.
Nada más. Ni teléfonos, ni documentación, ni cuotas, ni notas del staff.

**Motivo:** la app es del club, no un directorio de contactos. Repartir los teléfonos de
sesenta personas entre sesenta personas es una decisión con consecuencias, y no debería
tomarse por omisión al construir una pantalla de "equipo".

**Alternativas descartadas:** no dejar que los jugadores se vean entre ellos (se pierde
lo poco que hace que la app parezca de un equipo); dar también los teléfonos.

## [2026-09-04] — Pasar lista lo hace el staff, no los jugadores

**Decisión:** la asistencia se registra tocando nombres en una lista desde el móvil del
staff, en el campo. Que cada jugador confirme por su cuenta queda para más adelante y se
guardará aparte.

**Motivo:** la versión que dependía de que 60 personas instalaran la app era la apuesta
incierta de todo el proyecto. Así la función sirve desde el primer día sin depender de
nadie, y cuando los jugadores empiecen a confirmar se suma a lo mismo. Además son dos
datos distintos: lo que alguien dice que hará y lo que acaba haciendo.

**Alternativas descartadas:** empezar por la confirmación del jugador, que era el plan
original de la fase 1B.

## [2026-09-04] — La cuota no entra en la disponibilidad para jugar

**Decisión:** la pantalla de disponibilidad cruza lesiones, licencia, seguro y
reconocimiento médico. Deber la cuota no aparece ahí de ninguna forma.

**Motivo:** decisión del usuario. Quién juega y quién debe dinero son dos conversaciones
distintas, y juntarlas en una pantalla las convierte en una sola. Que un impago acabe
apartando a alguien del campo debe ser una decisión consciente del club, nunca un efecto
secundario del software.

**Alternativas descartadas:** que la deuda bloquee la convocatoria; que aparezca como
aviso junto al nombre.

## [2026-09-04] — La primera pantalla de la app es un menú, sin cifras de dinero

**Decisión:** al abrir la consola se ve un menú de baldosas con avisos numéricos, no el
saldo ni lo cobrado. Las cifras económicas viven en Resumen, Cuotas y Tesorería.

**Motivo:** es la pantalla que queda abierta en el móvil y la que ve de reojo cualquiera
que esté al lado en el campo. Lo que debe cada jugador y cuánto hay en caja no deberían
leerse por encima del hombro. Las chinchetas del menú dicen *cuántas* cosas hay que
mirar, nunca cuánto dinero.

**Alternativas descartadas:** el panel de cifras como pantalla de inicio, que era el
diseño original.

## [2026-09-04] — Las cuotas no se apuntan en tesorería

**Decisión:** la tabla `movimientos` registra todos los ingresos y gastos del club
excepto las cuotas de jugadores. El resumen de tesorería suma las cuotas por su lado,
calculándolas desde `pagos`.

**Motivo:** los pagos de cuota ya están registrados en `pagos`. Apuntarlos además como
movimiento contaría el mismo dinero dos veces y el saldo dejaría de ser fiable. Una
restricción de la base de datos prohíbe la categoría `cuotas` para que no pueda pasar
por descuido.

**Alternativas descartadas:** una sola tabla de movimientos donde también se apunten las
cuotas (obligaría a mantener a mano la coherencia con los pagos de cada jugador).

## [2026-09-04] — La app vive en el mismo repo que la web, en /app/

**Decisión:** la consola se publica en `corunaatlantics.com/app/`, dentro del repo de la
web. No hay enlace desde la web pública y la app lleva `noindex`.

**Motivo:** un solo despliegue, un solo certificado SSL y ninguna infraestructura nueva.
Comparten dominio e identidad visual, no código ni público. Si algún día conviene
separarlas, mover la app a `app.corunaatlantics.com` es un cambio de DNS.

**Alternativas descartadas:** repositorio y hosting aparte (más cosas que mantener y otro
certificado que puede fallar, como ya pasó una vez).

## [2026-09-04] — La app registra los pagos, no los cobra

**Decisión:** la consola de gestión guarda quién ha pagado, cuánto y cuándo, pero el
dinero sigue entrando por Bizum o transferencia. No se integra pasarela de pago.

**Motivo:** una pasarela rompe el coste cero (Stripe se lleva ~1,5 % + 0,25 € por
operación) y obliga al club a manejar dinero de terceros, con sus obligaciones fiscales.
Y sobre todo no resuelve el problema real, que no es cobrar sino saber quién ha pagado.

**Alternativas descartadas:** Stripe o similar dentro de la app. El modelo de datos ya
separa la cuota (lo que se debe) del pago (lo que ha entrado), así que si algún día el
volumen lo justifica se añade sin rehacer nada.

## [2026-09-04] — La consola de gestión va antes que la parte del jugador

**Decisión:** la fase 1A es el panel de admin (roster, cuotas, documentación). La parte
del jugador (asistencia, avisos) es la 1B.

**Motivo:** la consola aporta valor aunque ningún jugador instale la app, porque el único
usuario que tiene que adoptarla es quien la administra. Es la parte del proyecto sin
riesgo. Todo lo demás depende de que 60 personas cambien de hábito.

**Alternativas descartadas:** empezar por la asistencia, que era el plan inicial y es lo
que más se usaría, pero deja el proyecto entero pendiente de una apuesta incierta.

## [2026-09-04] — Un perfil es una ficha, no una cuenta de usuario

**Decisión:** `perfiles` tiene su propio id y un `user_id` que puede ser nulo. La ficha de
un jugador existe sin que esa persona se haya registrado; al entrar por primera vez, su
cuenta se enlaza con la ficha por el email.

**Motivo:** si el perfil dependiera de la cuenta no se podría cargar el roster hasta que
los 60 jugadores se registrasen, y la fase 1A tiene que servir desde el primer día.

**Alternativas descartadas:** usar el id de `auth.users` como clave del perfil, que es el
patrón habitual de Supabase y el que se escribió primero.

## [2026-09-04] — El primer administrador se nombra por SQL

**Decisión:** el rol `admin` no se puede conceder desde la app. El primero se pone a mano
en el editor SQL de Supabase.

**Motivo:** si la app pudiera crear administradores, cualquiera que se registrase podría
hacerse uno. Un disparador impide además que un jugador se cambie el rol a sí mismo
editando su ficha.

## [2026-08-27] — Textos del Reel como PNG rasterizado, no como texto nativo

**Decisión:** los rótulos del Reel se generan como PNG transparentes con Anton incrustada
(`videos/assets/textos/`) y se insertan en CapCut como superposición.

**Motivo:** CapCut móvil no permite instalar fuentes propias. Rasterizando el texto se
mantiene la tipografía de marca aunque se edite desde el teléfono.

**Alternativas descartadas:** usar la herramienta de Texto de CapCut con una fuente
parecida de su biblioteca (rompe la identidad visual); editar siempre en PC para poder
instalar Anton (obliga a transferir todo el material bruto desde el móvil).

## [2026-08-27] — Edición de vídeo en móvil como flujo por defecto

**Decisión:** los Reels se montan en CapCut móvil. El PC se usa solo para generar assets
de marca (endcards, logos, textos) y para archivar el resultado final.

**Motivo:** el material se graba con el móvil, así que editar ahí elimina el paso de
transferencia, que es donde más se abandona el proceso. La detección de beats, que es lo
que más aporta al resultado, está disponible igual en móvil.

**Alternativas descartadas:** editar en PC (mejor precisión y color, pero obliga a pasar
todos los brutos); editar con ffmpeg por línea de comandos (inviable para cortar al ritmo
de la música).

## [2026-08-27] — Comunicación externa: sin refundación y sin gratuidad

**Decisión:** en cualquier texto dirigido fuera del club no se menciona la refundación ni
que entrenar sea gratuito.

**Motivo:** hablar de refundación sugiere que el equipo estuvo parado o tuvo problemas.
Destacar la gratuidad ante un colectivo concreto (Erasmus) insinúa un trato especial que
no existe, porque no se le cobra a nadie por venir a probar.

**Alternativas descartadas:** presentar la apertura como "puertas abiertas gratuitas para
Erasmus", que era el enfoque del primer borrador.

## [2026-09-01] — Reprovisionar el certificado SSL en vez de esperar a GitHub

**Decisión:** cuando `corunaatlantics.com` falle con `ERR_CERT_COMMON_NAME_INVALID`, el
arreglo es quitar el custom domain en Settings → Pages y volver a ponerlo, y después
activar "Enforce HTTPS". Se puede hacer por API:
`gh api -X PUT repos/luismi1702/corunaatlantics/pages -f cname=` y luego con el dominio.

**Motivo:** ese toggle es lo que dispara la emisión del certificado de Let's Encrypt. En
esta ocasión tardó menos de un minuto. El síntoma ("la web no funciona") no apunta hacia
el certificado, así que sin esto anotado se pierde tiempo revisando DNS y el HTML, que
estaban bien.

**Alternativas descartadas:** esperar a que GitHub renueve solo (el certificado ya había
expirado y la renovación automática había fallado, no iba a arreglarse); mover el sitio a
Cloudflare Pages o Netlify para tener control del certificado (cambio de hosting
desproporcionado para un fallo puntual y reversible en dos comandos).

## [2026-09-07] — El tablón sólo en Hoy, y con papel claro

**Decisión:** la pantalla Hoy del jugador se dibuja como un corcho de vestuario —pared
turquesa con trama del club, notas de papel claro con chincheta— y las demás pantallas
conservan el fondo de campo con el dorsal gigante.

**Motivo:** Hoy se abre veinte veces por semana para mirar una sola cosa, y el papel claro
la hace legible de un vistazo; el color del papel (crema, amarillo, verde) distingue lo
normal de lo urgente y de lo del club sin leer una palabra. En Agenda, Equipo y Mi ficha
se lee y se toca mucho más rato, y ahí el fondo oscuro cansa menos.

**Alternativas descartadas:** corcho marrón de verdad (chocaba con el teal y el oro del
club, y con dos fondos ya en marcha habría sido un tercero peleándose); el tablón en todas
las pantallas del jugador (el papel claro a pantalla completa cansa en las pantallas de
uso largo); notas oscuras sobre la pared turquesa (dejan de leerse como notas y parecen
pantallas pegadas al corcho).

## [2026-09-07] — El partido de liga no es un tipo de evento

**Decisión:** `tipo_evento` gana el valor `video` pero **no** un valor `liga`. Un amistoso
y un partido de competición son los dos `partido`; lo que los separa es tener
`competicion_id` o no, que ya se guardaba.

**Motivo:** añadir `liga` sería guardar dos veces el mismo hecho, y el día que un partido
tuviera `tipo = 'liga'` y `competicion_id` nulo —o al revés— no habría forma de saber cuál
manda. La sesión de vídeo sí es un hecho nuevo: no se va al campo, no cuenta igual para la
asistencia y no cabía en el comodín `evento` sin quedarse sin nombre en la app.

**Alternativas descartadas:** un enum con `entreno / partido / liga / torneo / video`;
una columna booleana `es_oficial` (mismo problema de duplicar el dato).

## [2026-09-07] — La filigrana del fondo va dentro de su propia capa

**Decisión:** el degradado de fondo de la app se pinta como última franja de
`body::before`, y el `body` queda transparente. No se sube el `z-index` de esa capa a 0.

**Motivo:** un pseudoelemento con `z-index: -1` se pinta por detrás del fondo de su propio
padre. Con un degradado opaco en el `body`, la capa quedaba tapada y las líneas del campo
no se vieron nunca desde que se escribieron. Subir el z-index a 0 lo arreglaría, pero
entonces la capa taparía todo el contenido que no está posicionado, empezando por la
pantalla de entrar.

**Alternativas descartadas:** mover el degradado a `html` (obliga a un `:has()` para
distinguir el tablón del resto, y deja de funcionar la franja de color del indicador de
inicio de iOS); `z-index: 0` en la capa.

## [2026-09-07] — Zona segura arriba, no sólo abajo

**Decisión:** existe `--safe-t: env(safe-area-inset-top)` y lo aplican la cabecera, la
pantalla de entrar y el marco del tablón.

**Motivo:** con `viewport-fit=cover` y `apple-mobile-web-app-status-bar-style:
black-translucent`, la app **instalada** se dibuja por debajo del reloj y de la isla
dinámica. Había `--safe-b` para el borde de abajo y nada para el de arriba, así que la
cabecera y el icono de la tienda quedaban tapados y sin poder tocarse. **En Safari no se
nota**: ahí la barra de estado la pinta el navegador. Todo lo que se toque de la cabecera
hay que probarlo con la app instalada, no en el navegador.

**Alternativas descartadas:** quitar `black-translucent` (se pierde el fondo del club
detrás de la barra de estado y aparece una banda gris).

## [2026-09-08] — El cinturón horizontal va sólo en `html`, nunca en `html, body`

**Decisión:** `overflow-x: hidden` y `overscroll-behavior-y: none` se declaran únicamente
sobre `html`. Nunca sobre `body`, aunque parezca que no hace daño.

**Motivo:** el overflow del `body` sólo se propaga al viewport mientras el de `html` sea
`visible`. En cuanto `html` lleva `overflow-x: hidden`, esa propagación se corta y el
`body` se convierte en **su propio contenedor de scroll**. Y como el `body` crece con lo
que tiene dentro, ese contenedor nunca desborda: no tiene recorrido. La rueda y el dedo
apuntan primero a él, no consiguen moverlo, y el gesto debería encadenarse al de arriba,
salvo que `overscroll-behavior-y: none` es exactamente la propiedad que bloquea ese
encadenamiento. Resultado: la app sólo bajaba arrastrando la barra lateral, que mueve el
viewport sin pasar por el gesto.

El síntoma engaña: parece un fallo de la pantalla concreta que estás mirando, y es del
CSS global. Y no se reproduce igual en todos los navegadores, así que "a mí me va" no
sirve como comprobación.

**Alternativas descartadas:** quitar sólo `overscroll-behavior-y` del body (rompe la
cadena de causas, pero deja el body convertido en contenedor de scroll, que es la trampa
de fondo y volvería a morder con cualquier regla futura); poner `height: 100%` en `html,
body` con `overflow-y: auto` en el body (funciona, pero obliga a que todo lo de dentro
gestione su propia altura y rompe `position: sticky` en la cabecera).

## [2026-09-17] — Los avisos al móvil van a una lista de personas, no a todos

**Decisión:** `enviar-push` acepta `para` (ids de perfil) y la base de datos filtra las
suscripciones por esa lista (`28_push_dirigido.sql`). Pueden mandar quien lleva avisos,
calendario o tesorería. Se usa en cuatro sitios: avisos de una unidad, cambio o
cancelación de un evento, quien no ha respondido a un entreno y quien debe la cuota.

**Motivo:** hasta ahora un aviso "solo para la defensa" se veía solo en el tablón de la
defensa, pero **sonaba en todos los móviles**. Y cancelar un entreno desde el calendario
no avisaba a nadie. Si la gente recibe notificaciones que no van con ella, aprende a no
hacerles caso, y entonces tampoco se entera de lo importante.

Tres detalles a propósito:
- Una lista vacía es "a nadie", no "a todos". Si la función las confundiera, un filtro
  que no encuentra a nadie mandaría la notificación a la plantilla entera.
- Se cuentan personas, no móviles, y la app dice a cuántos de la lista les ha llegado:
  los que faltan son los que hay que perseguir por otro lado.
- El aviso de cuota no lleva el importe. Sale en la pantalla bloqueada.

**Alternativas descartadas:** avisar sin casilla de cada edición de un evento (corregir
una nota haría sonar cincuenta móviles); hacerlo desde un disparador en la base de datos
(obligaría a llamar a la función desde Postgres con una clave guardada en la base, justo
lo que quitó `23_push_sin_clave_servidor.sql`).

## [2026-09-17] — Sin acceso no hay nada, y ninguna librería viene de fuera al arrancar

**Decisión 1:** `es_staff()` y `es_admin()` exigen `acceso = 'aprobado'` además del rol
(`29_acceso_manda.sql`).

**Motivo:** las dos funciones miraban solo el rol. Quitarle el acceso a alguien pone su
`acceso` en 'rechazado' y le echa de la app, pero si su rol era `staff` o `admin` seguían
diciendo que sí: con su cuenta de correo, que sigue viva, podía volver a entrar y pedirle
a la API la plantilla entera —teléfonos, DNI, fechas de nacimiento, notas del staff—.
A los jugadores el corte sí les funcionaba, así que lo único que quedaba expuesto era
justo lo de la persona de la que uno se querría proteger.

La migración **repara antes de apretar**: un admin nombrado con `03_arranque.sql` podía
tener el rol puesto y el acceso en 'nuevo', y se habría quedado fuera de su propio club.
Se reparan 'nuevo' y 'pendiente'; a 'rechazado' no se le toca, que es el caso a cerrar.
`03_arranque.sql` pasa a poner también el acceso.

**Decisión 2:** `supabase-js` y `qrcode-generator` se sirven desde `app/js/vendor/`, y
`index.html` lleva una Content-Security-Policy que solo permite código propio.

**Motivo:** se cargaban de jsDelivr al abrir la app. Ese código corre dentro de nuestro
dominio y ve la sesión de quien la esté usando, o sea todo lo que esa persona pueda leer.
Un módulo ESM no admite `integrity`, así que no hay forma de comprobar que lo que llega
es lo que se revisó. Son 277 KB y diez ficheros, bajados con `vendor/actualizar.py`, que
falla si queda una sola referencia a internet.

**Alternativas descartadas:** dejar el CDN con la versión fijada (fija la versión, no el
contenido); `frame-ancestors` en la CSP (en un `<meta>` el navegador lo ignora, y en
GitHub Pages no se pueden poner cabeceras); quitar `'unsafe-inline'` de `style-src`
(la app usa atributos `style=""` y se quedaría sin maquetar).


## [2026-09-26] — Material de redes fuera de la web y del repo

**Decisión:** las plantillas y los posts de Instagram viven en `redes/`, se generan desde HTML
con Playwright (`redes/plantillas/_editables/render.py`) y, por ahora, **no entran en git**.

**Motivo:** son unos 30 MB de imágenes que no pinta la web, y el repo es público y lo sirve
GitHub Pages. Generarlas desde HTML permite cambiar un rival, un marcador o un color y volver
a sacar el PNG sin programas de diseño de pago.

**Alternativas descartadas:** Canva o Figma (dependen de otra cuenta y no se regeneran por
lotes); subirlas al repo (lo engordan sin que la web las use); plantillas de CapCut para
las imágenes (no mantienen la marca).

## [2026-09-26] — Correo del club: atlantics@ es un reenvío, no una cuenta de Google

**Decisión:** los correos del club se envían desde el Gmail del club (coruna.atlantics@gmail.com).
Para que salgan como atlantics@corunaatlantics.com, la vía es "Enviar como" en Gmail con el
SMTP gratuito de Brevo, que ya tiene un código de verificación en los TXT del dominio.

**Motivo:** el dominio tiene reenvío de Namecheap (MX eforward), así que atlantics@ recibe
pero no tiene buzón ni cuenta de Google, y el conector de Gmail no puede usarlo. El conector
estaba en una cuenta personal ajena al club.

**Alternativas descartadas:** Google Workspace (de pago); enviar desde la cuenta personal
(mezcla cosas que no son del club).

## [2026-09-30] — Venir a probar es un mensaje por Instagram, no un alta en la app

**Decisión:** la tarjeta "Quiero jugar" de la web pasa a "Ven a probar" y lleva a un DM de
Instagram (ig.me/m/corunaatlantics). La app queda como enlace pequeño para quien ya es del
equipo; al que viene a probar y se queda se le da de alta después, en persona.

**Motivo:** entrar en la app pedía correo, código, ficha y esperar la aprobación del club:
era darse de alta en el equipo antes de haber pisado un entreno, y frenaba la captación.
Instagram es donde ya escribe la gente y lo que dicen los posts ("escríbenos por DM").
En la web no van el día, la hora ni el sitio del entreno: se cuentan por mensaje.

**Alternativas descartadas:** WhatsApp (obliga a publicar un número); un formulario que
guarde en Supabase (tabla, RLS y pantalla nuevas para algo que un DM resuelve); volver al
formulario con mailto (en móviles sin correo configurado no hacía nada).

## [2026-09-30] — El negro solo va en el pantalón de la local

**Decisión:** la equipación de flag local es teal con pantalón negro (#16191C); en el resto de prendas del club (visitante, sudaderas, chándales) no hay negro y el color oscuro es el azul marino #0F2640.

**Motivo:** lo pidió él al ver el boceto ("el pantalón del azul es negro"). El negro sigue sin ser color del club (el Ink #040d12 es solo fondo de la web); el marino de la ropa es un punto más claro que el azul noche de las plantillas para que en tela no parezca negro.

**Alternativas descartadas:** pantalón teal a juego con la camiseta (no le gustó); usar el azul noche #0A1626 en la ropa (en tela se confunde con negro).

## [2026-10-07] — Ampliar imágenes con Real-ESRGAN en local

**Decisión:** para sacar en grande una imagen pequeña (p. ej. el render del proveedor que llegó
como captura de 261 px) se usa Real-ESRGAN x4plus en local con `spandrel` + PyTorch CPU ya
instalado; el modelo `.pth` se baja de GitHub al scratchpad y no entra en el repo.

**Motivo:** es gratis y sin cuentas (regla de solo herramientas gratuitas), y reconstruye bordes
de texto y números mucho mejor que un reescalado normal. Aun así no inventa lo que no está:
si el original es muy pequeño, lo mejor sigue siendo pedir la imagen original.

**Alternativas descartadas:** redibujar el render con SVG (no quedaba "igual" a la foto, lo
rechazó él); servicios web de ampliación con IA (créditos o marca de agua).

## [2026-10-09] — Vectorizar el tridente con vtracer

**Decisión:** el tridente solo existe como PNG (327 × 520 px útiles en `tridente sin fondo.png`).
Para dárselo al proveedor en vectorial se amplía ×4, se reduce a 12 colores planos (mediana +
`quantize` MEDIANCUT + filtro de moda) y se traza con `vtracer` (pip, gratuito). Sale
`equipacion/tridente-vector.svg` y el mismo trazado en PDF (Playwright).

**Motivo:** el proveedor necesita trazados para cambiar los códigos de color, y no hay archivo
original en vectorial. Con 12 colores se conservan los brillos y las sombras del relieve y el
archivo queda manejable (174 trazados).

**Alternativas descartadas:** trazar sin cuantizar (2.871 trazados, 3 MB, ineditable); 8 colores
(pierde los brillos blancos); `quantize` MAXCOVERAGE (colores falsos, amarillos y naranjas);
potrace/Inkscape (no instalados y potrace solo traza en un color).

## [2026-10-12] — Números de la equipación: Jersey M54, y cómo se cambian en los renders

**Decisión:** los dorsales van en Jersey M54 (`equipacion/fuentes/Jersey M54.ttf`). En la manga,
número en la local y tridente en la visitante. Los renders del proveedor son una imagen, no un
dibujo editable, así que el número se cambia con `equipacion/numeros_render.py`: máscara de color
del dorsal antiguo, relleno con la tela de alrededor (`cv2.inpaint`) y el número nuevo pintado
encima con la perspectiva del render. Parte siempre de `render-proveedor-<kit>-original.png`.

**Motivo:** se quería una fuente de bloque tipo NFL y se eligió viéndola puesta en la camiseta, no
suelta. Rehacer el render entero para cambiar un número habría perdido el aspecto del original.

**Alternativas descartadas:** Freshman (gustó suelta, puesta quedaba demasiado ancha); College y
Graduate; repintar los números pequeños de la manga (salen cortados y curvados, quedaba peor).
Ojo: Jersey M54 es gratuita solo para uso personal; para uso comercial pide donación o licencia.

## [2026-10-13] — Equipación de flag: se pide a David (Phenix)

**Decisión:** los 24 conjuntos se encargan a David Young (Shenzhen Phenix): 504 USD ≈ 441 € con
envío, aranceles e IVA incluidos, 3-4 semanas.

**Motivo:** es el corte que más gusta, respondió a todo y corrigió los bocetos, y admite
reposiciones desde 3 conjuntos (20 USD cada uno más envío), que es lo que hace falta cuando entre
gente nueva.

**Alternativas descartadas:** Gloria (Normzl), 463 USD: la más barata, pero reposición mínima de
10 y no enseñó ninguna camiseta de fútbol hecha por ellos. Winnie (Kuzhida), 485,56 USD: sin
mínimo claro y con el envío caro en pedidos pequeños.

## [2026-10-13] — Playbook: generado con un script y con nombres de NFL Flag

**Decisión:** el playbook sale de `playbook/generar.py`, que dibuja formaciones y jugadas en SVG a
partir de coordenadas y genera a la vez la versión A4 (`playbook.html`, a PDF con Chrome) y la del
móvil (`playbook-movil.html`, publicada como artifact privado). Formaciones con los nombres de NFL
Flag: Spread, Twins, Trips, Bunch y Trips Stacked. Sin RB, quarterback siempre en shotgun y un solo
audible, "Blanco".

**Motivo:** el playbook de 2016-2017 era un PDF que no se podía editar y cada cambio obligaba a
redibujar. Con los nombres de NFL Flag, lo que se ve en su web y lo que se canta en el campo es lo
mismo.

**Alternativas descartadas:** editar el PDF antiguo; mantener sus nombres (Wins, Close) y sus
formaciones con RB en el backfield; audibles distintos para carrera y pase.

## [2026-10-14] — Hamburgueserías: "la hamburguesería del equipo", sin pedir visita

**Decisión:** a las hamburgueserías se les ofrece ser "la hamburguesería del equipo" (cenas de
equipo y celebraciones), no "nuestro sitio después de los partidos". Los DM terminan con "si os
apetece ser nuestros patrocinadores, escribidnos" y no ofrecen ir al local ni mandar el dossier; el
PDF solo va en los correos o cuando contestan.

**Motivo:** el tercer tiempo ya es de O'Culto ("Nos vemos en Panaderas 26 después de cada
jornada"). Ofrecer visitas o el dossier sin que lo pidan suena insistente.

**Alternativas descartadas:** el texto genérico del 26/09 ("nuestro sitio después de entrenos y
partidos", "¿nos pasamos un día?"). Se descartan las cadenas que deciden fuera de Coruña; La Pepita
entra porque sus locales de Coruña los lleva un franquiciado local.

## [2026-10-15] — Equipación: 12 conjuntos de cada aunque seamos 10

**Decisión:** el pedido a David (Phenix) se mantiene en 12 local + 12 visitante (504 USD ≈ 441 €)
aunque la plantilla inicial sea de 10 jugadores. Los gastos se reparten entre los 10: ≈ 148 € por
persona sin árbitros (desglose en `pendiente.md`).

**Motivo:** que quien se apunte durante la temporada pueda jugar desde el primer día. Una
reposición cuesta 20 USD por conjunto más envío, con un mínimo de 3, y tarda 3-4 semanas.

**Alternativas descartadas:** pedir solo 10 de cada (≈ 368 €, 141 €/persona), que ahorra unos 7 €
por persona pero deja sin camiseta a cualquier alta nueva.

## [2026-10-15] — Cuota de jugador: 170 €

**Decisión:** la cuota de la temporada es de 170 € por jugador. Con 10 jugadores y el patrocinio de
500 € entran 2.200 €; los gastos fijos son ≈ 1.481 € y quedan ≈ 719 € de margen.

**Motivo:** los árbitros de local están sin cerrar (30 € por partido y árbitro, más dieta y
kilometraje si vienen de Asturias) y faltan la licencia de staff y la cuenta del club. Es más fácil
devolver lo que sobre que pedir una derrama a mitad de liga.

**Alternativas descartadas:** 150 € (≈ 519 € de margen) y 100-120 €, que con el patrocinio cubren
lo fijo pero dejan poco o nada para los árbitros.

## [2026-10-16] — El documento de identidad lo sube cada jugador a un almacén privado

**Decisión:** cada jugador sube desde Mi ficha la cara y el dorso de su documento y la foto
de carnet. Van al bucket privado `identidad` de Supabase (una carpeta por ficha, tres nombres
fijos, solo JPEG de hasta 3 MB). Quien lleva Documentos lo ve todo, lo baja en un ZIP con un
CSV y lo borra cuando la federación ya lo tiene.

**Motivo:** las copias llegaban por WhatsApp y había que guardarlas y renombrarlas a mano. La
protección la ponen las políticas de `storage.objects` (`30_identidad.sql`), no la interfaz,
como el resto de los datos delicados. Se habla de "documento" y no de DNI porque el
reglamento de FEFAPA (art. 27) admite DNI, NIE y pasaporte, y hay jugadores de Erasmus.

**Detalles:** imágenes y no PDF, porque una imagen vale en cualquier portal y se convierte
después si hace falta. El reglamento no dice qué formato pide LEVERADE. El ZIP se hace en el
navegador sin librería, porque los JPEG no se comprimen más. Las casillas "en papel" se
mantienen para lo que llegue por otro lado.

## [2026-10-16] — "Ya he pagado": el jugador avisa y tesorería valida

**Decisión:** el jugador avisa desde Mi ficha de que ha pagado la cuota. El aviso va a su propia
tabla (`pagos_avisados`) y no cuenta como cobrado: a tesorería le suena el móvil, lo comprueba en
la cuenta y lo valida o lo rechaza. Validar inserta un pago normal, y la cuota pasa a al día sola
porque `cuotas_estado` se calcula a partir de los pagos.

**Motivo:** si el botón del jugador apuntara el pago directamente, cualquiera podría ponerse al día
sin pagar. Nadie escribe en la tabla: todo va por funciones que comprueban quién llama
(`31_pago_avisado.sql`). El jugador no puede mandar notificaciones, y no debe; para el aviso a
tesorería hay una función que le da solo los móviles de tesorería, con el texto escrito en la base
de datos y una vez por aviso. La función `enviar-push` la usa sin pedir la llave de avisos.

**Detalles:** un aviso pendiente por cuota; si vuelve a avisar, se corrige el que había. Tesorería
puede cambiar el importe al validar. Las notificaciones no llevan importes, como el resto, porque
salen en la pantalla bloqueada. De paso, el documento y la foto subidos desde la app ya cuentan
como entregados en Hoy y en el menú del staff: antes solo contaba la casilla que marcaba el staff.

## [2026-10-16] — Auditoría de la app: cada sección ve solo lo que necesita

**Decisión:** la ficha entera de un jugador (correo, fecha de nacimiento, número de documento)
la leen solo admin, roster y documentos. Las demás secciones trabajan con la vista
`plantilla_club`, que lleva nombre, dorsal, posiciones, estado, teléfono y talla. Las notas del
staff salen de las filas del jugador y pasan a `notas_ficha` (roster) y `notas_documentacion`
(documentos). Las fuentes se sirven desde `app/fonts/`.

**Motivo:** auditoría del 16 de octubre (`docs/auditoria-app-2026-10-16.md`). Con la app ya en
manos del equipo y el número del documento guardado en la ficha, cualquiera con una llave
(material, tienda…) podía sacar desde la API los datos personales de toda la plantilla, y cada
jugador las notas que el club escribía sobre él. No se veía en pantalla, pero la regla del
proyecto es que lo protege Postgres, no la interfaz.

**Detalles:** el teléfono se queda en la vista porque tesorería lo usa para el WhatsApp de la
cuota. Disponibilidad pasa a calcularse en la base de datos: antes, quien lleva el calendario sin
llevar documentos veía a todos como no aptos. En el alta, si la fecha de nacimiento es de un
menor de 14 años, aparecen los datos del tutor y el consentimiento es suyo (LOPDGDD art. 7). El
texto de la subida del documento dice para qué es, quién lo ve, cuándo se borra y a quién
escribir (RGPD art. 13).

## [2026-10-18] — Playbook: jugadas con nombre propio y 5 jugadas nuevas

**Decisión:** cada jugada se llama por su ruta o concepto clave, no por formación y número: Fly
Out, In, Slant Go, Dagger, Doble Pase, Read Option (Spread); Doble Post, Choice, Silla, Mesh
(Twins); Flood, Cruce, Delay (Trips); Tijera, Out Cruzado, Doble Corner (Bunch); Slant Swing (Trips
Stacked). Las jugadas nuevas salen siempre de una de nuestras formaciones, con sus mismas
posiciones; si la original viene de otra colocación se lleva a la más parecida y, si hace falta,
se cambian las letras de los receptores sin tocar las rutas. Las jugadas con motion, laterales o
ruta del QB se dibujan con `jugada_libre()` en `generar.py`; flechas rojas discontinuas para snap y
laterales.

**Motivo:** "Spread 1" no dice nada de la jugada y en el campo se confunde. Con el nombre de la
ruta clave se recuerda qué hay que hacer.

**Alternativas descartadas:** nombres temáticos del mar (Marea, Kraken…); quitar una ruta del Mesh
Spot para que quepa en 5 contra 5 (se quedó fuera el Spot); la jugada con H en el backfield.

## [2026-10-18] — Playbook en la app, y público en la web

**Decisión:** el playbook vuelve al repositorio y la app lo enseña en Equipo → Playbook, una
formación cada vez. `playbook/generar.py` escribe `app/js/playbook-datos.js` con los mismos dibujos
que el PDF; el service worker lo guarda para usarlo sin cobertura. El PDF queda en
corunaatlantics.com/playbook/playbook.pdf y la app lo enlaza.

**Motivo:** con los datos en un archivo estático, actualizar es ejecutar el script y subir. Que
sea público se asume: en flag 5 contra 5 el riesgo es pequeño y las jugadas de NFL Flag ya lo son.

**Alternativas descartadas:** tabla en Supabase con permisos (privado, pero obliga a pegar SQL en
cada cambio); subida automática con la clave de servicio guardada en local.

## [2026-10-18] — Defensa: el sistema de los Ducs, y números de call para todo

**Decisión:** la defensa del playbook es la de los Ducs (playbook 2025), con sus nombres de cobertura
(Rocco, Jonas, Simon, Ramone, Salomé, Bunch, Joachim, Valhalla), sus posiciones (CS, CW, J, S, R) y
sus alineaciones tal cual. En la wristband y la playsheet cada call lleva número: ataque por formación
en decenas (11-16 Spread, 21-24 Twins, 31-33 Trips, 41-43 Bunch, 51 Trips Stacked) y defensa de una
cifra (1-5 zona, 6-8 hombre), para que no se confundan entre sí ni con la estructura de la cobertura
(22, 31…), que solo sale en el playbook. La wristband tiene tres ventanas y la de arriba es una
carátula que tapa las jugadas.

**Motivo:** un sistema ya probado y explicado por su autora, en vez de inventarlo. Los números
permiten mandar el call desde la banda.

**Alternativas descartadas:** ponerles nombres propios a las coberturas; una sola alineación de zona
para todas; repartir las jugadas de ataque en dos ventanas Spread + Twins / resto (no se leían).

## [2026-10-20] — Cuentas de la temporada rehechas: 90 € más por jugador

**Decisión:** se rehace el presupuesto del 15 de octubre (1.481 € de gastos fijos, 719 € de margen),
que contaba las licencias a 15 € por jugador. Desde el 17 de octubre se sabe que cada jugador necesita
además la licencia de FEFA con seguro (Flag Senior, 125 €). Con 9 jugadores:

- **Gastos fijos ≈ 2.591 €:** inscripción FEFAPA 400, fianza 100 (se recupera), licencia de club FEFA
  300, licencias FEFAPA 135 (9 × 15), licencias FEFA con seguro 1.125 (9 × 125), equipación ≈ 441 y
  material de local ≈ 90. Con los árbitros de las 3 jornadas de local (≈ 270 €), **≈ 2.861 €**.
- **Ingresos 3.888 €:** 9 cuotas de 170 € (1.530), patrocinio de ROJO 500, patrocinio de Artabro
  1.008 (388 ya cobrados y 620 más el 20 oct), una equipación suelta 40 y **90 € más por jugador** (810).
- **Margen ≈ 1.027 €** (≈ 1.127 € con la fianza devuelta), para dietas de árbitros, licencia de staff
  (85 €), partes de accidente (30 € cada uno) y la cuenta del banco.

Los 90 € se cobran aunque con el último patrocinio ya no hagan falta para lo fijo (sin ellos
quedarían ≈ 217 €). Lo que sobre sirve para ayudar a quien no pueda pagar su parte.

La cuota la pagan todos, también quien ha adelantado gastos, y lo adelantado (la licencia de club,
300 €) se devuelve aparte, para no mezclar cuota y reembolso.

**Motivo:** el extra se pidió antes de llegar el patrocinio de 620 €, cuando sin él faltaban ≈ 403 €.
Se mantiene por la misma razón que la cuota de 170: es más fácil devolver lo que sobre que pedir otra
derrama a mitad de liga, y un colchón deja ayudar a un compañero sin tocar las cuentas.

**Alternativas descartadas:** bajar o anular el extra tras el patrocinio (217 € de margen, poco para
dietas y licencia de staff); pedir solo los ≈ 45 € justos; descontar la cuota de quien adelantó gastos
de lo que se le debe, que lía las cuentas.
