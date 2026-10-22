"""Bocetos de la ropa de paseo en ficha técnica: sudadera y chándal (delante y detrás).

Uso:  python generar_ropa.py
Saca en esta carpeta, para cada prenda, una ficha por opción de color
(boceto-sudadera-1.png ... boceto-chandal-4.png) y una hoja con las cuatro juntas
para compararlas (opciones-sudadera.png, opciones-chandal.png).
Las opciones se cambian en SUDADERAS y CHANDALES. Mismas letras que las camisetas (generar.py).
Necesita playwright y Pillow.
"""
import base64, math, pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
TEAL, TEAL_OSC, TEAL_CLARO, ORO, BLANCO, LINEA = "#006E82", "#004b59", "#4ECDC4", "#D4A843", "#FFFFFF", "#2b2b2b"
GRIS, GRIS_OSC = "#b9bec1", "#9aa0a4"
# Azul marino: un punto más claro que el azul noche de las plantillas (#0A1626) para que en tela no parezca negro
MARINO, MARINO_OSC = "#0F2640", "#0a1a2e"
EQUIPO = "ATLANTICS"

COORDS = "43°22′16″N · 8°23′46″W"   # A Coruña, como en la guía de marca

# Cada opción es un diseño distinto (clave "diseno") con su combinación de color
_TEAL = dict(cuerpo=TEAL, mangas=TEAL, capucha=TEAL, rib=TEAL_OSC, hueco=TEAL_OSC, letra=BLANCO, perfil=ORO,
             hilo=TEAL_OSC, cordon=BLANCO, aro_txt=BLANCO, aro=ORO, etiqueta=BLANCO, etiqueta_txt=TEAL, acento=TEAL_CLARO)
_MARINO = dict(cuerpo=MARINO, mangas=MARINO, capucha=MARINO, rib=TEAL, hueco=MARINO_OSC, letra=BLANCO, perfil=ORO,
               hilo=TEAL, cordon=ORO, aro_txt=BLANCO, aro=ORO, etiqueta=TEAL, etiqueta_txt=BLANCO, acento=TEAL)
_GRIS = dict(cuerpo=GRIS, mangas=GRIS, capucha=GRIS, rib=GRIS_OSC, hueco=GRIS_OSC, letra=TEAL, perfil=ORO,
             hilo=BLANCO, cordon=BLANCO, aro_txt=TEAL, aro=TEAL, etiqueta=TEAL, etiqueta_txt=BLANCO, jaspe=True, acento=TEAL)
_BLANCA = dict(cuerpo=BLANCO, mangas=BLANCO, capucha=BLANCO, rib=TEAL, hueco="#e4e8e9", letra=TEAL, perfil=ORO,
               hilo=None, cordon=TEAL, aro_txt=TEAL, aro=ORO, etiqueta=TEAL, etiqueta_txt=BLANCO, acento=TEAL_CLARO)

SUDADERAS = [
    dict(_TEAL, titulo="1 · Clásica · teal", diseno="clasica"),
    dict(_MARINO, titulo="2 · Poseidón y coordenadas · azul marino", diseno="coordenadas"),
    dict(_GRIS, titulo="3 · Universitaria en arco · gris jaspeado", diseno="arco"),
    dict(_BLANCA, titulo="4 · Mangas con texto · blanca", diseno="mangas"),
    dict(_TEAL, titulo="5 · Clásica bicolor · teal y blanco", diseno="clasica", mangas=BLANCO, capucha=BLANCO,
         rib=TEAL, hueco="#e4e8e9", cordon=ORO),
    dict(_MARINO, titulo="6 · Universitaria en arco · azul marino", diseno="arco", letra=BLANCO, hilo=TEAL),
]
CHANDALES = [
    dict(titulo="1 · Brochazos · blanca", diseno="brochazos", base=BLANCO, trazos=(TEAL, TEAL_CLARO), remate=TEAL,
         letra=TEAL, pantalon=TEAL, pant_rib=TEAL_OSC, tiras=(BLANCO, ORO), bolsillo=BLANCO),
    dict(titulo="2 · Canesú retro · azul marino y teal", diseno="canesu", base=MARINO, canesu=TEAL, remate=TEAL,
         letra=BLANCO, pantalon=MARINO, pant_rib=MARINO_OSC, tiras=(TEAL, ORO), bolsillo=BLANCO),
    dict(titulo="3 · Cinta ATLANTICS en mangas · teal", diseno="cinta", base=TEAL, cinta=BLANCO, cinta_txt=TEAL,
         remate=TEAL_OSC, letra=BLANCO, pantalon=TEAL, pant_rib=TEAL_OSC, tiras=(BLANCO, ORO), bolsillo=BLANCO),
    dict(titulo="4 · Ola dorada · azul marino", diseno="ola", base=MARINO, olas=(TEAL, TEAL_CLARO), remate=TEAL,
         letra=BLANCO, pantalon=MARINO, pant_rib=MARINO_OSC, tiras=(TEAL, ORO), bolsillo=BLANCO),
    dict(titulo="5 · Brochazos de oro · teal oscuro", diseno="brochazos", base=TEAL_OSC, trazos=(ORO, TEAL_CLARO),
         remate=ORO, letra=ORO, pantalon=TEAL_OSC, pant_rib="#003a45", tiras=(ORO, BLANCO), bolsillo=ORO),
    dict(titulo="6 · Cinta ATLANTICS · blanca y azul marino", diseno="cinta", base=BLANCO, cinta=MARINO, cinta_txt=ORO,
         remate=MARINO, letra=MARINO, pantalon=MARINO, pant_rib=MARINO_OSC, tiras=(BLANCO, ORO), bolsillo=BLANCO),
]

_cache = {}


def imagen(ruta, x, y, alto):
    """PNG sin fondo (recortado a su contenido) centrado en x, y."""
    if ruta not in _cache:
        im = Image.open(ruta).convert("RGBA")
        im = im.crop(im.getchannel("A").getbbox()); im.thumbnail((500, 500))
        tmp = aqui / "_tmp.png"; im.save(tmp)
        _cache[ruta] = (im.width / im.height, base64.b64encode(tmp.read_bytes()).decode()); tmp.unlink()
    prop, datos = _cache[ruta]
    ancho = alto * prop
    return (f'<image href="data:image/png;base64,{datos}" x="{x - ancho / 2}" y="{y - alto / 2}" '
            f'width="{ancho}" height="{alto}"/>')


def letras(txt, x, y, size, fill, perfil=None, hilo=None, esp=3):
    """Texto de bloque como el de las camisetas (Oswald 700), con perfil y hilo opcionales."""
    base = (f'x="{x}" y="{y}" text-anchor="middle" font-family="Oswald" font-weight="700" '
            f'font-size="{size}" letter-spacing="{esp}"')
    out = ""
    if hilo:   out += f'<text {base} fill="{hilo}" stroke="{hilo}" stroke-width="{size * .16:.1f}" stroke-linejoin="round">{txt}</text>'
    if perfil: out += f'<text {base} fill="{perfil}" stroke="{perfil}" stroke-width="{size * .09:.1f}" stroke-linejoin="round">{txt}</text>'
    return out + f'<text {base} fill="{fill}">{txt}</text>'


def letras_arco(txt, d, pid, size, fill, perfil=None, hilo=None, esp=3):
    """Letras de bloque sobre la curva d (arco universitario)."""
    out = f'<path id="{pid}" d="{d}" fill="none"/>'
    tp = f'<textPath href="#{pid}" startOffset="50%">{txt}</textPath>'
    base = (f'text-anchor="middle" font-family="Oswald" font-weight="700" font-size="{size}" '
            f'letter-spacing="{esp}"')
    if hilo:   out += f'<text {base} fill="{hilo}" stroke="{hilo}" stroke-width="{size * .16:.1f}" stroke-linejoin="round">{tp}</text>'
    if perfil: out += f'<text {base} fill="{perfil}" stroke="{perfil}" stroke-width="{size * .09:.1f}" stroke-linejoin="round">{tp}</text>'
    return out + f'<text {base} fill="{fill}">{tp}</text>'


def ola(y, amp, color, cresta=None, fase=0):
    """La ola de las plantillas: una banda que sube y baja, con la cresta en oro si se pide."""
    x0 = -40 + fase
    d = (f"M{x0},{y} C{x0 + 110},{y - amp} {x0 + 220},{y + amp} {x0 + 330},{y} "
         f"S{x0 + 550},{y - amp} {x0 + 700},{y}")
    out = f'<path d="{d} V900 H{x0}Z" fill="{color}"/>'
    if cresta:
        out += f'<path d="{d}" fill="none" stroke="{cresta}" stroke-width="4"/>'
    return out


def texto_en_trazo(d, pid, txt, size, color, veces=6):
    return (f'<path id="{pid}" d="{d}" fill="none"/>'
            f'<text font-family="Oswald" font-weight="700" font-size="{size}" fill="{color}" letter-spacing="2" '
            f'dominant-baseline="middle"><textPath href="#{pid}">{(txt + " · ") * veces}</textPath></text>')


def contorno(d, ancho=2.4):
    return f'<path d="{d}" fill="none" stroke="{LINEA}" stroke-width="{ancho}" stroke-linejoin="round"/>'


def cost(d, op=.5):
    return f'<path d="{d}" fill="none" stroke="{LINEA}" stroke-width="1.3" stroke-dasharray="6 5" opacity="{op}"/>'


def canale(x0, y0, x1, y1, paso=7):
    """Rayas verticales del punto elástico (puños y cintura)."""
    return "".join(f'<line x1="{x}" y1="{y0 + 3}" x2="{x}" y2="{y1 - 3}" stroke="{LINEA}" stroke-width="1" opacity=".3"/>'
                   for x in range(int(x0) + paso, int(x1), paso))


# ── SUDADERA ─────────────────────────────────────────────────────────────────────────────
S_CUERPO = ("M200,95 C140,100 100,125 85,175 L38,520 L38,575 L112,575 L112,525 L148,300 L152,540 "
            "L152,590 L448,590 L448,540 L452,300 L488,525 L488,575 L562,575 L562,520 L515,175 "
            "C500,125 460,100 400,95 Z")
# Mangas raglán: de la costura del cuello a la axila hacia fuera
S_MANGAS = ("M200,95 C140,100 100,125 85,175 L38,520 L38,575 L112,575 L112,525 L148,300 C165,240 200,180 222,100 Z "
            "M400,95 C460,100 500,125 515,175 L562,520 L562,575 L488,575 L488,525 L452,300 C435,240 400,180 378,100 Z")


def pecho_sudadera(k, sfx):
    d = k["diseno"]
    if d == "coordenadas":
        return (imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 268, 108)
                + letras(EQUIPO, 300, 368, 36, k["letra"], k["perfil"], None, esp=3)
                + f'<text x="300" y="394" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="13" '
                  f'letter-spacing="2" fill="{ORO}">{COORDS}</text>')
    if d == "arco":
        return (letras_arco(EQUIPO, "M158,356 Q300,262 442,356", f"arco{sfx}", 54, k["letra"], k["perfil"], k["hilo"])
                + f'<text x="300" y="392" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="22" '
                  f'letter-spacing="8" fill="{k["letra"]}">CORUÑA</text>')
    if d == "mangas":
        return imagen(aqui.parent / "circular sin fondo.png", 228, 250, 74) + mangas_texto(k)
    return letras(EQUIPO, 300, 345, 50, k["letra"], k["perfil"], k["hilo"], esp=2)


def mangas_texto(k):
    """ATLANTICS por la manga izquierda y #WEAREATLANTICS por la derecha, de hombro a puño."""
    return (f'<g transform="translate(84,352) rotate(94.5)">{letras(EQUIPO, 0, 11, 32, k["letra"], k["perfil"], None, esp=4)}</g>'
            f'<g transform="translate(516,352) rotate(85.5)">{letras("#WEAREATLANTICS", 0, 8, 22, k["letra"], None, None, esp=2)}</g>')


def espalda_sudadera(k, sfx):
    d = k["diseno"]
    if d == "coordenadas":
        return (letras("#WEAREATLANTICS", 300, 330, 29, k["letra"], None, None, esp=2)
                + f'<text x="300" y="362" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="14" '
                  f'letter-spacing="3" fill="{ORO}">CORUÑA · {COORDS}</text>'
                + ola(440, 26, k["acento"], ORO) + ola(478, 20, TEAL_OSC, None, 60))
    if d == "arco":
        return imagen(aqui.parent / "tridente sin fondo.png", 300, 368, 300)
    if d == "mangas":
        return (letras(EQUIPO, 300, 318, 66, k["letra"], k["perfil"], None, esp=5)
                + f'<text x="300" y="350" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="15" '
                  f'letter-spacing="3" fill="{k["letra"]}">CORUÑA · {COORDS}</text>'
                + f'<path d="M150,392 C230,366 270,418 300,392 S380,366 450,392" fill="none" stroke="{ORO}" stroke-width="4"/>'
                + mangas_texto(k))
    # clásica: la cabeza de Poseidón dentro de un aro de texto, como el MOON de la referencia
    return (f'<circle cx="300" cy="372" r="112" fill="none" stroke="{k["aro"]}" stroke-width="3"/>'
            f'<circle cx="300" cy="372" r="80" fill="none" stroke="{k["aro"]}" stroke-width="2"/>'
            f'<path id="aro{sfx}" d="M300,276 a96,96 0 1,1 -0.1,0" fill="none"/>'
            f'<text font-family="Oswald" font-weight="700" font-size="21" fill="{k["aro_txt"]}" letter-spacing="1">'
            f'<textPath href="#aro{sfx}" textLength="600" lengthAdjust="spacing">'
            f'{"ATLANTICS · #WEAREATLANTICS · " * 2}</textPath></text>'
            f'{imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 372, 128)}')


def sudadera(k, detras, sfx):
    id_ = f"s{sfx}{'d' if detras else 'f'}"
    jaspe = f' filter="url(#jaspe{sfx})"' if k.get("jaspe") else ""
    punos = (f'<rect x="152" y="540" width="296" height="50" fill="{k["rib"]}"/>{canale(152, 540, 448, 590)}'
             f'<rect x="38" y="525" width="74" height="50" fill="{k["rib"]}"/>{canale(38, 525, 112, 575)}'
             f'<rect x="488" y="525" width="74" height="50" fill="{k["rib"]}"/>{canale(488, 525, 562, 575)}')
    raglan = (cost("M222,104 C200,180 165,240 148,300", .35) + cost("M378,104 C400,180 435,240 452,300", .35))
    f = [f'<clipPath id="{id_}"><path d="{S_CUERPO}"/></clipPath>',
         f'<path d="{S_CUERPO}" fill="{k["cuerpo"]}"{jaspe}/>',
         f'<g clip-path="url(#{id_})"><path d="{S_MANGAS}" fill="{k["mangas"]}"{jaspe}/>{raglan}']
    if detras:
        capucha = "M205,100 C190,15 250,-4 300,-4 C350,-4 410,15 395,100 C380,160 330,188 300,190 C270,188 220,160 205,100Z"
        f.append(espalda_sudadera(k, sfx) + f'{punos}</g>')
        f.append(contorno(S_CUERPO))
        f.append(f'<path d="{capucha}" fill="{k["capucha"]}"{jaspe}/>' + contorno(capucha)
                 + f'<path d="M300,-2 V188" stroke="{LINEA}" stroke-width="1.4" opacity=".5"/>')
    else:
        capucha = "M200,98 C185,20 245,0 300,0 C355,0 415,20 400,98 Z"
        hueco = "M232,98 C230,45 265,26 300,26 C335,26 370,45 368,98 L300,150 Z"
        bolsillo = "M205,420 L395,420 L425,532 L175,532 Z"
        f.insert(0, f'<path d="{capucha}" fill="{k["capucha"]}"{jaspe}/>' + contorno(capucha))
        f.append(pecho_sudadera(k, sfx)
                 + f'<path d="{bolsillo}" fill="{k["cuerpo"]}"{jaspe} stroke="{LINEA}" stroke-width="1.8"/>'
                 + cost("M212,428 L388,428 M205,428 L182,524 M395,428 L418,524", .45)
                 # etiqueta pequeña en la esquina del bolsillo (la de MOON en la referencia)
                 + f'<rect x="348" y="498" width="62" height="24" rx="3" fill="{k["etiqueta"]}"/>'
                   f'<text x="379" y="516" text-anchor="middle" font-family="Oswald" font-weight="700" '
                   f'font-size="14" fill="{k["etiqueta_txt"]}" letter-spacing="1">CORUÑA</text>'
                 + punos
                 # tridente pequeño en el puño izquierdo (el logo de la manga en la referencia)
                 + imagen(aqui.parent / "tridente sin fondo.png", 75, 498, 36) + '</g>')
        f.append(contorno(S_CUERPO))
        f.append(f'<path d="{hueco}" fill="{k["hueco"]}"/>' + contorno(hueco, 2))
        for x0, x1 in ((282, 277), (318, 323)):   # cordones con puntera de oro
            f.append(f'<line x1="{x0}" y1="128" x2="{x1}" y2="236" stroke="{k["cordon"]}" stroke-width="5" stroke-linecap="round"/>'
                     f'<line x1="{x1}" y1="224" x2="{x1}" y2="244" stroke="{ORO}" stroke-width="6" stroke-linecap="round"/>'
                     f'<circle cx="{x0}" cy="128" r="5" fill="{BLANCO}" stroke="{LINEA}" stroke-width="1"/>')
    f.append(contorno("M222,100 C200,180 165,240 148,300 M378,100 C400,180 435,240 452,300", 1.2)
             if k["mangas"] != k["cuerpo"] else "")
    for x0 in (38, 488):
        f.append(f'<line x1="{x0}" y1="525" x2="{x0 + 74}" y2="525" stroke="{LINEA}" stroke-width="1.6"/>')
    f.append(f'<line x1="152" y1="540" x2="448" y2="540" stroke="{LINEA}" stroke-width="1.6"/>')
    return "".join(f)


# ── CHÁNDAL ──────────────────────────────────────────────────────────────────────────────
C_CUERPO = ("M228,55 C170,62 125,72 105,95 L40,470 L42,512 L108,514 L112,482 L150,232 L152,500 "
            "L152,530 L448,530 L448,500 L450,232 L488,482 L492,514 L558,512 L560,470 L495,95 "
            "C475,72 430,62 372,55 Z")


def pinceladas(colores, semilla, sfx):
    """Brochazos diagonales en dos colores, como las manchas de la referencia."""
    out, r = "", semilla
    def azar():
        nonlocal r
        r = (r * 1103515245 + 12345) % 2 ** 31
        return r / 2 ** 31
    for i in range(13):   # arrancan abajo y se quedan por debajo del pecho, que lleva el nombre y el escudo
        x = -60 + i * 50 + azar() * 20
        y = 580 - azar() * 60
        largo, grosor = 200 + azar() * 190, 8 + azar() * 24
        ang = math.radians(-52)
        x2, y2 = x + largo * math.cos(ang), y + largo * math.sin(ang)
        color = colores[0] if azar() < .55 else colores[1]
        out += (f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{color}" '
                f'stroke-width="{grosor:.0f}" stroke-linecap="round" opacity="{.75 + azar() * .25:.2f}"/>')
    return f'<g filter="url(#brocha{sfx})">{out}</g>'


def fondo_chaqueta(k, detras, sfx):
    d = k["diseno"]
    if d == "canesu":
        # canesú de los chándales de los 90: hombros y pecho en otro color, en pico, con ribete de oro
        pico = 212 if detras else 250
        return (f'<path d="M-20,-20 H620 V175 L300,{pico} L-20,175Z" fill="{k["canesu"]}"/>'
                f'<path d="M-20,175 L300,{pico} L620,175" fill="none" stroke="{ORO}" stroke-width="5"/>'
                f'<path d="M-20,186 L300,{pico + 11} L620,186" fill="none" stroke="{BLANCO}" stroke-width="3"/>')
    if d == "cinta":
        # cinta con ATLANTICS del cuello al puño por encima de cada manga
        out = ""
        for i, tr in enumerate(("M62,466 L120,108 C135,86 175,76 232,72", "M368,72 C425,76 465,86 480,108 L538,466")):
            out += (f'<path d="{tr}" fill="none" stroke="{ORO}" stroke-width="32"/>'
                    f'<path d="{tr}" fill="none" stroke="{k["cinta"]}" stroke-width="26"/>'
                    + texto_en_trazo(tr, f"ct{sfx}{int(detras)}{i}", EQUIPO, 15, k["cinta_txt"]))
        return out
    if d == "ola":
        return (ola(392, 30, k["olas"][1], ORO, 0) + ola(430, 24, k["olas"][0], None, 90)
                + ola(470, 18, k["base"], ORO, 40))
    return pinceladas(k["trazos"], 7 if detras else 3, sfx)


def chaqueta(k, detras, sfx):
    id_ = f"c{sfx}{'d' if detras else 'f'}"
    escudo = "circular sin fondo.png"
    f = [f'<clipPath id="{id_}"><path d="{C_CUERPO}"/></clipPath>',
         f'<path d="{C_CUERPO}" fill="{k["base"]}"/>',
         f'<g clip-path="url(#{id_})">{fondo_chaqueta(k, detras, sfx)}'
         f'{cost("M232,62 C190,120 160,180 150,232", .35)}{cost("M368,62 C410,120 440,180 450,232", .35)}'
         f'<rect x="152" y="500" width="296" height="30" fill="{k["remate"]}"/>'
         f'<polygon points="40,470 110,474 108,514 42,512" fill="{k["remate"]}"/>'
         f'<polygon points="490,474 560,470 558,512 492,514" fill="{k["remate"]}"/>']
    if detras:
        f.append(letras(EQUIPO, 300, 170, 50, k["letra"], None, None, esp=4))
        if k["diseno"] == "ola":
            f.append(f'<text x="300" y="200" text-anchor="middle" font-family="Oswald" font-weight="500" '
                     f'font-size="14" letter-spacing="3" fill="{ORO}">CORUÑA · {COORDS}</text>')
    else:
        f.append(letras(EQUIPO, 232, 158, 22, k["letra"], None, None, esp=2)
                 + imagen(aqui.parent / escudo, 370, 150, 64)
                 + f'<path d="M300,60 V530" stroke="{LINEA}" stroke-width="2.4"/>'
                 + cost("M292,64 V526 M308,64 V526", .45)
                 + f'<rect x="293" y="62" width="14" height="22" rx="3" fill="{ORO}" stroke="{LINEA}" stroke-width="1"/>'
                 + cost("M182,390 L200,450 M418,390 L400,450", .7))
    f.append('</g>' + contorno(C_CUERPO))
    cuello = ("M228,55 C260,64 340,64 372,55 L378,18 C340,26 260,26 222,18 Z" if not detras else
              "M228,55 C260,48 340,48 372,55 L376,20 C340,12 260,12 224,20 Z")
    f.append(f'<path d="{cuello}" fill="{k["remate"]}"/>' + contorno(cuello, 2))
    if not detras:
        f.append(f'<path d="M300,24 V62" stroke="{LINEA}" stroke-width="2"/>')
    return "".join(f)


P_FORMA = ("M40,0 H360 L362,30 L380,520 L380,560 L232,560 L230,520 L205,142 L195,142 L170,520 "
           "L168,560 L20,560 L20,520 L38,30 Z")


def pantalon(k, detras, sfx):
    id_ = f"p{sfx}{'d' if detras else 'f'}"
    t1, t2 = k["tiras"]
    tiras = (f'<polygon points="38,30 46,30 29,520 20,520" fill="{t1}"/>'
             f'<polygon points="46,30 51,30 34,520 29,520" fill="{t2}"/>'
             f'<polygon points="362,30 354,30 371,520 380,520" fill="{t1}"/>'
             f'<polygon points="354,30 349,30 366,520 371,520" fill="{t2}"/>')
    if k["diseno"] == "cinta":
        tiras = ""
        for i, tr in enumerate(("M50,34 L33,516", "M350,34 L367,516")):
            tiras += (f'<path d="{tr}" fill="none" stroke="{ORO}" stroke-width="28"/>'
                      f'<path d="{tr}" fill="none" stroke="{k["cinta"]}" stroke-width="22"/>'
                      + texto_en_trazo(tr, f"pt{sfx}{int(detras)}{i}", EQUIPO, 13, k["cinta_txt"], 8))
    bolsillos = ("" if detras else
                 f'<path d="M76,48 L96,176 M324,48 L304,176" stroke="{k["bolsillo"]}" stroke-width="2.4"/>')
    return (f'<clipPath id="{id_}"><path d="{P_FORMA}"/></clipPath>'
            f'<path d="{P_FORMA}" fill="{k["pantalon"]}"/>'
            f'<g clip-path="url(#{id_})">{tiras}{bolsillos}'
            f'<rect x="0" y="0" width="400" height="30" fill="{k["pant_rib"]}"/>{canale(40, 0, 360, 30)}'
            f'<rect x="0" y="520" width="400" height="40" fill="{k["pant_rib"]}"/>'
            f'{canale(20, 520, 168, 560)}{canale(232, 520, 380, 560)}'
            f'<line x1="0" y1="30" x2="400" y2="30" stroke="{LINEA}" stroke-width="1.6"/>'
            f'<line x1="0" y1="520" x2="400" y2="520" stroke="{LINEA}" stroke-width="1.6"/>'
            f'{"" if detras else cost("M200,34 V120", .6)}</g>'
            + contorno(P_FORMA)
            + ('' if detras else f'<path d="M190,6 Q200,40 210,6" fill="none" stroke="{BLANCO}" stroke-width="2.4"/>'))


# ── HOJAS ────────────────────────────────────────────────────────────────────────────────
def filtros(sfx):
    return (f'<filter id="brocha{sfx}" x="-10%" y="-10%" width="120%" height="120%">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.018 0.06" numOctaves="2" seed="4"/>'
            '<feDisplacementMap in="SourceGraphic" scale="14"/></filter>'
            f'<filter id="jaspe{sfx}"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2"/>'
            '<feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".22"/></feComponentTransfer>'
            '<feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>')


def ficha_sudadera(k, sfx):
    return (f'<defs>{filtros(sfx)}</defs>'
            f'<g transform="translate(60,70) scale(1.3)">{sudadera(k, False, sfx)}</g>'
            f'<g transform="translate(960,70) scale(1.3)">{sudadera(k, True, sfx)}</g>'), 900


def ficha_chandal(k, sfx):
    return (f'<defs>{filtros(sfx)}</defs>'
            f'<g transform="translate(60,40) scale(1.3)">{chaqueta(k, False, sfx)}</g>'
            f'<g transform="translate(960,40) scale(1.3)">{chaqueta(k, True, sfx)}</g>'
            f'<g transform="translate(260,790) scale(1.05)">{pantalon(k, False, sfx)}</g>'
            f'<g transform="translate(1110,790) scale(1.05)">{pantalon(k, True, sfx)}</g>'), 1400


def svg(cuerpo, alto):
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap">
<style>html,body{{margin:0;background:#fff}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="{alto}" viewBox="0 0 1800 {alto}">
<rect width="1800" height="{alto}" fill="#fff"/>{cuerpo}</svg>'''


def comparativa(ficha, opciones):
    """Las cuatro opciones en una hoja 2x2, con su nombre encima."""
    _, alto = ficha(opciones[0], "x")
    celda_alto = alto / 2 + 60
    out = ""
    for i, k in enumerate(opciones):
        cuerpo, _ = ficha(k, f"c{i}")
        x, y = (i % 2) * 900, (i // 2) * celda_alto
        out += (f'<g transform="translate({x},{y})">'
                f'<text x="30" y="44" font-family="Oswald" font-weight="700" font-size="30" fill="{TEAL}">{k["titulo"].upper()}</text>'
                f'<g transform="translate(0,60) scale(.5)">{cuerpo}</g></g>')
    total = math.ceil(len(opciones) / 2) * celda_alto
    out += (f'<line x1="900" y1="20" x2="900" y2="{total - 20}" stroke="#ddd" stroke-width="2"/>'
            + "".join(f'<line x1="20" y1="{celda_alto * f}" x2="1780" y2="{celda_alto * f}" stroke="#ddd" stroke-width="2"/>'
                      for f in range(1, math.ceil(len(opciones) / 2))))
    return svg(out, int(total)), int(total)


trabajos = {}
for nombre, ficha, opciones in (("sudadera", ficha_sudadera, SUDADERAS), ("chandal", ficha_chandal, CHANDALES)):
    for i, k in enumerate(opciones, 1):
        cuerpo, alto = ficha(k, str(i))
        trabajos[f"boceto-{nombre}-{i}"] = (svg(cuerpo, alto), alto)
    trabajos[f"opciones-{nombre}"] = comparativa(ficha, opciones)

with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, (html, alto) in trabajos.items():
        pg = b.new_page(viewport={"width": 1800, "height": alto})
        ruta = aqui / "_render.html"
        ruta.write_text(html, encoding="utf-8")
        pg.goto(ruta.as_uri()); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(aqui / f"{nombre}.png")); pg.close(); print("ok", f"{nombre}.png")
    ruta.unlink()
    b.close()
