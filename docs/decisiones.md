# Decisiones — Coruña Atlantics

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
