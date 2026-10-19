# -*- coding: utf-8 -*-
"""Genera playbook.html (A4, para imprimir) con el formato del club.

Contenido: capítulos 1 a 4 a partir del Playbook original del club (reglas,
posiciones, formaciones y rutas) y capítulo 5 con jugadas adaptadas de NFL FLAG.
Todos los diagramas están redibujados en SVG.
Uso: python generar.py   ->   playbook.html en esta carpeta.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
ESCUDO = "../circular%20sin%20fondo.png"
TRIDENTE = "../tridente%20sin%20fondo.png"

TEAL, GOLD, INK = "#006E82", "#D4A843", "#040d12"

# ------------------------------------------------------------------ SVG

def jugador(x, y, letra="", tipo="o"):
    """o = jugador, c = center (cuadrado), q = quarterback (dorado)."""
    txt = ""
    if letra:
        size = 9 if len(letra) > 1 else 11
        txt = (f'<text x="{x}" y="{y + 3.8}" font-family="Barlow Condensed, sans-serif" '
               f'font-weight="700" font-size="{size}" text-anchor="middle" fill="{INK}">{letra}</text>')
    if tipo == "c":
        forma = (f'<rect x="{x - 8}" y="{y - 8}" width="16" height="16" rx="2" fill="#fff" '
                 f'stroke="{INK}" stroke-width="1.8"/>')
    else:
        relleno = GOLD if tipo == "q" else "#fff"
        forma = f'<circle cx="{x}" cy="{y}" r="8" fill="{relleno}" stroke="{INK}" stroke-width="1.8"/>'
    return forma + txt


def trazo(d, punteado=False, fin="flecha"):
    dash = ' stroke-dasharray="4 3"' if punteado else ""
    marca = f' marker-end="url(#{fin})"' if fin else ""
    return (f'<path d="{d}" fill="none" stroke="{TEAL}" stroke-width="2.6" stroke-linejoin="round" '
            f'stroke-linecap="round"{dash}{marca}/>')


def formacion(jugadores):
    """Campo de 25 yd de ancho visto desde atrás del ataque. jugadores: [(x, y, letra, tipo)]."""
    s = ['<svg viewBox="0 0 300 104" class="fig-form">',
         '<rect x="0" y="0" width="300" height="104" rx="4" fill="#eef6f7"/>',
         f'<line x1="12" y1="8" x2="12" y2="96" stroke="{TEAL}" stroke-width="1.4" opacity=".55"/>',
         f'<line x1="288" y1="8" x2="288" y2="96" stroke="{TEAL}" stroke-width="1.4" opacity=".55"/>']
    for i in range(1, 11):
        y = 8 + i * 8
        s.append(f'<line x1="12" y1="{y}" x2="17" y2="{y}" stroke="{TEAL}" stroke-width=".8" opacity=".45"/>')
        s.append(f'<line x1="283" y1="{y}" x2="288" y2="{y}" stroke="{TEAL}" stroke-width=".8" opacity=".45"/>')
    s.append(f'<line x1="12" y1="40" x2="288" y2="40" stroke="{GOLD}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    s.append(f'<text x="282" y="35" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="8" '
             f'text-anchor="end" fill="#8a6a1c" letter-spacing="1">LOS</text>')
    for j in jugadores:
        s.append(jugador(*j))
    s.append('</svg>')
    return "".join(s)


def ruta(contenido, vb="0 0 120 90"):
    return f'<svg viewBox="{vb}" class="fig-ruta">{contenido}</svg>'


def etiqueta(x, y, texto, size=9, color=None, ancla="middle"):
    color = color or TEAL
    return (f'<text x="{x}" y="{y}" font-family="Barlow Condensed, sans-serif" font-weight="700" '
            f'font-size="{size}" text-anchor="{ancla}" fill="{color}">{texto}</text>')


def campo():
    e = 6.4                      # unidades por yarda
    x0, y0 = 10, 10
    X = lambda yd: round(x0 + yd * e, 1)
    Y = lambda yd: round(y0 + yd * e, 1)
    s = [f'<svg viewBox="0 0 548 246" class="fig-campo">']
    # zona de seguridad
    s.append(f'<rect x="{X(0)}" y="{Y(0)}" width="{76 * e}" height="{31 * e}" fill="none" stroke="{TEAL}" '
             f'stroke-width="1" stroke-dasharray="5 4" opacity=".6"/>')
    # end zones y campo
    s.append(f'<rect x="{X(3)}" y="{Y(3)}" width="{10 * e}" height="{25 * e}" fill="#cfe9ec"/>')
    s.append(f'<rect x="{X(63)}" y="{Y(3)}" width="{10 * e}" height="{25 * e}" fill="#cfe9ec"/>')
    s.append(f'<rect x="{X(13)}" y="{Y(3)}" width="{5 * e}" height="{25 * e}" fill="#f6ecd2"/>')
    s.append(f'<rect x="{X(58)}" y="{Y(3)}" width="{5 * e}" height="{25 * e}" fill="#f6ecd2"/>')
    s.append(f'<rect x="{X(3)}" y="{Y(3)}" width="{70 * e}" height="{25 * e}" fill="none" stroke="{INK}" stroke-width="2"/>')
    for yd in (13, 38, 63):
        s.append(f'<line x1="{X(yd)}" y1="{Y(3)}" x2="{X(yd)}" y2="{Y(28)}" stroke="{INK}" stroke-width="2"/>')
    for yd in (18, 58):
        s.append(f'<line x1="{X(yd)}" y1="{Y(3)}" x2="{X(yd)}" y2="{Y(28)}" stroke="{INK}" stroke-width="2" stroke-dasharray="7 5"/>')
    for yd in (25, 51):          # marca de la yarda 12 (punto extra de 2)
        s.append(f'<line x1="{X(yd)}" y1="{Y(14.5)}" x2="{X(yd)}" y2="{Y(16.5)}" stroke="{INK}" stroke-width="2"/>')
    def vertical(yd, texto, size=11):
        cx, cy = X(yd), Y(15.5)
        return (f'<text x="{cx}" y="{cy}" transform="rotate(-90 {cx} {cy})" font-family="Barlow Condensed, sans-serif" '
                f'font-weight="700" font-size="{size}" text-anchor="middle" dominant-baseline="middle" '
                f'fill="{TEAL}" letter-spacing="2">{texto}</text>')
    s.append(vertical(8, "END ZONE", 13))
    s.append(vertical(68, "END ZONE", 13))
    s.append(vertical(15.5, "NO RUNNING", 9))
    s.append(vertical(60.5, "NO RUNNING", 9))
    s.append(etiqueta(X(38), Y(2.1), "MEDIO CAMPO", 8))
    # cotas
    yc = Y(31) + 12
    cortes = [0, 3, 13, 18, 38, 58, 63, 73, 76]
    for a in cortes:
        s.append(f'<line x1="{X(a)}" y1="{yc - 4}" x2="{X(a)}" y2="{yc + 4}" stroke="{INK}" stroke-width="1"/>')
    s.append(f'<line x1="{X(0)}" y1="{yc}" x2="{X(76)}" y2="{yc}" stroke="{INK}" stroke-width="1"/>')
    for a, b in zip(cortes, cortes[1:]):
        s.append(etiqueta((X(a) + X(b)) / 2, yc + 15, f"{b - a} yd", 9, INK))
    xc = X(76) + 12
    for a in (0, 3, 28, 31):
        s.append(f'<line x1="{xc - 4}" y1="{Y(a)}" x2="{xc + 4}" y2="{Y(a)}" stroke="{INK}" stroke-width="1"/>')
    s.append(f'<line x1="{xc}" y1="{Y(0)}" x2="{xc}" y2="{Y(31)}" stroke="{INK}" stroke-width="1"/>')
    for a, b in ((0, 3), (3, 28), (28, 31)):
        s.append(etiqueta(xc + 7, (Y(a) + Y(b)) / 2 + 3, f"{b - a} yd", 9, INK, "start"))
    s.append('</svg>')
    return "".join(s)


# formaciones (x: 67 = a 5 yd de la banda izquierda, 233 = a 5 yd de la derecha)
def espejo(jugadores):
    return [(300 - x, y, letra, tipo) for x, y, letra, tipo in jugadores]

_CQ = [(150, 40, "C", "c"), (150, 88, "Q", "q")]   # QB siempre en shotgun, a 6 yd
# Nomenclatura de NFL Flag: X, Y, Z. Versión Derecha; la Izquierda es el espejo.
_SPREAD = [(67, 44, "X", "o"), (200, 56, "Y", "o"), (233, 44, "Z", "o")] + _CQ
_TWINS = [(131, 44, "X", "o"), (186, 56, "Y", "o"), (206, 44, "Z", "o")] + _CQ
_TRIPS = [(170, 44, "X", "o"), (196, 44, "Y", "o"), (226, 44, "Z", "o")] + _CQ
_BUNCH = [(131, 44, "X", "o"), (169, 44, "Y", "o"), (188, 44, "Z", "o")] + _CQ
_TRIPS_STACKED = [(197, 56, "X", "o"), (213, 44, "Y", "o"), (229, 56, "Z", "o")] + _CQ
F_SPREAD_D, F_SPREAD_I = formacion(_SPREAD), formacion(espejo(_SPREAD))
F_TWINS_D, F_TWINS_I = formacion(_TWINS), formacion(espejo(_TWINS))
F_TRIPS_D, F_TRIPS_I = formacion(_TRIPS), formacion(espejo(_TRIPS))
F_BUNCH_D, F_BUNCH_I = formacion(_BUNCH), formacion(espejo(_BUNCH))
F_STACKED_D, F_STACKED_I = formacion(_TRIPS_STACKED), formacion(espejo(_TRIPS_STACKED))

# árbol de rutas básicas (receptor a la derecha del center)
ARBOL = ('<svg viewBox="0 0 220 170" class="fig-arbol">'
         + trazo("M110 142 L110 88", fin="")
         + trazo("M110 88 L36 88") + trazo("M110 88 L184 88")
         + trazo("M110 88 L64 42") + trazo("M110 88 L156 42")
         + trazo("M110 88 L110 18") + trazo("M110 88 L119 101", fin="tope")
         + etiqueta(24, 92, "1", 15) + etiqueta(196, 92, "3", 15)
         + etiqueta(55, 36, "4", 15) + etiqueta(165, 36, "6", 15)
         + etiqueta(110, 12, "5", 15) + etiqueta(129, 112, "2", 15)
         + jugador(110, 150)
         + etiqueta(14, 160, "← center", 9, "#5b6a70", "start")
         + etiqueta(206, 160, "banda →", 9, "#5b6a70", "end")
         + '</svg>')

R_SLANT = ruta(trazo("M30 74 L30 62 L58 46") + trazo("M90 74 L90 62 L116 47")
               + jugador(30, 78) + jugador(60, 78, "QB", "q") + jugador(90, 78)
               + etiqueta(28, 54, "IN", 8, ancla="end") + etiqueta(86, 54, "OUT", 8, ancla="end"), "0 0 124 90")
R_CBFLY = ruta(trazo("M60 72 L60 46", True, "") + trazo("M60 46 L66 55", fin="tope") + trazo("M60 46 L60 10")
               + jugador(60, 78))
R_FLYCB = ruta(trazo("M60 72 L60 48", True, "") + trazo("M60 48 L60 12 L67 23", fin="tope") + jugador(60, 78))
R_FADE = ruta(trazo("M52 76 C72 72 82 54 82 12") + jugador(48, 78))
R_SILLA = ruta(trazo("M50 72 L50 46 L84 46 L84 12") + jugador(50, 78))
R_CORNERPOST = ruta(trazo("M36 72 L36 52 L20 36 L84 12") + jugador(36, 78) + jugador(92, 78, "QB", "q"))
R_POSTCORNER = ruta(trazo("M76 72 L76 52 L60 36 L112 12") + jugador(76, 78) + jugador(26, 78, "QB", "q"))
R_WHIPOUT = ruta(trazo("M76 72 L76 36 L67 33 L76 30 L112 30") + jugador(76, 78) + jugador(28, 78, "QB", "q"))
R_WHIPIN = ruta(trazo("M42 72 L42 36 L33 33 L42 30 L82 30") + jugador(42, 78) + jugador(92, 78, "QB", "q"))
R_OVER = ruta(trazo("M36 70 C36 34 66 22 108 22") + jugador(36, 78))
R_DRAG = ruta(trazo("M86 70 L86 56 L40 56") + jugador(34, 74, "C", "c") + jugador(86, 78))
R_REVERSE = ruta(trazo("M36 44 C54 68 84 72 106 62") + jugador(32, 36) + jugador(82, 36, "QB", "q"))

# ------------------------------------------------------------------ páginas

paginas = []   # (cabecera, html)


def pag(cabecera, html):
    paginas.append((cabecera, html))


def cap(n, titulo):
    return f'<div class="cap"><span>Capítulo {n}</span><h1>{titulo}</h1></div>'


def figura(svg, pie):
    return f'<figure>{svg}<figcaption>{pie}</figcaption></figure>'


def tarjeta(titulo, texto, svg, num=None):
    n = f'<i>{num}</i>' if num is not None else ""
    return (f'<div class="tarjeta"><div class="t-fig">{svg}</div>'
            f'<div class="t-txt"><h4>{titulo}{n}</h4><p>{texto}</p></div></div>')


# --- 1: dedicatoria e índice
pag("Índice", """
<div class="dedicatoria">
  <p>Dedicado a cada una de las personas<br>que dieron y dan sentido a este proyecto.</p>
  <p>Mención especial a David Paredes y Víctor Tenreiro.<br>Gracias por tanto.</p>
</div>
<h2>Índice</h2>
<ol class="indice">
  <li class="n1"><span>1. Introducción</span><b>2</b></li>
  <li><span>1.1. Introducción</span><b>2</b></li>
  <li><span>1.2. Mecánica de juego</span><b>2</b></li>
  <li><span>1.3. Puntuación</span><b>3</b></li>
  <li><span>1.4. Faltas y penalizaciones</span><b>3</b></li>
  <li><span>1.5. Campo reglamentario</span><b>5</b></li>
  <li><span>1.6. Equipación en Gameday</span><b>6</b></li>
  <li class="n1"><span>2. Posiciones</span><b>7</b></li>
  <li><span>2.1. Posiciones de ataque</span><b>7</b></li>
  <li><span>2.2. Posiciones de defensa</span><b>7</b></li>
  <li class="n1"><span>3. Formaciones</span><b>8</b></li>
  <li><span>3.1. Spread D/I</span><b>8</b></li>
  <li><span>3.2. Twins D/I</span><b>8</b></li>
  <li><span>3.3. Trips D/I</span><b>9</b></li>
  <li><span>3.4. Bunch D/I</span><b>9</b></li>
  <li><span>3.5. Trips Stacked D/I</span><b>9</b></li>
  <li><span>3.6. Cambios de formación</span><b>10</b></li>
  <li><span>3.7. Audibles</span><b>10</b></li>
  <li class="n1"><span>4. Cortes, rutas y movimientos</span><b>11</b></li>
  <li><span>4.1. Cortes</span><b>11</b></li>
  <li><span>4.2. Lista de rutas</span><b>11</b></li>
  <li class="n1"><span>5. Jugadas</span><b>14</b></li>
  <li><span>5.1. Spread</span><b>14</b></li>
  <li><span>5.2. Twins</span><b>16</b></li>
  <li><span>5.3. Trips</span><b>17</b></li>
  <li><span>5.4. Bunch</span><b>18</b></li>
  <li><span>5.5. Trips Stacked</span><b>19</b></li>
  <li class="n1"><span>6. Defensa</span><b>20</b></li>
  <li><span>6.1. Posiciones</span><b>20</b></li>
  <li><span>6.2. Alineaciones</span><b>20</b></li>
  <li><span>6.3. Coberturas</span><b>22</b></li>
</ol>
""")

# --- 2
pag("1 · Introducción", cap(1, "Introducción") + """
<h2>1.1. Introducción</h2>
<p>Cada jugada comienza con el balón situado por los árbitros en el centro de la <b>Línea de Scrimmage</b> (<i>LoS</i>), la línea que marca el avance a lo largo del campo conseguido hasta ahora. Existen cuatro <b>downs</b> (<i>intentos</i>) para alcanzar la línea de mitad del campo, momento en que se consigue un «<i>primer down</i>». Entre cada jugada, los árbitros toman el balón y lo colocan en la nueva línea de scrimmage a la altura de donde acabó la jugada anterior, aplicando penalizaciones por faltas si es necesario.</p>
<p>Una vez alcanzado el centro del campo, comienza un nuevo set de cuatro intentos, esta vez para alcanzar la zona de anotación rival (<i>End Zone</i>). Si no se consigue un primer down o una anotación en esos cuatro intentos, el balón pasará al equipo rival, que lo recibirá en su propia yarda 5.</p>
<p>El objetivo del ataque es, por tanto, avanzar la máxima distancia posible (medida en yardas, <i>1 yd = 0,9 m</i>), y el de la defensa es impedírselo para recuperar la posesión del balón. Cada equipo cuenta con 5 jugadores sobre el campo en todo momento, pudiéndose efectuar sustituciones siempre que se quiera estando la pelota muerta (no en juego).</p>

<h2>1.2. Mecánica de juego</h2>
<p>Antes de cada jugada se formará un <b>huddle</b> (<i>«corro» de jugadores</i>) en el que el QB informa a los demás de la formación y jugada a realizar, cerciorándose de que el mensaje está claro para todos antes de romperlo y colocarse en sus puestos.</p>
<p>Es absolutamente vital para todos los jugadores:</p>
<ul class="lista">
  <li><b>Memorizar el libro de jugadas</b> a emplear por el equipo e interiorizar su papel en cada una de ellas, de forma que su ejecución se realice mecánicamente, sin necesidad de pensar en lo que se va a hacer, y concentrándose únicamente en cumplir su papel lo mejor posible.</li>
  <li><b>Respetar las rutas e indicaciones</b>, sin excepción, establecidas para la jugada, sin «innovar». Un espacio fuera de la ruta que parece libre para recibir puede ser el espacio que se disponía a ocupar un compañero en mejor posición. Incluso aunque en un momento dado aparezca una opción mejor, el QB no tiene por qué haberlo visto o compartir la opinión, lo cual llevará a fallos de sincronización, errores y mal funcionamiento del ataque.</li>
</ul>
<div class="nota"><b>Un jugador que no conoce o no respeta su papel en cada jugada es un jugador que no sirve para Coruña Atlantics.</b> Duro, pero justo. Esto sirve tanto para jugadas y rutas en ataque como para asignaciones y esquemas defensivos.</div>
""")

# --- 3
pag("1 · Introducción", """
<h2>1.3. Puntuación</h2>
<p>Hay diferentes formas de conseguir puntos en un partido:</p>
<div class="puntos">
  <div><b>6</b><span>Touchdown</span><p>Cada vez que un jugador atraviesa la <b>goal line</b> (<i>línea de anotación</i>) del rival teniendo el balón en la mano, o bien recibe un pase estando dentro de la zona de anotación.</p></div>
  <div><b>1</b><span>Punto extra</span><p>Acto seguido, el equipo anotador hace un nuevo intento de alcanzar la end zone rival. Si elige hacerlo <b>desde 5 yardas</b> (lo más común), valdrá un punto adicional.</p></div>
  <div><b>2</b><span>Punto extra</span><p>Si opta por hacerlo <b>desde 12 yardas</b>, se le sumarán dos puntos.</p></div>
  <div><b>2</b><span>Safety</span><p>Placar (quitar el flag) a un jugador atacante en posesión del balón estando este en su propia end zone.</p></div>
</div>

<h2>1.4. Faltas y penalizaciones</h2>
<p>El contacto que se penaliza en flag es el contacto que implica movimiento o impacto contra el jugador contactado. Es decir, <b>tocar a un jugador no es ilegal, pero tocar y desplazarlo o golpearle sí</b>. Es importante entender que, en caso de que exista contacto con impacto o desplazamiento, existirá siempre falta de uno, otro o los dos jugadores implicados.</p>
<h3>Faltas en ataque</h3>
<p class="def"><b>Salida falsa / false start · 5 yd</b> Estando en sus posiciones, uno o más jugadores del equipo atacante hacen un movimiento hacia delante brusco que pueda provocar la reacción de la defensa. Falta relativamente común cuando se intenta provocar la salida prematura del blitzer con un doble hut y los receptores no están concentrados en la cadencia del snap.</p>
<p class="def"><b>Movimiento ilegal / illegal motion · 5 yd</b> No está permitido que haya más de 1 jugador a la vez en motion (un shift requiere que después de terminar el ataque esté 1 segundo parado).</p>
<p class="def"><b>Snap ilegal · 5 yd</b> El movimiento del snap debe ser un movimiento único y continuo y que termine con el balón en el aire o con el QB recogiendo el balón.</p>
<p class="def"><b>Flag guarding · 5 yd desde el punto de falta</b> El corredor que lleva el balón no puede esconder el flag con la mano, brazo, balón o de cualquier forma que obstaculice el intento del defensor de retirarlo. Tampoco está permitido saltar verticalmente o lanzarse para ganar ventaja y que no lo pueda retirar el rival.</p>
<p class="def"><b>Pase ilegal adelantado · 5 yd y pérdida de down</b> El QB no puede hacer ningún pase por delante de la línea de scrimmage, ni cruzarla en posesión del balón.</p>
<p class="def"><b>Pase ilegal hacia atrás · 5 yd</b> Nadie puede pasar el balón, aunque sea hacia atrás, una vez pasada la línea de scrimmage.</p>
<p class="def"><b>Targeting / apuntar · 10 yd</b> No está permitido ir con el balón por delante para que el rival no pueda alcanzar a quitar el flag, así como correr con el torso inclinado o la cabeza por delante, por motivos de seguridad.</p>
""")

# --- 4
pag("1 · Introducción", """
<p>El corredor que lleva el balón no puede intentar pasar entre dos defensores que se encuentren ante él si no hay espacio razonablemente suficiente entre ellos para pasar sin chocar.</p>
<p class="def"><b>Contacto ilegal</b> No está permitido el contacto con impacto o desplazamiento. Hay que tener en cuenta las siguientes prioridades en cualquier caso.</p>
<h3>Prioridades de paso en las rutas</h3>
<ul class="lista">
  <li>El receptor tiene prioridad de paso en la ejecución de su ruta, salvo contra el blitzer.</li>
  <li>Nadie tiene prioridad de paso en el momento del corte. Si hay contacto, no se pita.</li>
  <li>Si un defensa está parado, el receptor tiene que esquivarlo siempre (derecho de estancia).</li>
</ul>
<h3>Faltas en defensa</h3>
<p>El contacto solo se permite en el momento exacto en el que el receptor hace el corte. Cualquier otra clase de contacto es falta con 10 yardas de penalización y primer down automático.</p>
<p class="def"><b>Encroachment / offside</b> Es ilegal si la defensa pasa la LoS antes del snap, o después si no está a 7 yardas antes del inicio de la jugada.</p>
<p class="def"><b>Blitz ilegal</b> En las jugadas en las que el blitzer, por despiste o por doble hut, dé un paso y esté a menos de 7 yardas en el momento del snap, si cruza la LoS es falta de la defensa (5 yardas).</p>
<p class="def"><b>Prioridad de paso del blitz</b> En el momento de hacer el blitz siempre tiene prioridad de paso hasta el punto de snap. Este punto es el lugar en el que el QB recibe el balón del center, perdiendo el blitzer toda prioridad si varía su dirección o se frena. Asimismo, el derecho de estancia de un jugador que esté parado prevalece sobre la prioridad del blitzer, algo que frecuentemente aprovechan los centers para obstaculizar al blitzer parándose tras el snap.</p>
<p>Si el blitzer está corriendo y se va a chocar contra un atacante, es importante intentar esquivarlo a pesar de tener prioridad (la falta será del atacante haya choque o no). Si los árbitros determinan que el blitzer podía haber evitado el contacto y no lo hizo, probablemente piten offsetting (repetición del down por doble falta) o incluso falta por contacto de la defensa (<b>10 yardas</b>).</p>
<p>Un jugador que salte verticalmente («<i>en el sitio</i>») para atrapar el balón tiene derecho de estancia sobre otro que salte hacia él, incurriendo este último en falta si los árbitros determinan que existe contacto suficiente.</p>
<p>En flag no hay pass interference como tal. Dicha falta es contacto ilegal y se penaliza de la misma forma.</p>
<h3>Faltas por conducta antideportiva</h3>
<p>Cualquier clase de insulto, amenaza, diálogo con el público, violencia o conducta antideportiva en general conlleva 10 yardas de penalización al equipo que la realiza, esté la pelota en juego o no. En caso de 2 faltas de un mismo jugador por dichas conductas, el jugador será expulsado del campo y sancionado con al menos un partido. Desde el cuerpo técnico pueden aplicarse sanciones adicionales a los que realicen dichas infracciones.</p>
""")

# --- 5 y 6
pag("1 · Introducción", """
<h2>1.5. Campo reglamentario</h2>
<h3>Obligaciones del delegado de campo</h3>
<ul class="lista">
  <li>Acudir al campo una hora y cuarto antes del comienzo del partido.</li>
  <li>Solicitar las llaves de los vestuarios necesarios. Se necesitará un vestuario por equipo, otro vestuario para árbitros y ocasionalmente otro vestuario para chicas (en caso de que haya equipos mixtos).</li>
  <li>Recibir a los equipos y a los árbitros y guiarlos hasta su vestuario.</li>
  <li>Entregar las botellas de agua, que serán 10 litros por equipo y 1 litro (al menos) por árbitro.</li>
  <li>Marcar el campo durante el calentamiento de los equipos o incluso antes si es posible. Es fundamental que los partidos comiencen a su hora.</li>
  <li>Estar todo el tiempo a disposición de los árbitros para cualquier cosa que puedan necesitar.</li>
  <li>El delegado de campo nunca podrá entrar en las áreas de equipo (ni siquiera de su propio equipo).</li>
</ul>
<h3>Marcado del campo</h3>
""" + figura(campo(), "Figura 1.1 · Marcado de campo") + """
<div class="dos">
  <div>
    <h3>Medidas</h3>
    <ul class="lista">
      <li>Terreno de juego entre goal lines: <b>40 - 50 yardas</b>.</li>
      <li>End zones: <b>10 yardas</b> cada una entre goal line y end line; mínimo de <b>7 yardas</b> en campos con dimensiones reducidas.</li>
      <li>Entre sidelines: <b>25 - 30 yardas</b>.</li>
    </ul>
  </div>
  <div>
    <h3>Conos</h3>
    <ul class="lista">
      <li>8 para las end zones (y pylons): <b>naranjas</b>.</li>
      <li>4 en la yarda 5 de cada campo: <b>blancos</b>.</li>
      <li>4 en la yarda 12 de cada campo: <b>amarillos</b>.</li>
      <li>2 en la línea de medio campo: <b>azules</b>.</li>
    </ul>
  </div>
</div>
""")

# --- 7
pag("1 · Introducción", """
<h2>1.6. Equipación en Gameday</h2>
<p>Este checklist pretende incluir todo lo que es necesario revisar antes de un partido. No solamente aplica a jugadores, sino a todo el personal del equipo.</p>
<div class="dos">
  <div>
    <h3>Jugadores</h3>
    <ul class="check">
      <li>Primera camiseta oficial (<i>color turquesa</i>)</li>
      <li>Segunda camiseta oficial (<i>color blanco</i>)</li>
      <li>Pantalón oficial (<i>color negro</i>)</li>
      <li>Protector bucal (<i>no transparente ni tampoco blanco</i>)</li>
      <li>DNI y carnet de licencia FEFA</li>
      <li>Botas de tacos</li>
      <li>Quitarse pendientes, collares y pulseras</li>
      <li>Revisar playbook de ataque y defensa</li>
      <li>Asegurarse de la dirección del campo</li>
      <li>Asegurarse de a qué hora hay que estar en el campo</li>
      <li class="opc">Guantes <em>opcional</em></li>
      <li class="opc">Medias o calcetines de color negro <em>opcional</em></li>
      <li class="opc">Camiseta térmica de color negro <em>opcional</em></li>
      <li class="opc">Mallas de color negro <em>opcional</em></li>
      <li class="opc">Muñequera de jugadas QB <em>opcional</em></li>
      <li class="opc">Cámara de fotos o vídeo <em>opcional</em></li>
    </ul>
  </div>
  <div>
    <h3>Entrenadores</h3>
    <ul class="check">
      <li>Roster en papel con los jugadores convocados, incluyendo: nombre, apellidos, dorsal, nacionalidad, fecha de nacimiento, número de licencia, jugador normal o filial</li>
      <li>Lista de jugadas numeradas</li>
      <li>Designar encargado de material</li>
      <li>Designar 2 capitanes</li>
      <li>Asegurarse de la dirección del campo</li>
    </ul>
    <h3>Encargado de material</h3>
    <ul class="check">
      <li>10 flags amarillos</li>
      <li>3 balones iguales e hinchados que lleven el texto <b>ATLANTICS</b></li>
    </ul>
    <h3>Delegado de equipo</h3>
    <ul class="check">
      <li>Licencias de los jugadores</li>
      <li>Aportar las fichas de los miembros presentes de su equipo a los árbitros 30 minutos antes del comienzo del partido, así como mostrarles una de sus camisetas</li>
      <li>Velar por el buen comportamiento de su equipo tanto dentro como fuera del terreno de juego</li>
      <li>Firmar el acta en un plazo no superior a veinte minutos desde la finalización del encuentro</li>
    </ul>
  </div>
</div>
""")

# --- 8
pag("2 · Posiciones", cap(2, "Posiciones") + """
<h2>2.1. Posiciones de ataque</h2>
<p class="def"><b>Center (C)</b> Es el encargado de efectuar el <b>snap</b>, que da inicio a la jugada, en el momento en que el QB se lo indique con una señal. El snap debe ser siempre hacia atrás, y el QB lo recibirá siempre en <b>shotgun</b> (<i>por el aire, a 6,5 yd directamente detrás</i>). Una vez realizado el snap, el center es un receptor más, que por lo general realizará rutas cortas y «bloqueos» que estorben a la defensa rival.</p>
<p class="def"><b>Quarterback (QB)</b> Es el receptor del snap y el encargado de canalizar el juego de ataque del equipo. El jugador que recibe el snap comete falta si cruza la <b>LoS</b> con el balón en la mano. Por ello, la misión del QB es hacérselo llegar a sus compañeros, ya sea en la mano (<b>juego de carrera</b>) o por el aire (<b>juego de pase</b>). Desde que recibe el snap, tiene 7 segundos (más que suficientes) para soltar el balón.</p>
<p class="def"><b>Wide Receivers o receptores (WR)</b> Son los tres encargados de recibir los pases del QB (<b>X</b>, <b>Y</b> y <b>Z</b>). Comenzarán las jugadas en la <b>LoS</b>, en posiciones predeterminadas por la formación a utilizar, si bien en algunas ocasiones pueden participar en el juego de carrera.</p>

<h2>2.2. Posiciones de defensa</h2>
<p>Existen varios sistemas defensivos, cada uno con sus puntos fuertes y débiles, que requieren más o menos jugadores de cada posición, utilizándose defensas «<b>en zona</b>» y «<b>al hombre</b>». La defensa <b>«clásica»</b> es una <b>zona 2-1-2</b> que incorpora a dos Corner Backs, un Linebacker y dos Safeties:</p>
<p class="def"><b>Corner Backs</b> Son los encargados de defender las zonas del campo situadas a los lados, próximas a la <b>LoS</b>. Normalmente estarán pendientes de carreras y de rutas cortas de los receptores, «dejándoles pasar» en el momento en que alcanzan la zona controlada por los Safeties.</p>
<p class="def"><b>Safeties</b> Se sitúan por detrás de los Corner Backs, cubriendo pases medios-profundos a su zona asignada, así como sincronizándose para cubrir pases profundos a la zona central.</p>
<p class="def"><b>Linebacker</b> Se situará a 7 yd de la <b>LoS</b>, con la mano levantada y listo para efectuar un <b>blitz</b>, si bien en ocasiones no lo hará y permanecerá cubriendo la zona central de la defensa.</p>
<p>En el caso de una <b>defensa al hombre</b> convencional, se alinearán cuatro Corner Backs, cada uno de los cuales tendrá asignado un receptor rival al que cubrir, siguiendo sus movimientos allá donde vaya para impedirle recibir. Tras ellos se colocará un Safety en <b>Cover-1</b>, es decir, leyendo el desarrollo de la jugada para actuar donde sea necesario (normalmente, tratando de interceptar o bloquear un pase que vaya hacia un receptor rival).</p>
""")

# --- 8
pag("3 · Formaciones", cap(3, "Formaciones") + """
<p>Son la base de la que se parte para la realización de jugadas. En nuestro sistema muchas jugadas pueden realizarse desde varias formaciones, algo que contribuye a la imprevisibilidad de nuestro ataque. <b>La distribución de los receptores es lo que da nombre a las formaciones.</b></p>
<p>En todas ellas el <i>Quarterback (Q)</i> se colocará siempre en <b>shotgun</b>, a 6 yd del <i>Center (C)</i>, para recibir el snap por el aire.</p>
<p><b>D</b> o <b>I</b> indica el lado designado, derecha o izquierda: es el lado en el que se colocan <b>Y</b> y <b>Z</b>.</p>
<h2>3.1. Spread D/I</h2>
<p>Los tres receptores se abren a lo ancho del campo. <b>X</b> se coloca solo, en el lado contrario al designado, a 5 yd de la banda. En el lado designado se colocan <b>Z</b> (<i>receptor abierto</i>), a 5 yd de la banda, e <b>Y</b> (<i>receptor slot</i>), a 3 yd del Z y un par de pasos por detrás de la LoS.</p>
<div class="dos">
  <div>""" + figura(F_SPREAD_D, "Figura 3.1 · Spread Derecha") + """</div>
  <div>""" + figura(F_SPREAD_I, "Figura 3.2 · Spread Izquierda") + """</div>
</div>
<h2>3.2. Twins D/I</h2>
<p>Los cuatro jugadores que no son el QB forman dos parejas. <b>X</b> se coloca pegado al center, en el lado contrario al designado. En el lado designado se colocan <b>Z</b>, en la LoS a unas 5 yd del center, e <b>Y</b>, por dentro del Z y un par de pasos por detrás.</p>
<div class="dos">
  <div>""" + figura(F_TWINS_D, "Figura 3.3 · Twins Derecha") + """</div>
  <div>""" + figura(F_TWINS_I, "Figura 3.4 · Twins Izquierda") + """</div>
</div>
""")

pag("3 · Formaciones", """
<h2>3.3. Trips D/I</h2>
<p>Los tres receptores se colocan en la LoS en el lado designado: <b>X</b> junto al center, <b>Y</b> a unas 4 yd y <b>Z</b>, el más abierto, a unas 7 yd.</p>
<div class="dos">
  <div>""" + figura(F_TRIPS_D, "Figura 3.5 · Trips Derecha") + """</div>
  <div>""" + figura(F_TRIPS_I, "Figura 3.6 · Trips Izquierda") + """</div>
</div>
<h2>3.4. Bunch D/I</h2>
<p>Todos los receptores salen pegados al center en la LoS y se abren hacia su sitio en el snap: <b>X</b> a un lado del center, e <b>Y</b> y <b>Z</b>, uno junto al otro, en el lado designado. Sirve para amontonar a la defensa y que le cueste reaccionar.</p>
<div class="dos">
  <div>""" + figura(F_BUNCH_D, "Figura 3.7 · Bunch Derecha") + """</div>
  <div>""" + figura(F_BUNCH_I, "Figura 3.8 · Bunch Izquierda") + """</div>
</div>
<h2>3.5. Trips Stacked D/I</h2>
<p>Los tres receptores se colocan pegados en triángulo en el lado designado, a media distancia entre el center y la banda: <b>Y</b> en la LoS, con <b>X</b> por dentro y <b>Z</b> por fuera, medio paso por detrás.</p>
<div class="dos">
  <div>""" + figura(F_STACKED_D, "Figura 3.9 · Trips Stacked Derecha") + """</div>
  <div>""" + figura(F_STACKED_I, "Figura 3.10 · Trips Stacked Izquierda") + """</div>
</div>
""")

pag("3 · Formaciones", """
<h2>3.6. Cambios de formación</h2>
<p>Una vez que los jugadores se han colocado en la formación de ataque, cualquier movimiento brusco antes de que se realice el <b>snap</b> (comienzo de la jugada) puede causar que los árbitros piten <b>false start</b> (<i>salida falsa, que conlleva penalización en yardas</i>).</p>
<p class="def"><b>Shift</b> El acto de cambiar la formación se conoce como <b>shift</b>, y puede incluir desde la recolocación de un receptor hasta una redistribución de todos ellos. Los jugadores deben permanecer en su nueva posición al menos un segundo antes de que se dé el snap, para permitir a la defensa reorganizarse.</p>
<p class="def"><b>Motion</b> Si solo es un receptor el que se mueve, y lo hace a lo largo de la LoS a un paso de distancia (sin pasar al backfield), puede realizar un <b>motion</b>. Este movimiento tiene la peculiaridad de que permite dar el snap in motion (con el receptor en movimiento). Si el jugador llegara a pararse antes de que se dé el snap, se considerará un shift y habrá que esperar un segundo antes de poder comenzar la jugada.</p>
<p><b>Los motions se ordenarán previamente en el huddle</b> y los mandará el quarterback con <b>una señal, normalmente el primer color neutro (sin significado) que diga en la cadencia previa al snap</b>. En ambos casos, el receptor en cuestión deberá recorrer la LoS hacia el C. Si no se va a dar el snap in motion, se indicará previamente la posición final del receptor.</p>
<div class="claves">
  <div><b>Z</b><span>Zipi</span></div>
  <div><b>X</b><span>Xin</span></div>
</div>

<h2>3.7. Audibles</h2>
<p>Un audible es una señal auditiva que se da, por parte del quarterback o del entrenador, para cambiar la jugada establecida en el <b>huddle</b>. Se jugará con <b>no-huddle</b>, volviéndose tras cada jugada a la formación anterior e indicándose la jugada a realizar mediante audible.</p>
<p>Nunca se dirán los nombres de las jugadas, sino un «<i>código</i>» que puede consistir en una combinación de color y número, o bien una palabra clave. Frecuentemente, el QB dirá colores y números sin significado antes del snap, con el objetivo de confundir al equipo rival.</p>
<p>El sistema de audibles que utilizaremos usa un único color:</p>
<div class="claves">
  <div><b>Blanco</b><span>Cambio de jugada</span></div>
</div>
<p>Cada vez que el QB diga <b>Blanco</b> hay cambio de jugada, sin diferenciar entre jugada de pase y de carrera. El número que le siga indica la nueva jugada.</p>
""")

# --- 12
pag("4 · Cortes, rutas y movimientos", cap(4, "Cortes, rutas y movimientos") + """
<h2>4.1. Cortes</h2>
<p>Cada ruta lleva asociado un número y/o un nombre, para facilidad de referencia y memorización. <b>Es vital que las rutas se realicen exactamente como se especifica en el Playbook.</b> Las rutas incorporan cortes. Un <b>corte</b> es un cambio de dirección, lo más brusco posible, en ángulo, a partir del cual el receptor debe mirar al QB y prepararse para recibir el balón. Un <b>corte</b> realizado a la distancia equivocada provocará que el pase se quede corto o largo, mientras que un <b>corte</b> suave facilitará al defensor la cobertura.</p>
<p>Por defecto, los <b>cortes</b> se realizarán después de recorrer 5 yd en línea recta en todas nuestras jugadas, a no ser que se indique lo contrario. En el momento en que se hace el <b>corte</b>, nada más cambiar de dirección, hay que mirar al QB y prepararse para recibir. Hacer un <b>corte</b> seco y rápido que despiste al defensor, pero sin mirar, es completamente inútil.</p>
<h2>4.2. Lista de rutas</h2>
<div class="nota"><b>Nota:</b> para el <b>center</b>, ya que parte del centro del campo, por convenio se denominará <b>In y Post a los cortes hacia el lado izquierdo</b> del campo, y <b>Out y Corner a los cortes hacia el lado derecho</b>. Asimismo, en muchas jugadas el center se irá directamente hacia un lado nada más dar el snap, como ruta de seguridad.</div>
<h3>4.2.1. Rutas básicas</h3>
<div class="arbol">
  <figure>""" + ARBOL + """<figcaption>Figura 4.1 · Lista de rutas básicas</figcaption></figure>
  <div>
    <p class="ruta-n"><i>1</i><span><b>In</b> Corte en 90° acercándose al center.</span></p>
    <p class="ruta-n"><i>2</i><span><b>Comeback</b> Media vuelta en el sitio, extendiendo el cuerpo y los brazos hacia atrás para recibir.</span></p>
    <p class="ruta-n"><i>3</i><span><b>Out</b> Corte en 90° alejándose del center.</span></p>
    <p class="ruta-n"><i>4</i><span><b>Post</b> Corte en 45° acercándose a la línea central del campo. Llamado así por la posición de los postes en un campo de football.</span></p>
    <p class="ruta-n"><i>5</i><span><b>Fly</b> Cambio de ritmo para correr a máxima velocidad en línea recta, paralelo a la banda. También es un corte aunque no se cambie de dirección. Desde el momento del cambio de ritmo, hay que ser capaz de correr lo máximo posible al tiempo que se mira para ver venir el pase.</span></p>
    <p class="ruta-n"><i>6</i><span><b>Corner</b> Corte en 45° alejándose de la línea central del campo. Llamado así por dirigirse aproximadamente a la esquina del mismo.</span></p>
  </div>
</div>
""")

# --- 13
pag("4 · Cortes, rutas y movimientos", """
<h3>4.2.2. Rutas avanzadas</h3>
<div class="tarjetas">
""" + tarjeta("Slant", "Corte en 30° hacia la línea central tras dar dos pasos. Por ser una ruta muy corta, es aún más importante mirar y extender los brazos nada más cortar.", R_SLANT)
    + tarjeta("Comeback-Fly", "Corte compuesto de un Comeback seguido de un Fly. Dado que el pase puede llegar en el Comeback, es importante llegar a pararse completamente, mirar y extender los brazos para recibir. Si no ha llegado el pase, se arranca de nuevo en un Fly a máxima velocidad. El tiempo entre frenar, girarse y volver a arrancar no debe exceder 1 segundo. Un Comeback-Fly mal hecho es un Fly lento y es contraproducente.", R_CBFLY)
    + tarjeta("Fly-Comeback <small>First Down</small>", "Fly a 5 yd seguido de un Comeback, por defecto a 10 yd. La efectividad de esta ruta se basa en que parezca un Fly, por lo que es importante hacer un cambio de ritmo a las 5 yd, para luego frenarse en seco y girarse para el Comeback a la distancia indicada. El pase solo llegará en el Comeback.", R_FLYCB)
    + tarjeta("Fade", "Salida en diagonal hacia fuera, curvándose hasta salir recto paralelo a la banda. Ruta para pases profundos a WR.", R_FADE)
    + tarjeta("Silla", "Corte en 90° alejándose del center (Out), seguido de otro corte de 90° alejándose de la LoS (Fly). El pase puede llegar en el Out o en el Fly, por lo que hay que mirar en ambos cortes.", R_SILLA)
    + tarjeta("Corner-Post", "Amago de Corner en el que, tras recorrer 2-3 pasos, se cambia de dirección de nuevo para tomar la de un Post. A diferencia de la silla, el pase se lanzará solo al Post (el corte inicial es solo para despistar al defensor).", R_CORNERPOST)
    + """
</div>
""")

# --- 14
pag("4 · Cortes, rutas y movimientos", """
<div class="tarjetas">
""" + tarjeta("Post-Corner", "Amago de Post en el que, tras recorrer 2-3 pasos, se cambia de dirección de nuevo para tomar la de un Corner. A diferencia de la silla, el pase se lanzará solo al Corner (el corte inicial es solo para despistar al defensor).", R_POSTCORNER)
    + tarjeta("Whip-Out", "Amago de In en el que se da un paso en dirección hacia dentro, para inmediatamente girarse por completo y acabar en un Out. El giro se realizará siempre mirando hacia la LoS, para ver el lanzamiento del posible pase.", R_WHIPOUT)
    + tarjeta("Whip-In", "Amago de Out en el que se da un paso en dirección hacia fuera, para inmediatamente girarse por completo y acabar en un In. El giro se realizará siempre mirando hacia la LoS, para ver el lanzamiento del posible pase.", R_WHIPIN)
    + tarjeta("Over", "Salida hacia una banda de forma prolongada, haciendo una curva durante todo el recorrido hasta la posición final.", R_OVER)
    + tarjeta("Drag", "Tras dar dos pasos, corte de 90° acercándose al center. Es básicamente un In a lo largo de la LoS.", R_DRAG)
    + tarjeta("Reverse", "Ruta realizada por un WR en la que entra en el backfield desde la LoS, normalmente para recibir el balón y tener opción de carrera o de pase.", R_REVERSE)
    + """
</div>
""")

# ------------------------------------------------------------------ jugadas
# Adaptadas del playbook 5 contra 5 de NFL FLAG. Todas dibujadas a la derecha.
# Cada ruta es una lista de puntos (dx, dy) en yardas: dx respecto al jugador
# (positivo = derecha), dy respecto a la LoS (positivo = campo adelante).

COL = {"X": TEAL, "Y": "#C9992E", "Z": INK, "C": "#37B8AE", "Q": "#8a6a1c", "R": "#c0392b"}
UX, UY, LOS = 11.04, 8, 104
SALIDA = {
    "Spread": {"X": (67, 108), "Y": (200, 120), "Z": (233, 108)},
    "Twins": {"X": (131, 108), "Y": (186, 120), "Z": (206, 108)},
    "Trips": {"X": (170, 108), "Y": (196, 108), "Z": (226, 108)},
    "Bunch": {"X": (131, 108), "Y": (169, 108), "Z": (188, 108)},
    "Trips Stacked": {"X": (197, 120), "Y": (213, 108), "Z": (229, 120)},
}


def jugada_svg(form, rutas):
    pos = dict(SALIDA[form]); pos["C"] = (150, LOS)
    s = ['<svg viewBox="0 0 300 166" class="fig-jugada">',
         '<rect x="0" y="0" width="300" height="166" rx="4" fill="#eef6f7"/>',
         f'<line x1="12" y1="6" x2="12" y2="160" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>',
         f'<line x1="288" y1="6" x2="288" y2="160" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>']
    for yd in (5, 10):
        y = LOS - yd * UY
        s.append(f'<line x1="12" y1="{y}" x2="288" y2="{y}" stroke="{TEAL}" stroke-width=".7" opacity=".28"/>')
        s.append(f'<text x="16" y="{y - 2}" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="7" fill="#5b6a70">{yd} yd</text>')
    s.append(f'<line x1="12" y1="{LOS}" x2="288" y2="{LOS}" stroke="{GOLD}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    for k in ("C", "X", "Y", "Z"):
        puntos, fin = rutas[k]
        sx, sy = pos[k]
        d = f"M{sx} {sy} " + " ".join(f"L{round(sx + dx * UX, 1)} {round(LOS - dy * UY, 1)}" for dx, dy in puntos)
        s.append(f'<path d="{d}" fill="none" stroke="{COL[k]}" stroke-width="2.4" stroke-linejoin="round" '
                 f'stroke-linecap="round" marker-end="url(#{fin}-{k})"/>')
    for k in ("X", "Y", "Z"):
        x, y = pos[k]
        s.append(f'<circle cx="{x}" cy="{y}" r="7.5" fill="#fff" stroke="{COL[k]}" stroke-width="2.2"/>'
                 f'<text x="{x}" y="{y + 3.6}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="10.5" text-anchor="middle" fill="{INK}">{k}</text>')
    s.append(f'<rect x="142.5" y="{LOS - 7.5}" width="15" height="15" rx="2" fill="#fff" stroke="{COL["C"]}" stroke-width="2.2"/>'
             f'<text x="150" y="{LOS + 3.6}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="10.5" text-anchor="middle" fill="{INK}">C</text>')
    s.append(jugador(150, LOS + 6 * UY, "Q", "q"))
    s.append('</svg>')
    return "".join(s)


def jugada_libre(jug, rutas, extra=""):
    """Dibujo con trazos en coordenadas del campo, para jugadas con motion, laterales o ruta del QB.
    jug: {letra: (x, y)}. rutas: (letra, d) con flecha; (letra, d, "motion") discontinua sin flecha;
    ("R", d, x, y, texto) flecha roja discontinua con su etiqueta (snap, lateral)."""
    s = ['<svg viewBox="0 0 300 166" class="fig-jugada">',
         '<rect x="0" y="0" width="300" height="166" rx="4" fill="#eef6f7"/>',
         f'<line x1="12" y1="6" x2="12" y2="160" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>',
         f'<line x1="288" y1="6" x2="288" y2="160" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>']
    for yd in (5, 10):
        y = LOS - yd * UY
        s.append(f'<line x1="12" y1="{y}" x2="288" y2="{y}" stroke="{TEAL}" stroke-width=".7" opacity=".28"/>')
        s.append(f'<text x="16" y="{y - 2}" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="7" fill="#5b6a70">{yd} yd</text>')
    s.append(f'<line x1="12" y1="{LOS}" x2="288" y2="{LOS}" stroke="{GOLD}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    for r in rutas:
        k, d = r[0], r[1]
        if k == "R":
            x, y, txt = r[2:]
            s.append(f'<path d="{d}" fill="none" stroke="{COL[k]}" stroke-width="1.6" stroke-dasharray="3 3" stroke-linecap="round" marker-end="url(#flecha-R)"/>'
                     f'<text x="{x}" y="{y}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="8" text-anchor="middle" fill="{COL[k]}">{txt}</text>')
        elif len(r) > 2:
            s.append(f'<path d="{d}" fill="none" stroke="{COL[k]}" stroke-width="2.4" stroke-dasharray="5 4" stroke-linecap="round"/>')
        else:
            s.append(f'<path d="{d}" fill="none" stroke="{COL[k]}" stroke-width="2.4" stroke-linejoin="round" '
                     f'stroke-linecap="round" marker-end="url(#flecha-{k})"/>')
    s.append(extra)
    for k, (x, y) in jug.items():
        if k == "C":
            s.append(f'<rect x="{x - 7.5}" y="{y - 7.5}" width="15" height="15" rx="2" fill="#fff" stroke="{COL[k]}" stroke-width="2.2"/>')
        elif k == "Q":
            s.append(f'<circle cx="{x}" cy="{y}" r="8" fill="{GOLD}" stroke="{INK}" stroke-width="1.8"/>')
        else:
            s.append(f'<circle cx="{x}" cy="{y}" r="7.5" fill="#fff" stroke="{COL[k]}" stroke-width="2.2"/>')
        s.append(f'<text x="{x}" y="{y + 3.6}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="10.5" text-anchor="middle" fill="{INK}">{k}</text>')
    s.append('</svg>')
    return "".join(s)


# Cada jugada queda apuntada aquí, por nombre, para exportarla a la app.
REGISTRO = {}


def jugada(nombre, form, rutas, nombres, texto, lado="Derecha", svg=None):
    svg = svg or jugada_svg(form, rutas)
    REGISTRO[nombre] = {"nombre": nombre, "lado": lado, "svg": svg, "texto": texto,
                        "rutas": [[k, GOLD if k == "Q" else COL[k], v] for k, v in nombres.items()]}
    lista = "".join(f'<li><i style="background:{GOLD if k == "Q" else COL[k]}"></i><b>{k}</b><span>{v}</span></li>' for k, v in nombres.items())
    return (f'<div class="jugada"><div class="j-fig">{svg}</div>'
            f'<div class="j-txt"><h4>{nombre} <small>{form} {lado}</small></h4><ul class="j-rutas">{lista}</ul><p>{texto}</p></div></div>')


F, T = "flecha", "tope"
C_CORTO = ([(1.2, 1.5), (7, 1.5)], F)      # out corto del center hacia la derecha

J_SPREAD_1 = jugada("Fly Out", "Spread", {
    "X": ([(0, 6.5), (3, 10.5)], F), "Y": ([(0, 5), (5.5, 5)], F),
    "Z": ([(1.2, 1.5), (1.2, 11)], F), "C": C_CORTO},
    {"X": "Post", "Y": "Out a 5 yd", "Z": "Fly, con finta de salida", "C": "Out corto a la derecha"},
    "Para cuando la defensa flojea por la derecha. Z finta a su defensor y sale en Fly para llevarse la cobertura al fondo. Y hace un Out a 5 yardas hacia la banda derecha y ocupa el hueco que deja Z; el center también empuja hacia ese lado, en corto. Si la defensa se vuelca a la derecha, X queda libre en el Post.")

J_SPREAD_2 = jugada("In", "Spread", {
    "X": ([(0, 5), (-3.3, 5)], F), "Y": ([(0, 7.5), (-4.5, 7.5)], F),
    "Z": ([(0, 8.5), (-3, 11.3)], F), "C": C_CORTO},
    {"X": "Out a 5 yd", "Y": "In a 7 yd", "Z": "Post", "C": "Out corto a la derecha"},
    "Para cuando la defensa flojea por la izquierda. X hace un Out rápido hacia la banda izquierda y arrastra a la defensa a ese lado. Eso abre el In de Y y el Post de Z para ganar muchas yardas. Si toda la defensa se va a la izquierda, el center sale en Out corto a la derecha.")

J_BUNCH_1 = jugada("Tijera", "Bunch", {
    "C": ([(-0.6, 2), (-0.6, 8), (2, 10.8)], F), "Y": ([(0, 8), (-2.8, 10.8)], F),
    "X": ([(0, 2), (5, 2), (10, 4.5)], F), "Z": ([(0, 3.3), (-6.5, 3.3)], F)},
    {"X": "Cruce corto a la derecha", "Y": "Corner a la izquierda", "Z": "Cruce a la izquierda a 3 yd", "C": "Corner a la derecha"},
    "Jugada avanzada: conviene fijar quién sale primero para no chocar, y ensayarla antes de usarla. El center e Y hacen Corners cruzados y obligan a la defensa a recular. Por debajo, X y Z cruzan en corto a distinta altura, así que hay opción de pase corto y de pase largo.")

J_BUNCH_2 = jugada("Out Cruzado", "Bunch", {
    "X": ([(0, 7.3), (-2, 10.8)], F), "Z": ([(0, 7.3), (2, 10.8)], F),
    "Y": ([(0, 2), (-3.3, 5), (-10, 5)], F), "C": ([(0, 1.5), (10, 4.5)], F)},
    {"X": "Corner", "Y": "Out a la izquierda a 5 yd", "Z": "Corner", "C": "Out a la derecha"},
    "Versión más sencilla de la anterior. X y Z hacen Corners y se llevan a la defensa hacia atrás y hacia fuera. Con ese espacio abierto, Y y el center se cruzan y salen en Out hacia la línea de 5 yardas, cada uno a un lado.")

J_BUNCH_3 = jugada("Doble Corner", "Bunch", {
    "X": ([(0, 8), (-2, 10.8)], F), "Y": ([(0, 8), (2.2, 10.8)], F),
    "Z": ([(0, 5), (5.5, 5)], F), "C": ([(0, 5), (-10, 5)], F)},
    {"X": "Corner a 7 yd", "Y": "Corner a 7 yd", "Z": "Out a 5 yd", "C": "Out a 5 yd a la izquierda"},
    "La idea es que la defensa se enrede en el centro y luego abrirse a distintos puntos del campo. X e Y corren 7 yardas y cortan en Corner: son la opción para ganar muchas yardas. Z y el center hacen Out a 5 yardas hacia las bandas, que quedan libres cuando la defensa recula.")

J_TRIPS_1 = jugada("Flood", "Trips", {
    "C": ([(0, 5), (1.6, 9.5), (4.5, 9.5)], F), "X": ([(0, 6.2), (-1.5, 5), (1.8, 5)], F),
    "Y": ([(0, 3), (2, 5), (5, 5)], F), "Z": ([(0.6, 1.5), (0.6, 10.5)], F)},
    {"X": "Option a 5 yd", "Y": "Out a 5 yd, saliendo en diagonal", "Z": "Fly", "C": "Corner"},
    "Los receptores acaban a distintas profundidades, para poder elegir la longitud del pase. X hace una Option a 5 yardas, cortando un poco hacia la banda. Y sale en diagonal y hace Out a 5 yardas. Z hace Fly. El center suelta el balón y sale en Corner.")

J_TRIPS_2 = jugada("Cruce", "Trips", {
    "C": ([(0, 5), (5.5, 5)], F), "X": ([(0, 2.3), (-7, 2.3)], F),
    "Y": ([(0, 8), (5, 10.5)], F), "Z": ([(0.6, 1.5), (0.6, 10.5)], F)},
    {"X": "Cruce corto a la izquierda", "Y": "Corner a 7 yd", "Z": "Fly", "C": "Corte a la derecha a 5 yd"},
    "También escalona a los receptores, pero añade un cruce para pillar a la defensa mirando a la derecha. Z hace Fly e Y Corner a 7 yardas. X cruza en corto hacia la izquierda y el center corta a 5 yardas. Con la defensa pendiente de las rutas largas de la derecha, el receptor que cruza a la izquierda suele quedar libre.")

J_TRIPS_3 = jugada("Delay", "Trips", {
    "C": ([(0, 5), (-6.5, 5)], F), "X": ([(-1.2, 5), (-0.6, 3), (1.6, 3.2)], F),
    "Y": ([(0, 8), (2.6, 10.6)], F), "Z": ([(0, 9), (-3, 8.6)], F)},
    {"X": "Option: amaga izquierda, rompe derecha", "Y": "Corner largo", "Z": "Comeback a 9 yd", "C": "Out a 5 yd, con retraso"},
    "Jugada de engaño. Z hace un Comeback a unas 9 yardas e Y un Corner largo: dos opciones profundas si hace falta el primer down. X hace una Option a unas 5 yardas, amagando a la izquierda y rompiendo a la derecha. La defensa acaba siguiéndole y el center queda solo en un Out a 5 yardas. El center debe esperar un par de segundos antes de salir.")

J_TWINS_1 = jugada("Doble Post", "Twins", {
    "Z": ([(0, 6.5), (2.2, 8.5), (-3.5, 11.3)], F), "Y": ([(0, 6.3), (-4.5, 9.7)], F),
    "X": ([(0, 1.8), (9, 2.3)], F), "C": ([(0, 1.3), (-7, 4.6)], F)},
    {"X": "In corto", "Y": "Post", "Z": "Post, con amago hacia fuera", "C": "Out corto a la izquierda"},
    "Y y Z hacen Posts a distinta profundidad y atraen a la defensa hacia el centro. Entonces X y el center hacen rutas rápidas y cortas: X hacia dentro y el center hacia fuera. Hay que estar listo para un pase rápido; es ideal para cerrar las pocas yardas que falten para el primer down.")

J_TWINS_2 = jugada("Choice", "Twins", {
    "Z": ([(1.5, 1.5), (1.5, 10.7)], F), "Y": ([(0, 3.5), (1.3, 5), (6, 5)], F),
    "X": ([(-3, 3.3), (-3, 10.7)], F), "C": ([(0, 7), (-1.4, 5.2), (2.8, 5)], F)},
    {"X": "Slant y Fly", "Y": "Out a 5 yd", "Z": "Fly", "C": "Option"},
    "Z hace Fly, Y un Out a 5 yardas y X un Slant que continúa en Fly. Las tres rutas vacían el centro del campo y dejan un pase rápido al center, que hace una Option.")

J_TWINS_3 = jugada("Silla", "Twins", {
    "Z": ([(0, 6.8), (-3.5, 11)], F), "Y": ([(0, 5), (6, 5), (6, 10.7)], F),
    "X": ([(0, 5.2), (-2, 10.7)], F), "C": ([(0, 5), (-5, 5)], F)},
    {"X": "Corner", "Y": "Silla (Out y Fly)", "Z": "Post", "C": "Out a 5 yd"},
    "Z hace Post e Y una Silla. X hace Corner y el center sale en Out a 5 yardas. La Silla es especialmente efectiva porque tiene dos cambios de dirección en vez de uno.")

J_STACKED_1 = jugada("Slant Swing", "Trips Stacked", {
    "Y": ([(0, 2), (-5, 5.2)], F), "Z": ([(0, 2), (-5, 5.2)], F),
    "X": ([(1, -2.5), (2.5, -2.7), (4, -2.4), (5.3, -1.6), (6.3, -0.4), (6.8, 1.3)], F),
    "C": ([(0, 5), (-5, 5)], F)},
    {"X": "Swing hacia la banda", "Y": "Slant", "Z": "Slant", "C": "Out a 5 yd a la izquierda"},
    "Jugada rápida. Y y Z, los dos receptores más abiertos, cortan en Slant hacia dentro y se llevan a sus defensores al centro. X, el más interior, sale en Swing por detrás de ellos hacia la banda, que queda vacía. Primera lectura, el Slant que quede libre; si la defensa se cierra, pase al Swing, con espacio para correr.")

# --- jugadas añadidas en octubre de 2026 (dibujo libre: motion, laterales o ruta del QB)

J_DOBLE_PASE = jugada("Doble Pase", "Spread", None, {
    "X": "Motion por detrás de la línea de derecha a izquierda y sube por la banda (Wheel)",
    "Y": "Vertical a 9 yd y Corner a la derecha",
    "Z": "Corto hacia dentro y cruce hacia la derecha",
    "C": "Tras el snap va hacia atrás en vez de hacia delante; recibe el balón del QB y decide a quién lanzar",
    "Q": "Recibe el snap, sale hacia la derecha y se la lanza al center"},
    "Snap normal al QB. El center, en vez de salir hacia delante, va hacia atrás y el QB se la lanza ahí. Desde ese momento el center decide a quién lanzar con el resto de rutas: X, Y o Z.",
    lado="Izquierda", svg=jugada_libre(
        {"Z": (67, 108), "Y": (100, 120), "C": (150, LOS), "X": (233, 108), "Q": (152, 138)},
        [("Z", "M67 100 L67 90 Q70 81 88 79 L200 58"),
         ("Y", "M100 112 L100 27 L164 7"),
         ("X", "M227 112 C150 120, 95 118, 68 113 C45 102, 30 76, 27 40"),
         ("C", "M146 111 L96 150"),
         ("Q", "M160 139 L234 147"),
         ("R", "M150 112 L152 129", 163, 124, "SNAP"),
         ("R", "M176 143 L106 151", 150, 159, "LATERAL")]))

J_SLANT_GO = jugada("Slant Go", "Spread", None, {
    "X": "Out a 5 yd a la izquierda", "Y": "Vertical abriéndose a la derecha",
    "Z": "Slant largo hasta el centro y sube (Slant and Go)", "C": "Out a 5 yd a la derecha"},
    "X y el center salen en Out a 5 yardas, cada uno hacia una banda, e Y sube abriéndose a la derecha. Z hace un Slant largo hasta el centro y sube: es quien recibe el pase.",
    svg=jugada_libre(
        {"X": (67, 108), "C": (150, LOS), "Y": (200, 120), "Z": (233, 108), "Q": (150, 152)},
        [("X", "M67 100 L67 66 L24 66"),
         ("C", "M150 96 L152 62 L241 62"),
         ("Y", "M200 112 C200 70, 220 50, 222 11"),
         ("Z", "M228 103 L145 70 L132 21")]))

J_DAGGER = jugada("Dagger", "Spread", None, {
    "X": "Hitch a 5 yd", "Y": "Seam: vertical por la costura",
    "Z": "Dig: vertical a 10 yd y corta hacia dentro", "C": "Flat hacia la izquierda"},
    "Y en Seam se lleva al safety hacia arriba y deja hueco por debajo para el Dig de Z. X y el center son las opciones cortas si la defensa se va al fondo.",
    svg=jugada_libre(
        {"X": (67, 108), "C": (150, LOS), "Y": (200, 120), "Z": (233, 108), "Q": (150, 152)},
        [("X", "M67 100 L67 62 L72 68"),
         ("C", "M144 100 C130 96, 110 94, 85 92"),
         ("Y", "M200 112 L200 10"),
         ("Z", "M233 100 L233 26 L180 26")]))

BALON = ('<g transform="translate(140 127) rotate(-30)"><ellipse rx="6" ry="3.6" fill="#7a3e1d" stroke="#fff" stroke-width="1"/>'
         '<line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#fff" stroke-width=".9"/></g>'
         '<text x="140" y="142" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="8" text-anchor="middle" fill="#7a3e1d">OPTION</text>')

J_READ_OPTION = jugada("Read Option", "Spread", None, {
    "X": "Recibe el snap y le lanza el balón a Z; al cruzarse con Z hacen la option",
    "Y": "Vertical",
    "Z": "Motion por detrás de la línea hacia la derecha; recibe el balón de X y, al cruzarse con él, hacen la option",
    "C": "Vertical profundo",
    "Q": "Sale hacia la derecha"},
    "Jugada de carrera. El snap va directo a X, que cruza por detrás de la línea hacia la izquierda mientras Z viene en motion hacia la derecha. X le lanza el balón a Z y, al cruzarse, X y Z hacen la option. Y y el center suben rectos y profundos.",
    lado="Izquierda", svg=jugada_libre(
        {"Z": (67, 108), "Y": (100, 120), "C": (150, LOS), "X": (233, 108), "Q": (150, 152)},
        [("R", "M204 114 L114 119", 232, 122, "LATERAL"),
         ("R", "M159 105 L222 107", 187, 99, "SNAP"),
         ("C", "M150 96 L150 10"),
         ("Y", "M100 112 C 103 72, 108 45, 108 26"),
         ("X", "M227 112 C 180 124, 100 112, 26 28"),
         ("Z", "M73 112 C 95 119, 115 122, 150 122", "motion"),
         ("Z", "M150 122 C 185 122, 210 124, 238 127"),
         ("Q", "M158 151 C 185 150, 205 145, 228 138")], BALON))

J_MESH = jugada("Mesh", "Twins", None, {
    "X": "Cruce corto hacia la derecha (Mesh)", "Y": "Wheel: sale hacia la banda derecha y sube por ella",
    "Z": "Cruce corto hacia la izquierda, cruzándose con X (Mesh)", "C": "Post"},
    "X y Z se cruzan en corto (Mesh), Y hace la Wheel por la banda derecha y el center el Post.",
    svg=jugada_libre(
        {"X": (131, 108), "C": (150, LOS), "Y": (186, 120), "Z": (206, 108), "Q": (150, 152)},
        [("X", "M131 100 L134 82 L262 80"),
         ("Z", "M206 100 L203 90 L38 88"),
         ("Y", "M193 120 C228 122, 258 106, 263 78 L263 10"),
         ("C", "M150 96 L150 56 L120 16")]))


def forma(num, nombre, fig, n):
    """Cabecera de cada formación en el capítulo 5: banda oscura con nombre, dibujo y número de jugadas."""
    return (f'<div class="forma"><div class="f-txt"><span>5.{num} · Formación</span><h2>{nombre}</h2>'
            f'<b>{n} jugada{"s" if n != 1 else ""}</b></div><div class="f-fig">{fig}</div></div>')


pag("5 · Jugadas", cap(5, "Jugadas") + """
<p>Jugadas adaptadas del playbook 5 contra 5 de NFL FLAG y de otros equipos, agrupadas por formación: cada formación empieza en una página nueva. Salvo que se indique lo contrario, están dibujadas hacia la derecha; al otro lado se juegan en espejo. La línea dorada es la LoS y las líneas finas marcan las 5 y las 10 yardas. Las flechas rojas discontinuas son el snap y los laterales; la línea discontinua sin flecha es un motion.</p>
""" + forma(1, "Spread", F_SPREAD_D, 6) + """
<div class="jugadas">""" + J_SPREAD_1 + J_SPREAD_2 + """</div>
""")

pag("5 · Jugadas · Spread", """
<div class="jugadas">""" + J_SLANT_GO + J_DAGGER + J_DOBLE_PASE + J_READ_OPTION + """</div>
""")

pag("5 · Jugadas · Twins", forma(2, "Twins", F_TWINS_D, 4) + """
<div class="jugadas">""" + J_TWINS_1 + J_TWINS_2 + J_TWINS_3 + J_MESH + """</div>
""")

pag("5 · Jugadas · Trips", forma(3, "Trips", F_TRIPS_D, 3) + """
<div class="jugadas">""" + J_TRIPS_1 + J_TRIPS_2 + J_TRIPS_3 + """</div>
""")

pag("5 · Jugadas · Bunch", forma(4, "Bunch", F_BUNCH_D, 3) + """
<div class="jugadas">""" + J_BUNCH_1 + J_BUNCH_2 + J_BUNCH_3 + """</div>
""")

pag("5 · Jugadas · Trips Stacked", forma(5, "Trips Stacked", F_STACKED_D, 1) + """
<div class="jugadas">""" + J_STACKED_1 + """</div>
""")

# ------------------------------------------------------------------ capítulo 6: defensa
# Sistema de defensa de los Ducs (playbook de defensa 2025), con sus alineaciones
# y sus coberturas tal cual, traducido y con las aclaraciones de su autora.
# Mismo campo que las jugadas: el ataque abajo, en gris; la defensa con
# triángulos de colores y las zonas sombreadas con el color de su defensor.

DCOL = {"CS": "#006E82", "CW": "#37B8AE", "J": "#C9992E", "S": "#040d12", "R": "#c0392b"}
DNOMBRE = {"CS": "Corner Strong", "CW": "Corner Weak", "J": "Joker", "S": "Safety", "R": "Rusher"}
GRIS = "#8a9ba1"

# Profundidades de salida (en yardas desde la LoS) y líneas de las zonas
Y55, Y7, Y85 = LOS - 5.5 * UY, LOS - 7 * UY, LOS - 8.5 * UY
CORTO, FONDO, LINEA = LOS - 8 * UY, 3, LOS - 2      # corto/profundo a unas 8 yd

# El ataque de referencia, como lo dibujan los Ducs
AT_NORMAL = {"WR": (45, 108), "WS": (98, 108), "C": (150, LOS), "WR ": (257, 108), "QB": (150, 152)}
AT_TRIPS = {"WR": (45, 108), "WS": (81, 108), "WR ": (117, 108), "C": (150, LOS), "QB": (150, 152)}
AT_BUNCH = {"WR": (106, 108), "WS": (128, 108), "C": (150, LOS), "WR ": (172, 108), "QB": (150, 152)}

ALINEACIONES = {
    "Zona clásica": (AT_NORMAL, {"CS": (78, Y55), "CW": (244, Y55), "J": (198, Y7), "S": (62, Y85), "R": (137, Y7)}),
    "Zona variante": (AT_NORMAL, {"CS": (78, Y55), "CW": (197, Y55), "J": (244, Y7), "S": (112, Y85), "R": (137, Y7)}),
    "Zona trips": (AT_TRIPS, {"CS": (67, Y55), "CW": (165, Y55), "J": (136, Y7), "S": (58, Y85), "R": (103, Y7)}),
    "Hombre a hombre": (AT_NORMAL, {"S": (58, Y85), "J": (112, Y7), "CS": (165, Y55), "CW": (244, Y55), "R": (137, Y7)}),
    "Bunch": (AT_BUNCH, {"CS": (93, Y55), "CW": (187, Y55), "S": (115, Y7), "R": (137, Y7), "J": (165, Y7)}),
}


def rect(x1, x2, y1=LINEA, y2=CORTO):
    return f"M{x1} {y1} L{x2} {y1} L{x2} {y2} L{x1} {y2} z"


def defensa_svg(alineacion, zonas=(), flechas=()):
    ataque, defensores = ALINEACIONES[alineacion]
    s = ['<svg viewBox="0 0 300 166" class="fig-jugada">',
         '<rect x="0" y="0" width="300" height="166" rx="4" fill="#eef6f7"/>',
         f'<line x1="12" y1="2" x2="12" y2="164" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>',
         f'<line x1="288" y1="2" x2="288" y2="164" stroke="{TEAL}" stroke-width="1.4" opacity=".45"/>']
    for k, d in zonas:
        s.append(f'<path d="{d}" fill="{DCOL[k]}" fill-opacity=".14" stroke="{DCOL[k]}" stroke-opacity=".55" '
                 f'stroke-width="1" stroke-dasharray="3 2" stroke-linejoin="round"/>')
    for yd in (5, 7, 10):
        y = LOS - yd * UY
        s.append(f'<line x1="12" y1="{y}" x2="288" y2="{y}" stroke="{TEAL}" stroke-width=".6" opacity=".25"/>')
        s.append(f'<text x="16" y="{y - 2}" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="7" fill="#5b6a70">{yd} yd</text>')
    s.append(f'<line x1="12" y1="{LOS}" x2="288" y2="{LOS}" stroke="{GOLD}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    for k, d in flechas:
        s.append(f'<path d="{d}" fill="none" stroke="{DCOL[k]}" stroke-width="2.2" stroke-linecap="round" marker-end="url(#flecha-d{k})"/>')
    for k, (x, y) in ataque.items():
        t = k.strip()
        if t == "C":
            s.append(f'<rect x="{x - 7}" y="{y - 7}" width="14" height="14" rx="2" fill="#fff" stroke="{GRIS}" stroke-width="1.6"/>')
        else:
            s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="#fff" stroke="{GRIS}" stroke-width="1.6"/>')
        s.append(f'<text x="{x}" y="{y + 2.6}" font-family="Barlow Condensed, sans-serif" font-weight="700" '
                 f'font-size="{7 if len(t) > 1 else 8.5}" text-anchor="middle" fill="{GRIS}">{t}</text>')
    for k, (x, y) in defensores.items():   # triángulo con la punta hacia el ataque
        s.append(f'<path d="M{x - 9} {y - 7} L{x + 9} {y - 7} L{x} {y + 8} z" fill="{DCOL[k]}" stroke="#fff" stroke-width="1"/>'
                 f'<text x="{x}" y="{y + 0.5}" font-family="Barlow Condensed, sans-serif" font-weight="700" '
                 f'font-size="{7 if len(k) > 1 else 8.5}" text-anchor="middle" fill="#fff">{k}</text>')
    s.append('</svg>')
    return "".join(s)


# Número de call de cada cobertura en la wristband y la playsheet: de un dígito,
# para que no se confunda con las jugadas de ataque (11-51) ni con la estructura (22, 31...).
DNUM = {"Rocco": 1, "Jonas": 2, "Simon": 3, "Ramone": 4, "Salomé": 5, "Bunch": 6, "Joachim": 7, "Valhalla": 8}

# Coberturas y alineaciones apuntadas por nombre, para la wristband y la playsheet.
COBERTURAS, ALINEACIONES_FICHA = {}, {}


def ficha_def(nombre, sub, svg, lineas, notas=""):
    (ALINEACIONES_FICHA if sub == "Alineación" else COBERTURAS)[nombre] = {
        "nombre": nombre, "sub": sub, "svg": svg, "lineas": lineas, "notas": notas}
    lista = "".join(f'<li><i style="background:{DCOL[k]}"></i><b>{k}</b><span>{v}</span></li>' for k, v in lineas.items())
    return (f'<div class="jugada"><div class="j-fig">{svg}</div><div class="j-txt"><h4>{nombre} <small>{sub}</small></h4>'
            f'<ul class="j-rutas">{lista}</ul>{notas}</div></div>')


def debil(punto, solucion):
    return f'<p class="debil"><b>Punto débil</b> {punto}</p><p class="solucion"><b>Solución</b> {solucion}</p>'


RUSH = "M137 55 L148 141"                      # del rusher al QB

# --- alineaciones
A_CLASICA = ficha_def("Zona clásica", "Alineación", defensa_svg("Zona clásica"), {
    "CS": "Centro interior entre WR y WS, a 5-6 yd", "CW": "Hombro interior del WR, a 5-6 yd",
    "J": "Centro interior entre WR y C, a 7 yd", "S": "Centro exterior entre WS y WR, a 8-9 yd",
    "R": "Frente al brazo fuerte del QB, a 7 yd"})
A_VARIANTE = ficha_def("Zona variante", "Alineación", defensa_svg("Zona variante"), {
    "CS": "Como en la zona clásica", "CW": "Centro interior entre WR y C, a 5-6 yd",
    "J": "Hombro interior del WR, a 7 yd", "S": "Hombro interior del WS, a 8-9 yd",
    "R": "Como en la zona clásica"})
A_TRIPS = ficha_def("Zona trips", "Alineación", defensa_svg("Zona trips"), {
    "CS": "Hombro exterior del WS, a 5-6 yd", "CW": "Hombro exterior del C, a 5-6 yd",
    "J": "Entre el WR y el C, a 7 yd", "S": "Hombro interior del WR, a 8-9 yd",
    "R": "Hombro exterior del WR, a 7 yd"},
    '<p>Contra trips el rusher sale lejos del QB: primero molesta las rutas y luego va a por el QB.</p>')
A_HOMBRE = ficha_def("Hombre a hombre", "Alineación", defensa_svg("Hombre a hombre"), {
    "CS": "Hombro «exterior» del C, a 5-6 yd", "CW": "Hombro interior del WR, a 5-6 yd",
    "J": "Hombro interior del WS, a 7 yd", "S": "Hombro interior del WR, a 8-9 yd",
    "R": "Frente al brazo fuerte del QB, a 7 yd"})
A_BUNCH = ficha_def("Bunch", "Alineación", defensa_svg("Bunch"), {
    "CS": "Hombro exterior del WR, a 5-6 yd", "CW": "Hombro exterior del WR, a 5-6 yd",
    "J": "Entre C y WR, a 7 yd", "S": "Entre el WR y el WS, a 7 yd", "R": "Lado fuerte, a 7 yd"})

# --- coberturas de zona
D_ROCCO = ficha_def("Rocco", "Cobertura 22 · Zona clásica", defensa_svg("Zona clásica",
    zonas=[("CS", rect(14, 146)), ("S", rect(14, 146, CORTO, FONDO)),
           ("J", f"M146 {LINEA} L176 {LINEA} L176 {CORTO} L255 {CORTO} L255 {FONDO} L146 {FONDO} z"),
           ("CW", f"M176 {LINEA} L286 {LINEA} L286 {FONDO} L255 {FONDO} L255 {CORTO} L176 {CORTO} z")],
    flechas=[("R", RUSH)]), {
    "CS": "Corto", "CW": "Corto exterior y profundo exterior", "J": "Corto centro y profundo",
    "S": "Profundo", "R": "Rush al QB"},
    '<p>La más habitual. El CW tiene prioridad sobre el WR: si corre un Fly, se va con él; si no, se queda en la zona corta. '
    'Así el J protege el fondo con prioridad en el centro, y aún puede cubrir una ruta profunda del WR, como un Post.</p>'
    + debil("Caso 1: dos jugadores en la zona del J. Caso 2: tres jugadores en profundo.",
            "Caso 1: el S ayuda y el J cubre esa zona. Caso 2: el CW cubre esa zona."))

D_JONAS = ficha_def("Jonas", "Cobertura 22 · Zona variante", defensa_svg("Zona variante",
    zonas=[("CS", rect(14, 152)), ("S", rect(14, 172, CORTO, FONDO)), ("CW", rect(152, 252)),
           ("J", f"M252 {LINEA} L286 {LINEA} L286 {FONDO} L172 {FONDO} L172 {CORTO} L252 {CORTO} z")],
    flechas=[("R", RUSH)]), {
    "CS": "Corto", "CW": "Corto centro, corto y profundo centro", "J": "Profundo exterior y corto exterior",
    "S": "Profundo y ayuda en el profundo centro", "R": "Rush al QB"},
    '<p>Contra equipos que juegan corto y atacan por el centro.</p>'
    + debil("Tres jugadores en profundo.", "El CW cubre esa zona."))

D_SIMON = ficha_def("Simon", "Cobertura 31 · Zona clásica", defensa_svg("Zona clásica",
    zonas=[("CS", rect(14, 105)), ("J", rect(105, 195)), ("CW", rect(195, 286)), ("S", rect(14, 286, CORTO, FONDO))],
    flechas=[("R", RUSH)]), {
    "CS": "Corto", "CW": "Corto exterior y ayuda en el profundo exterior", "J": "Corto centro",
    "S": "Profundo", "R": "Rush al QB"},
    debil("Más de un jugador en el fondo.", "El CW o el CS cubren la zona libre."))

D_RAMONE = ficha_def("Ramone", "Cobertura 32 · Zona clásica · Sin rush", defensa_svg("Zona clásica",
    zonas=[("CS", rect(14, 105)), ("R", rect(105, 194)), ("CW", rect(194, 286)),
           ("S", rect(14, 152, CORTO, FONDO)), ("J", rect(152, 286, CORTO, FONDO))]), {
    "CS": "Corto exterior", "CW": "Corto exterior y ayuda en el profundo exterior",
    "J": "Profundo centro y profundo exterior", "S": "Profundo exterior", "R": "Corto centro"},
    debil("Tres jugadores en profundo. Sin rush, el QB tiene más tiempo para lanzar.", "El R cubre esa zona."))

D_SALOME = ficha_def("Salomé", "Cobertura 23 · Zona clásica · Sin rush", defensa_svg("Zona clásica",
    zonas=[("CS", rect(14, 151)), ("R", rect(151, 286)),
           ("S", rect(14, 105, CORTO, FONDO)), ("J", rect(105, 195, CORTO, FONDO)), ("CW", rect(195, 286, CORTO, FONDO))]), {
    "CS": "Corto exterior", "CW": "Profundo exterior", "J": "Profundo centro",
    "S": "Profundo exterior", "R": "Corto exterior"},
    debil("Tres jugadores en profundo. Sin rush, el QB tiene más tiempo para lanzar.", "El CW cubre esa zona."))

# --- hombre a hombre (cobertura 0)
D_BUNCH = ficha_def("Bunch", "Cobertura 0 · Alineación bunch · Sin rush", defensa_svg("Bunch",
    zonas=[("CS", rect(14, 118, LINEA, 66)), ("R", rect(118, 182, LINEA, 66)), ("CW", rect(182, 286, LINEA, 66)),
           ("S", rect(64, 148, 66, FONDO)), ("J", rect(148, 233, 66, FONDO))],
    flechas=[("R", "M137 55 L138 84")]), {
    "CS": "Coge al primer jugador que sale", "CW": "Coge al primer jugador que sale",
    "J": "Coge al jugador que queda de su lado", "S": "Coge al jugador que queda de su lado",
    "R": "Amaga el rush y luego coge los cruces por delante"},
    '<p>Sea cual sea la cobertura cantada, en cuanto el ataque sale en bunch se pasa a esta.</p>'
    + debil("El CS o el CW pierden a su jugador por dentro.", "El R cubre esa zona: está para eso.")
    + debil("El S o el J se quedan con dos jugadores de su lado.", "El S o el J cubren al jugador libre."))

MARCAJE = [("S", "M58 44 L47 98"), ("J", "M112 56 L100 98"), ("CS", "M165 67 L155 96"), ("CW", "M244 67 L255 98")]

D_JOACHIM = ficha_def("Joachim", "Cobertura 0 · Hombre a hombre", defensa_svg("Hombre a hombre",
    flechas=MARCAJE + [("R", RUSH)]), {
    "CS": "Coge al C", "CW": "Coge al WR", "J": "Coge al WS", "S": "Coge al WR", "R": "Rush al QB"},
    '<p>El CS coge al center porque suele ser el DB más lento.</p>'
    + debil("Cruces en las 3-5 primeras yardas.",
            "Cantar «switch»: cuando dos receptores se cruzan, los dos defensores se intercambian los jugadores en vez de perseguirlos entre el tráfico, y cada uno se queda con el que entra en su lado. Mentalidad de zona a hombre, no de hombre a hombre."))

D_VALHALLA = ficha_def("Valhalla", "Cobertura 0 · Hombre a hombre · Sin rush", defensa_svg("Hombre a hombre",
    zonas=[("R", rect(14, 286, LINEA, LOS - 5 * UY))], flechas=MARCAJE), {
    "CS": "Coge al C", "CW": "Coge al WR", "J": "Coge al WS", "S": "Coge al WR", "R": "Corto centro"},
    '<p>Contra ataques que lanzan mucho y que desde la alineación normal de hombre a hombre cuestan de cubrir.</p>'
    + debil("Responde al punto débil de Joachim, pero sin rush el QB tiene más tiempo para lanzar.",
            "El R cubre al jugador que se escapa."))

pag("6 · Defensa", cap(6, "Defensa") + """
<p>Sistema de defensa basado en el playbook de los Ducs (2025), con sus alineaciones y sus coberturas, y las aclaraciones de su autora.</p>
<h2>6.1. Posiciones</h2>
<p class="def"><b>Corner Strong (CS)</b> Corner del lado fuerte: cubre a los receptores.</p>
<p class="def"><b>Corner Weak (CW)</b> Corner del lado débil: cubre a los receptores.</p>
<p class="def"><b>Joker (J)</b> Cubre la zona que queda libre: profunda, media o exterior. Es un linebacker muy versátil y rápido, que entiende bien el juego y trabaja mucho en combinación con el CW.</p>
<p class="def"><b>Safety (S)</b> El último defensor, contra los pases largos.</p>
<p class="def"><b>Rusher (R)</b> El blitzer: presiona al QB. Sale a 7 yardas de la LoS. Casi siempre hay rush, salvo que el QB se coloque muy atrás.</p>
<h2>6.2. Alineaciones</h2>
<p>Tres colocaciones antes del snap: zona, hombre a hombre y bunch. En zona hay varias, según la cobertura: los Ducs las usan porque no tenían bastantes jugadores rápidos para salir siempre igual y disimular la cobertura. Si los jugadores pueden colocarse siempre de la misma forma, mejor.</p>
<div class="jugadas">""" + A_CLASICA + """</div>
""")

pag("6 · Defensa · Alineaciones", """
<div class="jugadas">""" + A_VARIANTE + A_TRIPS + A_HOMBRE + A_BUNCH + """</div>
""")

pag("6 · Defensa · Coberturas", """
<h2>6.3. Coberturas</h2>
<p>La cobertura se canta según lo que suele hacer el rival. Hay cinco de zona (tres con rush y dos sin) y tres de hombre a hombre. El hombre a hombre se juega como «zona a hombre»: cada uno coge al primer jugador que entra en su zona, y así se pueden intercambiar los receptores. Ese intercambio es el <b>switch</b>: cuando dos receptores se cruzan, sus dos defensores lo cantan y cada uno se queda con el que entra en su lado, en vez de perseguir al suyo y chocar. Las zonas sombreadas son la responsabilidad de cada defensor.</p>
<div class="nota"><b>Punto débil.</b> Ninguna cobertura es perfecta: todas tienen un punto débil, y es normal. Lo importante es saber dónde está, estar atentos y adaptarse lo mejor posible si el call no era el bueno. Si el ataque nos gana justo ahí, es responsabilidad de quien ha cantado la cobertura, no de los jugadores.</div>
<div class="jugadas">""" + D_ROCCO + D_JONAS + """</div>
""")

pag("6 · Defensa · Coberturas", """
<div class="jugadas">""" + D_SIMON + D_RAMONE + D_SALOME + """</div>
""")

pag("6 · Defensa · Coberturas", """
<div class="jugadas">""" + D_BUNCH + D_JOACHIM + D_VALHALLA + """</div>
""")


# ------------------------------------------------------------------ documento

CSS = """
:root { --teal:#006E82; --teal-claro:#4ECDC4; --gold:#D4A843; --ink:#040d12; --gris:#5b6a70; --linea:#d5dee0; --tinte:#eef6f7; }
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { background:#cfd8da; font-family:'Barlow',sans-serif; color:var(--ink); font-size:10.2pt; line-height:1.38; }
.hoja { width:210mm; height:297mm; margin:8mm auto; background:#fff; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 2mm 8mm rgba(4,13,18,.25); }

/* portada */
.portada { background:var(--ink); color:#fff; align-items:center; justify-content:center; text-align:center; }
.portada::before, .portada::after { content:''; position:absolute; left:0; right:0; height:3mm; }
.portada::before { top:22mm; background:var(--gold); box-shadow:0 4.5mm 0 var(--teal); }
.portada::after { bottom:22mm; background:var(--teal); box-shadow:0 4.5mm 0 var(--gold); }
.portada img.escudo { width:150mm; height:auto; margin:-22mm 0 -20mm; }
.portada .club { font-family:'Barlow Condensed',sans-serif; font-weight:600; letter-spacing:.42em; font-size:13pt; color:var(--teal-claro); text-transform:uppercase; margin-top:6mm; }
.portada h1 { font-family:'Anton',sans-serif; font-weight:400; font-size:86pt; line-height:1; letter-spacing:.03em; margin-top:3mm; }
.portada h1 span { color:var(--gold); }
.portada .sub { font-family:'Barlow Condensed',sans-serif; font-weight:600; letter-spacing:.3em; font-size:12pt; text-transform:uppercase; margin-top:5mm; color:#cfd8da; }
.portada .hash { position:absolute; bottom:36mm; left:0; right:0; font-family:'Barlow Condensed',sans-serif; font-weight:700; letter-spacing:.3em; font-size:11pt; color:var(--gold); }

/* barra superior y pie */
.barra { background:var(--ink); color:#fff; padding:3mm 14mm 3mm 11mm; display:flex; align-items:center; gap:4mm; border-bottom:1.1mm solid var(--gold); position:relative; flex:none; }
.barra::after { content:''; position:absolute; left:0; right:0; bottom:-2.2mm; height:1.1mm; background:var(--teal); }
.barra img { height:19mm; width:auto; margin:-5mm -3mm -5mm -4mm; }
.barra b { font-family:'Anton',sans-serif; font-weight:400; font-size:13pt; letter-spacing:.06em; text-transform:uppercase; }
.barra span { margin-left:auto; font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:10pt; letter-spacing:.2em; text-transform:uppercase; color:var(--teal-claro); }
.cuerpo { flex:1; padding:8mm 14mm 0; }
.pie { flex:none; padding:3mm 14mm 6mm; display:flex; align-items:center; justify-content:space-between; font-family:'Barlow Condensed',sans-serif; font-weight:600; letter-spacing:.14em; text-transform:uppercase; font-size:8.5pt; color:var(--gris); }
.pie .hash { color:var(--teal); font-weight:700; }
.pie .num { font-family:'Anton',sans-serif; font-weight:400; font-size:12pt; color:var(--ink); letter-spacing:.04em; }

/* texto */
.cap { margin-bottom:5mm; }
.cap span { font-family:'Barlow Condensed',sans-serif; font-weight:700; letter-spacing:.3em; font-size:10pt; color:var(--gold); text-transform:uppercase; }
.cap h1 { font-family:'Anton',sans-serif; font-weight:400; font-size:30pt; line-height:1.05; letter-spacing:.02em; text-transform:uppercase; }
h2 { font-family:'Anton',sans-serif; font-weight:400; font-size:14pt; letter-spacing:.04em; text-transform:uppercase; color:var(--teal); display:flex; align-items:center; gap:3mm; margin:5mm 0 2.5mm; }
h2::after { content:''; flex:1; height:.5mm; background:var(--gold); }
.cuerpo > h2:first-child, .cap + h2 { margin-top:0; }
h3 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:12.5pt; letter-spacing:.06em; text-transform:uppercase; margin:3.5mm 0 1.5mm; }
p { margin-bottom:2.2mm; text-align:justify; hyphens:auto; }
p.def { padding-left:4mm; border-left:.9mm solid var(--teal); text-align:left; }
p.def > b:first-child { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11.5pt; letter-spacing:.03em; text-transform:uppercase; color:var(--teal); margin-right:1.5mm; }
.lista { list-style:none; margin-bottom:2.2mm; }
.lista li { padding-left:5mm; position:relative; margin-bottom:1.3mm; }
.lista li::before { content:''; position:absolute; left:.3mm; top:1.7mm; width:2mm; height:2mm; background:var(--gold); transform:rotate(45deg); }
.check { list-style:none; }
.check li { padding-left:6.5mm; position:relative; margin-bottom:1.6mm; }
.check li::before { content:''; position:absolute; left:0; top:.9mm; width:3.2mm; height:3.2mm; border:.45mm solid var(--teal); border-radius:.6mm; }
.check li.opc { color:var(--gris); }
.check li.opc::before { border-color:var(--linea); }
.check em { font-family:'Barlow Condensed',sans-serif; font-style:normal; font-weight:700; font-size:8pt; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin-left:1mm; }
.nota { background:var(--tinte); border-left:1.2mm solid var(--gold); padding:2.6mm 4mm; border-radius:0 1.5mm 1.5mm 0; margin:2.5mm 0; }
.dos { display:grid; grid-template-columns:1fr 1fr; gap:7mm; }
.dos h3:first-child { margin-top:1mm; }

/* dedicatoria e índice */
.dedicatoria { text-align:right; font-style:italic; color:var(--gris); margin:8mm 0 12mm; font-size:11pt; }
.dedicatoria p { text-align:right; margin-bottom:5mm; }
.indice { list-style:none; }
.indice li { display:flex; align-items:baseline; gap:2mm; padding:1.3mm 0 1.3mm 7mm; }
.indice li span { order:1; }
.indice li::after { content:''; order:2; flex:1; border-bottom:.35mm dotted var(--linea); transform:translateY(-1mm); }
.indice li b { order:3; font-family:'Barlow Condensed',sans-serif; font-weight:700; color:var(--teal); }
.indice li.n1 { padding-left:0; margin-top:3mm; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13pt; letter-spacing:.05em; text-transform:uppercase; }

/* puntuación */
.puntos { display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; margin:1mm 0 2mm; }
.puntos > div { border:.35mm solid var(--linea); border-radius:1.5mm; padding:2.5mm 3mm; }
.puntos b { font-family:'Anton',sans-serif; font-weight:400; font-size:22pt; line-height:1; color:var(--teal); }
.puntos span { display:block; font-family:'Barlow Condensed',sans-serif; font-weight:700; letter-spacing:.1em; text-transform:uppercase; font-size:9.5pt; color:var(--gold); margin:.5mm 0 1mm; }
.puntos p { font-size:9pt; text-align:left; margin:0; line-height:1.3; }
.puntos p b { font-family:inherit; font-weight:600; font-size:inherit; color:inherit; }

/* claves */
.claves { display:flex; gap:3mm; margin:1mm 0 3mm; }
.claves > div { border:.35mm solid var(--linea); border-radius:1.5mm; padding:1.2mm 4mm; display:flex; align-items:baseline; gap:2.5mm; }
.claves b { font-family:'Anton',sans-serif; font-weight:400; font-size:13pt; color:var(--teal); letter-spacing:.03em; }
.claves span { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:11pt; letter-spacing:.04em; }

/* figuras */
figure { margin:2mm 0 3mm; text-align:center; }
figure svg { display:block; margin:0 auto; }
figcaption { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase; color:var(--gris); margin-top:1.2mm; }
.fig-form { width:100%; max-width:120mm; height:auto; }
.dos .fig-form { max-width:none; }
.dos figure { margin:.5mm 0 1.5mm; }
.fig-campo { width:100%; height:auto; }
.arbol { display:grid; grid-template-columns:66mm 1fr; gap:6mm; align-items:start; }
.fig-arbol { width:66mm; height:auto; background:var(--tinte); border-radius:1.5mm; }
.ruta-n { display:grid; grid-template-columns:8mm 1fr; text-align:left; margin-bottom:1.8mm; }
.ruta-n i { font-family:'Anton',sans-serif; font-style:normal; font-size:15pt; line-height:1.1; color:var(--gold); }
.ruta-n b { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11.5pt; letter-spacing:.04em; text-transform:uppercase; color:var(--teal); margin-right:1.2mm; }
.tarjetas { display:grid; grid-template-columns:1fr; gap:2.6mm; }
.tarjeta { border:.35mm solid var(--linea); border-radius:1.5mm; display:grid; grid-template-columns:44mm 1fr; overflow:hidden; }
.t-fig { background:var(--tinte); display:flex; align-items:center; justify-content:center; padding:1mm 2mm; }
.fig-ruta { width:35mm; height:auto; }
.t-txt { padding:2.6mm 4mm; }
.t-txt h4 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13pt; letter-spacing:.05em; text-transform:uppercase; display:flex; align-items:baseline; gap:2mm; }
.t-txt h4 small { font-weight:600; font-size:8.5pt; letter-spacing:.14em; color:var(--gris); }
.t-txt h4 i { margin-left:auto; font-family:'Anton',sans-serif; font-style:normal; font-weight:400; font-size:15pt; color:var(--gold); }
.t-txt p { text-align:left; margin:1mm 0 0; font-size:9.8pt; }

.forma { display:grid; grid-template-columns:1fr 64mm; align-items:center; gap:5mm; background:#040d12; color:#fff; border-radius:1.5mm; padding:4mm 4mm 4mm 6mm; margin:0 0 4mm; border-bottom:1.1mm solid #D4A843; }
.forma .f-txt span { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:9.5pt; letter-spacing:.3em; text-transform:uppercase; color:#4ECDC4; }
.forma h2 { color:#fff; font-size:30pt; line-height:1; margin:1mm 0 1.5mm; letter-spacing:.03em; }
.forma h2::after { display:none; }
.forma .f-txt b { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10.5pt; letter-spacing:.16em; text-transform:uppercase; color:#D4A843; }
.forma .f-fig svg { width:100%; height:auto; display:block; border-radius:1mm; }
p + .forma { margin-top:5mm; }
.jugadas { display:grid; grid-template-columns:1fr; gap:2.6mm; }
.jugada { border:.35mm solid var(--linea); border-radius:1.5mm; display:grid; grid-template-columns:82mm 1fr; overflow:hidden; break-inside:avoid; }
.j-fig { background:var(--tinte); display:flex; align-items:center; }
.fig-jugada { width:82mm; height:auto; display:block; }
.j-txt { padding:2.2mm 3.5mm 2mm; }
.j-txt h4 { font-family:'Anton',sans-serif; font-weight:400; font-size:13pt; letter-spacing:.04em; text-transform:uppercase; color:var(--teal); line-height:1.1; }
.j-txt h4 small { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10pt; letter-spacing:.14em; color:var(--gold); margin-left:1.5mm; }
.j-rutas { list-style:none; margin:1.2mm 0 1.4mm; }
.j-rutas li { display:grid; grid-template-columns:3.6mm 5mm 1fr; align-items:baseline; font-size:9.2pt; line-height:1.3; }
.j-rutas i { width:2.4mm; height:2.4mm; border-radius:50%; align-self:center; }
.j-rutas b { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10.5pt; }
.j-txt p { text-align:left; font-size:8.8pt; line-height:1.3; margin:0; color:#27343a; hyphens:none; }
.j-txt p + p { margin-top:1.2mm; }
.j-txt p.debil b { color:#c0392b; margin-right:1mm; }
.j-txt p.solucion b { color:var(--teal); margin-right:1mm; }

@page { size:A4; margin:0; }
@media print { body { background:none; } .hoja { margin:0; box-shadow:none; page-break-after:always; } .hoja:last-child { page-break-after:auto; } }
"""

MARCAS = "".join(
    f'<marker id="flecha-{k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{c}"/></marker>'
    f'<marker id="tope-{k}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5"><circle cx="5" cy="5" r="4" fill="{c}"/></marker>'
    for k, c in COL.items())

MARCAS_DEF = "".join(
    f'<marker id="flecha-d{k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{c}"/></marker>'
    for k, c in DCOL.items())

DEFS = f"""<svg width="0" height="0" style="position:absolute"><defs>
<marker id="flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{TEAL}"/></marker>
<marker id="tope" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5"><circle cx="5" cy="5" r="4" fill="{TEAL}"/></marker>
{MARCAS}{MARCAS_DEF}
</defs></svg>"""

html = [f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coruña Atlantics · Playbook</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
{DEFS}
<section class="hoja portada">
  <img class="escudo" src="{ESCUDO}" alt="Coruña Atlantics">
  <div class="club">Coruña Atlantics</div>
  <h1>PLAY<span>BOOK</span></h1>
  <div class="sub">Flag football · 5 contra 5</div>
  <div class="hash">#WeAreAtlantics</div>
</section>
"""]

for n, (cabecera, cuerpo) in enumerate(paginas, start=1):
    html.append(f"""<section class="hoja">
  <div class="barra"><img src="{ESCUDO}" alt=""><b>Playbook</b><span>{cabecera}</span></div>
  <div class="cuerpo">{cuerpo}</div>
  <div class="pie"><span>Coruña Atlantics</span><span class="hash">#WeAreAtlantics</span><span class="num">{n}</span></div>
</section>
""")

html.append("</body>\n</html>\n")

with open(os.path.join(AQUI, "playbook.html"), "w", encoding="utf-8") as f:
    f.write("".join(html))
print(f"playbook.html: portada + {len(paginas)} páginas")


# ------------------------------------------------------------------ versión para el móvil
# Misma maqueta, pero en una columna que se adapta al ancho y con tema claro y oscuro.
# Es la página que se publica como artifact (sin <html> ni <body>; el escudo va incrustado).

def escudo_incrustado(ancho=420):
    import base64, io
    from PIL import Image
    im = Image.open(os.path.join(AQUI, "..", "circular sin fondo.png")).convert("RGBA")
    im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


CSS_MOVIL = """
/* Una columna de lectura; las láminas son tarjetas y los diagramas van sobre un panel claro fijo. */
:root { --bg:#eef3f4; --papel:#ffffff; --ink:#040d12; --gris:#5b6a70; --linea:#d5dee0; --tinte:#eef6f7; --teal:#006E82; --gold:#B0841F; --suave:#27343a; --panel:#eef6f7; --banda:#040d12; --banda-fg:#ffffff; --banda-eco:#4ECDC4; --banda-oro:#D4A843; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#040d12; --papel:#0a1a21; --ink:#e9f1f2; --gris:#9db0b5; --linea:#1f3942; --tinte:#0f2a31; --teal:#4ECDC4; --gold:#D4A843; --suave:#c5d3d6; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#040d12; --papel:#0a1a21; --ink:#e9f1f2; --gris:#9db0b5; --linea:#1f3942; --tinte:#0f2a31; --teal:#4ECDC4; --gold:#D4A843; --suave:#c5d3d6; color-scheme:dark }
html { -webkit-text-size-adjust:100%; }
body { background:var(--bg); color:var(--ink); font-family:'Barlow',system-ui,sans-serif; font-size:15px; line-height:1.5; }
.doc { max-width:860px; margin:0 auto; padding-inline:16px; padding-block:16px; display:flex; flex-direction:column; gap:16px; }
.hoja { width:auto; height:auto; margin:0; background:var(--papel); box-shadow:none; border:1px solid var(--linea); border-radius:10px; overflow:hidden; }
.portada { background:var(--banda); color:var(--banda-fg); padding:64px 16px 72px; border-color:var(--banda); }
.portada::before { top:18px; height:8px; background:var(--banda-oro); box-shadow:0 12px 0 #006E82; }
.portada::after { bottom:18px; height:8px; background:#006E82; box-shadow:0 12px 0 var(--banda-oro); }
.portada img.escudo { width:min(72%,320px); margin:-8px 0 -24px; }
.portada .club { color:var(--banda-eco); font-size:14px; letter-spacing:.3em; }
.portada h1 { font-size:clamp(56px,17vw,112px); }
.portada h1 span, .portada .hash { color:var(--banda-oro); }
.portada .sub { font-size:13px; letter-spacing:.2em; }
.portada .hash { position:static; margin-top:22px; }
.barra { background:var(--banda); color:var(--banda-fg); padding:8px 16px; border-bottom-color:var(--banda-oro); }
.barra::after { background:#006E82; }
.barra img { height:46px; margin:-8px -6px -8px -8px; }
.barra span { color:var(--banda-eco); font-size:11px; letter-spacing:.14em; text-align:right; }
.cuerpo { padding:22px 16px 8px; min-width:0; }
.pie { padding:10px 16px 14px; }
.pie .num { color:var(--ink); }
p { text-align:left; hyphens:manual; }
h2 { text-wrap:balance; }
.cap h1 { font-size:clamp(26px,8vw,40px); text-wrap:balance; }
.dos > *, .arbol > *, .tarjeta > *, .jugada > * { min-width:0; }
.t-fig, .j-fig, .fig-arbol { background:var(--panel); }
figure { overflow-x:auto; }
.fig-campo { background:var(--panel); border-radius:6px; padding:6px; min-width:520px; }
.fig-form, .fig-jugada { max-width:100%; }
.j-txt p { color:var(--suave); font-size:13.5px; }
.forma { background:var(--banda); color:var(--banda-fg); border-bottom-color:var(--banda-oro); grid-template-columns:1fr minmax(0,240px); padding:16px; border-radius:8px; }
.forma h2 { color:var(--banda-fg); font-size:clamp(30px,9vw,44px); }
.forma .f-txt span { color:var(--banda-eco); font-size:11px; letter-spacing:.2em; }
.forma .f-txt b { color:var(--banda-oro); font-size:13px; }
.j-rutas li { font-size:14px; }
.puntos p { font-size:13px; }
.t-txt p { font-size:14px; }
@media (max-width:640px) {
  .dos { grid-template-columns:1fr; gap:12px; }
  .puntos { grid-template-columns:1fr 1fr; }
  .arbol { grid-template-columns:1fr; }
  .fig-arbol { width:100%; max-width:280px; margin:0 auto; }
  .tarjeta { grid-template-columns:1fr; }
  .fig-ruta { width:150px; }
  .jugada { grid-template-columns:1fr; }
  .forma { grid-template-columns:1fr; }
  .fig-jugada { width:100%; }
  .claves { flex-wrap:wrap; }
  .indice li { padding-left:12px; }
  figcaption { letter-spacing:.08em; }
}
"""

ESC = escudo_incrustado()
movil = [f"""<title>Playbook Coruña Atlantics</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<style>{CSS}{CSS_MOVIL}</style>
{DEFS}
<main class="doc">
<section class="hoja portada">
  <img class="escudo" src="{ESC}" alt="Coruña Atlantics">
  <div class="club">Coruña Atlantics</div>
  <h1>PLAY<span>BOOK</span></h1>
  <div class="sub">Flag football · 5 contra 5</div>
  <div class="hash">#WeAreAtlantics</div>
</section>
"""]
for n, (cabecera, cuerpo) in enumerate(paginas, start=1):
    movil.append(f"""<section class="hoja">
  <div class="barra"><img src="{ESC}" alt=""><b>Playbook</b><span>{cabecera}</span></div>
  <div class="cuerpo">{cuerpo}</div>
  <div class="pie"><span>Coruña Atlantics</span><span class="hash">#WeAreAtlantics</span><span class="num">{n}</span></div>
</section>
""")
movil.append("</main>\n")
with open(os.path.join(AQUI, "playbook-movil.html"), "w", encoding="utf-8") as f:
    f.write("".join(movil))
print("playbook-movil.html: versión para publicar")


# ------------------------------------------------------------------ datos para la app
# La pantalla Playbook de la app (Equipo -> Playbook) lee este módulo. Va dentro
# de app/js para que el service worker lo guarde con el resto de la app y se
# pueda consultar en el campo sin cobertura. Mismo orden que el capítulo 5.

import json

APP_FORMACIONES = [
    ("Spread", F_SPREAD_D, ["Fly Out", "In", "Slant Go", "Dagger", "Doble Pase", "Read Option"]),
    ("Twins", F_TWINS_D, ["Doble Post", "Choice", "Silla", "Mesh"]),
    ("Trips", F_TRIPS_D, ["Flood", "Cruce", "Delay"]),
    ("Bunch", F_BUNCH_D, ["Tijera", "Out Cruzado", "Doble Corner"]),
    ("Trips Stacked", F_STACKED_D, ["Slant Swing"]),
]
_faltan = set(REGISTRO) - {n for _, _, ns in APP_FORMACIONES for n in ns}
assert not _faltan, f"Jugadas que no salen en la app: {_faltan}"

datos = {
    "defs": DEFS.replace(MARCAS_DEF, ""),      # la app aún no enseña la defensa
    "formaciones": [{"nombre": nom, "fig": fig, "jugadas": [REGISTRO[n] for n in nombres]}
                    for nom, fig, nombres in APP_FORMACIONES],
}
with open(os.path.join(AQUI, "..", "app", "js", "playbook-datos.js"), "w", encoding="utf-8") as f:
    f.write("// Generado por playbook/generar.py. No editar a mano: se sobrescribe.\n")
    f.write("export const PLAYBOOK = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
print("app/js/playbook-datos.js: jugadas para la app")
