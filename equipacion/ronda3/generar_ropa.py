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

HUESO = "#EEE7D6"   # blanco roto de las prendas retro

SUDADERAS = [
    # Pro Standard Classic Chenille: un parche grande de felpa en el pecho y parches pequeños en las mangas
    dict(_TEAL, titulo="1 · Parche de felpa (Pro Standard) · teal", diseno="chenille"),
    # Nike Sideline Club de college: el nombre cosido en tackle twill a todo el pecho, capucha forrada en contraste
    dict(_BLANCA, titulo="2 · Tackle twill (college) · blanca", diseno="twill", hueco=TEAL_CLARO),
    # Sudadera de banda sin mangas (la de Oregon para entrenar)
    dict(_MARINO, titulo="3 · Sin mangas para entrenar · azul marino", diseno="sinmangas", forma="sinmangas"),
    # Estampado integral de olas en tono sobre tono, como las plumas de Oregon
    dict(_TEAL, titulo="4 · Estampado integral de olas · teal oscuro", diseno="estampado", cuerpo=TEAL_OSC,
         mangas=TEAL_OSC, capucha=TEAL_OSC, rib=TEAL, hueco="#003a45", tono="#0a5d6d"),
    # Coach quarter-zip: sin capucha, cuello alto con media cremallera
    dict(_GRIS, titulo="5 · Cuello con cremallera (coach) · gris", diseno="coach_zip", forma="cremallera"),
    # Mitchell & Ness throwback: nombre en letra de firma con cola, sobre blanco roto
    dict(_BLANCA, titulo="6 · Firma retro (Mitchell & Ness) · blanco roto", diseno="script", cuerpo=HUESO,
         mangas=HUESO, capucha=HUESO, hueco="#ddd3bd", rib=TEAL),
]
CHANDALES = [
    # Chaqueta de satén de Pro Standard: brillo de satén y Poseidón grande a la espalda
    dict(titulo="1 · Satén (Pro Standard) · azul marino", diseno="saten", base=MARINO, remate=TEAL, letra=BLANCO,
         rib_rayas=(ORO, TEAL), pantalon=MARINO, pant_rib=TEAL, tiras=(TEAL, ORO), bolsillo=BLANCO, saten=True),
    # Warm-up de Mitchell & Ness: bloques de color en diagonal
    dict(titulo="2 · Bloques en diagonal (Mitchell & Ness) · tricolor", diseno="bloques", base=TEAL,
         bloques=(BLANCO, MARINO), remate=MARINO, letra=MARINO, pantalon=MARINO, pant_rib=MARINO_OSC,
         tiras=(TEAL, BLANCO), bolsillo=BLANCO, pierna=TEAL),
    # Cortavientos Starter de media cremallera con bolsillo canguro
    dict(titulo="3 · Cortavientos media cremallera (Starter) · teal y blanco", diseno="anorak", forma="anorak",
         base=TEAL, canesu=BLANCO, remate=BLANCO, letra=TEAL, pantalon=TEAL, pant_rib=BLANCO, tiras=(BLANCO, ORO),
         bolsillo=BLANCO),
    # Estampado integral de olas en tono sobre tono
    dict(titulo="4 · Estampado integral de olas · teal", diseno="estampado", base=TEAL, tono="#0a7f94",
         remate=TEAL_OSC, letra=BLANCO, pantalon=TEAL_OSC, pant_rib="#003a45", tiras=(BLANCO, ORO), bolsillo=BLANCO),
    # Chaqueta de parches de felpa de Pro Standard
    dict(titulo="5 · Parches de felpa (Pro Standard) · blanca", diseno="parches", base=BLANCO, remate=TEAL,
         letra=TEAL, rib_rayas=(ORO, BLANCO), pantalon=TEAL, pant_rib=TEAL_OSC, tiras=(BLANCO, ORO), bolsillo=BLANCO),
    # Chaqueta partida en vertical, media de cada color (college split)
    dict(titulo="6 · Partida en dos (college) · teal y azul marino", diseno="partida", base=TEAL, otra=MARINO,
         remate=ORO, letra=BLANCO, pantalon=MARINO, pant_rib=MARINO_OSC, tiras=(TEAL, ORO), bolsillo=BLANCO),
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


def parche(x, y, r, fondo, borde, dentro):
    """Parche de felpa (chenille): círculo peludo con borde de otro color y pespunte."""
    return (f'<circle cx="{x}" cy="{y}" r="{r + 7}" fill="{borde}"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fondo}" filter="url(#felpa)"/>'
            f'<circle cx="{x}" cy="{y}" r="{r + 3}" fill="none" stroke="{LINEA}" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>'
            + dentro)


def estampado(pid, fondo, tono):
    """Olas repetidas en tono sobre tono por toda la prenda."""
    return (f'<pattern id="{pid}" width="60" height="26" patternUnits="userSpaceOnUse">'
            f'<rect width="60" height="26" fill="{fondo}"/>'
            f'<path d="M0,16 C10,6 20,6 30,16 S50,26 60,16" fill="none" stroke="{tono}" stroke-width="4"/></pattern>'
            f'<rect x="-40" y="-40" width="700" height="700" fill="url(#{pid})"/>')


def firma(txt, x, y, size, fill, perfil):
    """Letra de firma retro con cola por debajo (la de las sudaderas throwback)."""
    base = f'x="{x}" y="{y}" text-anchor="middle" font-family="Yellowtail" font-size="{size}"'
    cola = f'M{x - size * 1.7},{y + size * .22} C{x - size * .5},{y + size * .05} {x + size * .8},{y + size * .3} {x + size * 1.9},{y + size * .02}'
    return (f'<path d="{cola}" fill="none" stroke="{perfil}" stroke-width="{size * .16:.1f}" stroke-linecap="round"/>'
            f'<path d="{cola}" fill="none" stroke="{fill}" stroke-width="{size * .07:.1f}" stroke-linecap="round"/>'
            f'<text {base} fill="{perfil}" stroke="{perfil}" stroke-width="{size * .1:.1f}" stroke-linejoin="round">{txt}</text>'
            f'<text {base} fill="{fill}">{txt}</text>')


def saten(pid):
    """Brillo de satén: bandas claras en diagonal."""
    return (f'<linearGradient id="{pid}" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".22"/>'
            '<stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".14"/>'
            '<stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<rect x="-40" y="-40" width="700" height="700" fill="url(#{pid})"/>')


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


def rayas_antebrazo(k, clip, y=430):
    """Dos rayas en los antebrazos, solo en las mangas."""
    return (f'<g clip-path="url(#{clip})"><rect x="0" y="{y}" width="600" height="14" fill="{ORO}"/>'
            f'<rect x="0" y="{y + 20}" width="600" height="9" fill="{BLANCO if k["cuerpo"] != BLANCO else TEAL}"/></g>')


def canesu_sudadera(k):
    return (f'<rect x="-20" y="-20" width="640" height="225" fill="{k["canesu"]}"/>'
            f'<rect x="-20" y="205" width="640" height="5" fill="{ORO}"/>'
            f'<rect x="-20" y="214" width="640" height="3" fill="{BLANCO}"/>')


def franja_pecho(k, txt, size):
    return (f'<rect x="-20" y="244" width="640" height="5" fill="{ORO}"/>'
            f'<rect x="-20" y="251" width="640" height="62" fill="{k["franja"]}"/>'
            f'<rect x="-20" y="315" width="640" height="5" fill="{ORO}"/>'
            + letras(txt, 300, 298, size, BLANCO, None, None, esp=4))


def pecho_sudadera(k, sfx):
    d = k["diseno"]
    clip = f"ms{sfx}f"
    if d == "chenille":
        return (parche(300, 318, 78, TEAL_OSC, BLANCO, imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 318, 118))
                + parche(80, 330, 24, BLANCO, ORO, letras("A", 80, 344, 38, TEAL, None, None, esp=0))
                + parche(520, 330, 24, BLANCO, ORO, imagen(aqui.parent / "tridente sin fondo.png", 520, 330, 38)))
    if d == "twill":
        # letras cosidas: doble capa con pespunte en zigzag alrededor
        return (letras(EQUIPO, 300, 330, 62, TEAL, ORO, TEAL, esp=2)
                + f'<text x="300" y="330" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="62" '
                  f'letter-spacing="2" fill="none" stroke="{BLANCO}" stroke-width="1.2" stroke-dasharray="3 3">{EQUIPO}</text>'
                + f'<text x="300" y="372" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="18" '
                  f'letter-spacing="10" fill="{TEAL}">CORUÑA</text>')
    if d == "sinmangas":
        return (imagen(aqui.parent / "tridente sin fondo.png", 300, 300, 110)
                + letras(EQUIPO, 300, 396, 34, k["letra"], k["perfil"], None, esp=4))
    if d == "estampado":
        return (estampado(f"ol{sfx}f", k["cuerpo"], k["tono"])
                + parche(300, 312, 64, k["cuerpo"], ORO, imagen(aqui.parent / "circular sin fondo.png", 300, 312, 118)))
    if d == "coach_zip":
        return (imagen(aqui.parent / "circular sin fondo.png", 380, 190, 70)
                + letras(EQUIPO, 300, 342, 46, k["letra"], k["perfil"], k["hilo"], esp=3)
                + f'<text x="300" y="372" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="14" '
                  f'letter-spacing="3" fill="{k["letra"]}">{COORDS}</text>')
    if d == "script":
        return (firma("Atlantics", 300, 330, 92, TEAL, ORO)
                + f'<text x="300" y="392" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="18" '
                  f'letter-spacing="10" fill="{TEAL}">CORUÑA</text>')
    if d == "sideline":
        return (imagen(aqui.parent / "circular sin fondo.png", 300, 318, 118)
                + letras(EQUIPO, 300, 405, 22, k["letra"], None, None, esp=5))
    if d == "coach":
        return (canesu_sudadera(k)
                + f'<text x="300" y="284" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="18" '
                  f'letter-spacing="8" fill="{k["letra"]}">CORUÑA</text>'
                + letras(EQUIPO, 300, 342, 50, k["letra"], k["perfil"], k["hilo"], esp=2))
    if d == "mascota":
        return (letras_arco(EQUIPO, "M170,300 Q300,212 430,300", f"arco{sfx}", 46, k["letra"], k["perfil"], k["hilo"])
                + imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 352, 100))
    if d == "varsity":
        return letras("A", 228, 318, 120, k["varsity"], BLANCO, ORO, esp=0) + rayas_antebrazo(k, clip)
    if d == "dorsal":
        return (imagen(aqui.parent / "tridente sin fondo.png", 228, 258, 64)
                + rayas_antebrazo(k, clip, 462))
    if d == "franja":
        return franja_pecho(k, EQUIPO, 44)
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
    clip = f"ms{sfx}d"
    if d == "chenille":
        return parche(300, 350, 34, BLANCO, ORO, letras("A", 300, 368, 52, TEAL, None, None, esp=0)) \
            + letras("#WEAREATLANTICS", 300, 440, 24, k["letra"], None, None, esp=3)
    if d == "twill":
        return letras("CORUÑA", 300, 250, 26, TEAL, None, None, esp=12)
    if d == "sinmangas":
        return letras("PLAYER NAME", 300, 250, 28, k["letra"], None, None, esp=3) + \
            letras("10", 300, 440, 170, k["letra"], k["perfil"], k["hilo"], esp=4)
    if d == "estampado":
        return estampado(f"ol{sfx}d", k["cuerpo"], k["tono"]) + letras(EQUIPO, 300, 260, 52, BLANCO, ORO, None, esp=5)
    if d == "coach_zip":
        return letras(EQUIPO, 300, 180, 40, k["letra"], None, None, esp=6)
    if d == "script":
        return letras("CORUÑA", 300, 260, 24, TEAL, None, None, esp=12) + firma("Atlantics", 300, 350, 70, TEAL, ORO)
    if d == "sideline":
        return letras(EQUIPO, 300, 240, 28, k["letra"], None, None, esp=6)
    if d == "coach":
        return canesu_sudadera(k) + letras("#WEAREATLANTICS", 300, 330, 30, k["letra"], None, None, esp=2)
    if d == "mascota":
        return (imagen(aqui.parent / "tridente sin fondo.png", 300, 262, 70)
                + f'<text x="300" y="326" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="14" '
                  f'letter-spacing="3" fill="{k["letra"]}">CORUÑA · {COORDS}</text>')
    if d == "varsity":
        return (letras_arco(EQUIPO, "M150,338 Q300,246 450,338", f"arcod{sfx}", 54, k["varsity"], BLANCO, ORO)
                + letras("CORUÑA", 300, 386, 26, BLANCO, None, None, esp=10) + rayas_antebrazo(k, clip))
    if d == "dorsal":
        return (letras("PLAYER NAME", 300, 244, 30, k["letra"], None, None, esp=3)
                + letras("10", 300, 452, 190, k["letra"], k["perfil"], k["hilo"], esp=4)
                + rayas_antebrazo(k, clip, 462))
    if d == "franja":
        return franja_pecho(k, "#WEAREATLANTICS", 30)
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


S_SINMANGAS = ("M200,95 C170,97 145,104 130,116 C152,165 162,232 152,300 L152,590 L448,590 L448,300 "
               "C438,232 448,165 470,116 C455,104 430,97 400,95 Z")


def sudadera(k, detras, sfx):
    forma = k.get("forma")
    S_CUERPO = S_SINMANGAS if forma == "sinmangas" else globals()["S_CUERPO"]
    id_ = f"s{sfx}{'d' if detras else 'f'}"
    jaspe = f' filter="url(#jaspe{sfx})"' if k.get("jaspe") else ""
    punos = (f'<rect x="152" y="540" width="296" height="50" fill="{k["rib"]}"/>{canale(152, 540, 448, 590)}'
             f'<rect x="38" y="525" width="74" height="50" fill="{k["rib"]}"/>{canale(38, 525, 112, 575)}'
             f'<rect x="488" y="525" width="74" height="50" fill="{k["rib"]}"/>{canale(488, 525, 562, 575)}')
    if k.get("rib_rayas"):   # rayas de varsity en el punto de puños y cintura
        c1, c2 = k["rib_rayas"]
        punos += (f'<rect x="152" y="553" width="296" height="6" fill="{c1}"/><rect x="152" y="565" width="296" height="4" fill="{c2}"/>'
                  + "".join(f'<rect x="{x}" y="538" width="74" height="6" fill="{c1}"/><rect x="{x}" y="550" width="74" height="4" fill="{c2}"/>'
                            for x in (38, 488)))
    raglan = (cost("M222,104 C200,180 165,240 148,300", .35) + cost("M378,104 C400,180 435,240 452,300", .35))
    f = [f'<clipPath id="{id_}"><path d="{S_CUERPO}"/></clipPath>',
         f'<clipPath id="m{id_}"><path d="{S_MANGAS}"/></clipPath>',
         f'<path d="{S_CUERPO}" fill="{k["cuerpo"]}"{jaspe}/>',
         f'<g clip-path="url(#{id_})"><path d="{S_MANGAS}" fill="{k["mangas"]}"{jaspe}/>{raglan}']
    if detras:
        capucha = "M205,100 C190,15 250,-4 300,-4 C350,-4 410,15 395,100 C380,160 330,188 300,190 C270,188 220,160 205,100Z"
        f.append(espalda_sudadera(k, sfx) + f'{punos}</g>')
        f.append(contorno(S_CUERPO))
        if forma == "cremallera":
            cuello = "M226,98 C260,88 340,88 374,98 L378,58 C340,48 260,48 222,58 Z"
            f.append(f'<path d="{cuello}" fill="{k["rib"]}"/>' + contorno(cuello, 2))
        else:
            f.append(f'<path d="{capucha}" fill="{k["capucha"]}"{jaspe}/>' + contorno(capucha)
                     + f'<path d="M300,-2 V188" stroke="{LINEA}" stroke-width="1.4" opacity=".5"/>')
    else:
        capucha = "M200,98 C185,20 245,0 300,0 C355,0 415,20 400,98 Z"
        hueco = "M232,98 C230,45 265,26 300,26 C335,26 370,45 368,98 L300,150 Z"
        bolsillo = "M205,420 L395,420 L425,532 L175,532 Z"
        if forma != "cremallera":
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
                 + ("" if forma == "sinmangas" else imagen(aqui.parent / "tridente sin fondo.png", 75, 498, 36)) + '</g>')
        f.append(contorno(S_CUERPO))
        if forma == "cremallera":
            cuello = "M226,98 C260,112 340,112 374,98 L378,58 C340,70 260,70 222,58 Z"
            f.append(f'<path d="{cuello}" fill="{k["rib"]}"/>' + contorno(cuello, 2)
                     + f'<path d="M300,64 V250" stroke="{LINEA}" stroke-width="2.4"/>' + cost("M293,66 V248 M307,66 V248", .5)
                     + f'<rect x="293" y="104" width="14" height="24" rx="3" fill="{ORO}" stroke="{LINEA}" stroke-width="1"/>')
        else:
            f.append(f'<path d="{hueco}" fill="{k["hueco"]}"/>' + contorno(hueco, 2))
        for x0, x1 in (() if forma == "cremallera" else ((282, 277), (318, 323))):   # cordones con puntera de oro
            f.append(f'<line x1="{x0}" y1="128" x2="{x1}" y2="236" stroke="{k["cordon"]}" stroke-width="5" stroke-linecap="round"/>'
                     f'<line x1="{x1}" y1="224" x2="{x1}" y2="244" stroke="{ORO}" stroke-width="6" stroke-linecap="round"/>'
                     f'<circle cx="{x0}" cy="128" r="5" fill="{BLANCO}" stroke="{LINEA}" stroke-width="1"/>')
    f.append(contorno("M222,100 C200,180 165,240 148,300 M378,100 C400,180 435,240 452,300", 1.2)
             if k["mangas"] != k["cuerpo"] and forma != "sinmangas" else "")
    if forma == "sinmangas":
        f.append(f'<path d="M130,116 C152,165 162,232 152,300 M470,116 C448,165 438,232 448,300" fill="none" '
                 f'stroke="{k["rib"]}" stroke-width="9"/>'
                 + contorno("M130,116 C152,165 162,232 152,300 M470,116 C448,165 438,232 448,300", 1.4))
    for x0 in (() if forma == "sinmangas" else (38, 488)):
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


C_MANGAS = ("M228,55 C170,62 125,72 105,95 L40,470 L42,512 L108,514 L112,482 L150,232 C160,180 190,120 232,62 Z "
            "M372,55 C430,62 475,72 495,95 L560,470 L558,512 L492,514 L488,482 L450,232 C440,180 410,120 368,62 Z")


def banda_cruzada(k, detras, sfx):
    """Banda ancha del hombro a la cadera, con ribetes de oro y el nombre dentro."""
    a, b = ((-20, 120), (640, 500)) if not detras else ((-20, 500), (640, 120))
    dx, dy = b[0] - a[0], b[1] - a[1]; L = (dx * dx + dy * dy) ** .5
    nx, ny = -dy / L, dx / L
    def tira(h, color):
        pts = [(a[0] + nx * h, a[1] + ny * h), (b[0] + nx * h, b[1] + ny * h),
               (b[0] - nx * h, b[1] - ny * h), (a[0] - nx * h, a[1] - ny * h)]
        return f'<polygon points="{" ".join(f"{x:.0f},{y:.0f}" for x, y in pts)}" fill="{color}"/>'
    pid = f"bc{sfx}{int(detras)}"
    return (tira(42, ORO) + tira(36, k["banda"])
            + f'<path id="{pid}" d="M{a[0]},{a[1]} L{b[0]},{b[1]}" fill="none"/>'
            f'<text font-family="Oswald" font-weight="700" font-size="40" letter-spacing="6" fill="{BLANCO}" '
            f'text-anchor="middle" dominant-baseline="middle"><textPath href="#{pid}" startOffset="{36 if not detras else 50}%">'
            f'{EQUIPO}</textPath></text>')


def fondo_chaqueta(k, detras, sfx):
    d = k["diseno"]
    if d == "saten":
        return ""
    if d == "bloques":
        b1, b2 = k["bloques"]
        return (f'<polygon points="-20,250 620,120 620,330 -20,460" fill="{b1}"/>'
                f'<polygon points="-20,460 620,330 620,700 -20,700" fill="{b2}"/>'
                f'<path d="M-20,250 L620,120 M-20,460 L620,330" stroke="{ORO}" stroke-width="4"/>')
    if d == "anorak":
        return (f'<path d="M-20,-20 H620 V190 H-20Z" fill="{k["canesu"]}"/>'
                f'<rect x="-20" y="190" width="640" height="6" fill="{ORO}"/>')
    if d == "estampado":
        return estampado(f"olc{sfx}{int(detras)}", k["base"], k["tono"])
    if d == "parches":
        return ""
    if d == "partida":
        return (f'<rect x="{300 if not detras else -20}" y="-20" width="{320 if not detras else 320}" height="700" fill="{k["otra"]}"/>')
    if d == "banda":
        return banda_cruzada(k, detras, sfx)
    if d == "franjas":
        c1, c2, c3 = k["franjas"]
        return (f'<rect x="-20" y="205" width="640" height="58" fill="{c1}"/>'
                f'<rect x="-20" y="268" width="640" height="8" fill="{c2}"/>'
                f'<rect x="-20" y="281" width="640" height="6" fill="{c3}"/>')
    if d == "warmup":
        r1, r2 = k["rayas"]
        mangas = (f'<g clip-path="url(#mc{sfx}{int(detras)})">'
                  + "".join(f'<rect x="0" y="{y}" width="600" height="8" fill="{c}"/>'
                            for y, c in ((372, r1), (388, r2), (404, r1))) + '</g>')
        if detras:
            return mangas
        return (mangas + f'<rect x="258" y="60" width="12" height="440" fill="{r1}"/>'
                f'<rect x="274" y="60" width="6" height="440" fill="{r2}"/>'
                f'<rect x="330" y="60" width="12" height="440" fill="{r1}"/>'
                f'<rect x="320" y="60" width="6" height="440" fill="{r2}"/>')
    if d == "raglan":
        return (f'<path d="{C_MANGAS}" fill="{k["mangas"]}"/>'
                f'<path d="M232,62 C190,120 160,180 150,232 M368,62 C410,120 440,180 450,232" fill="none" '
                f'stroke="{ORO}" stroke-width="5"/>')
    if d in ("varsity", "partido"):
        return ""
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
         f'<clipPath id="mc{sfx}{int(detras)}"><path d="{C_MANGAS}"/></clipPath>',
         f'<path d="{C_CUERPO}" fill="{k["base"]}"/>',
         f'<g clip-path="url(#{id_})">{fondo_chaqueta(k, detras, sfx)}'
         f'{cost("M232,62 C190,120 160,180 150,232", .35)}{cost("M368,62 C410,120 440,180 450,232", .35)}'
         f'<rect x="152" y="500" width="296" height="30" fill="{k["remate"]}"/>'
         f'<polygon points="40,470 110,474 108,514 42,512" fill="{k["remate"]}"/>'
         f'<polygon points="490,474 560,470 558,512 492,514" fill="{k["remate"]}"/>']
    if k.get("rib_rayas"):   # rayas de varsity en cintura y puños
        c1, c2 = k["rib_rayas"]
        f.append(f'<rect x="152" y="507" width="296" height="5" fill="{c1}"/><rect x="152" y="517" width="296" height="4" fill="{c2}"/>'
                 f'<path d="M41,486 L110,490 M558,486 L490,490" stroke="{c1}" stroke-width="5"/>'
                 f'<path d="M41,497 L109,501 M558,497 L491,501" stroke="{c2}" stroke-width="4"/>')
    d = k["diseno"]
    if detras and d == "franjas":
        f.append(letras(EQUIPO, 300, 250, 40, k["letra"], None, None, esp=6))
    elif detras and d == "varsity":
        f.append(letras_arco(EQUIPO, "M150,200 Q300,110 450,200", f"arcoc{sfx}", 52, k["varsity"], BLANCO, ORO)
                 + letras("CORUÑA", 300, 246, 24, BLANCO, None, None, esp=10))
    elif detras and d == "saten":
        f.append(parche(300, 300, 96, TEAL_OSC, ORO, imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 300, 150))
                 + letras(EQUIPO, 300, 160, 44, k["letra"], ORO, None, esp=5))
    elif detras and d == "parches":
        f.append(letras_arco(EQUIPO, "M150,200 Q300,120 450,200", f"arcop{sfx}", 50, TEAL, ORO, None)
                 + parche(300, 320, 70, TEAL_OSC, ORO, imagen(aqui.parent / "cabeza minimalista sin fondo.png", 300, 320, 104)))
    elif detras and d == "bloques":
        f.append(letras(EQUIPO, 300, 300, 50, k["letra"], None, None, esp=4))
    elif detras and d == "partida":
        f.append(letras(EQUIPO, 300, 170, 50, k["letra"], ORO, None, esp=4))
    elif detras and d == "anorak":
        f.append(letras(EQUIPO, 300, 150, 46, TEAL, None, None, esp=4)
                 + letras("#WEAREATLANTICS", 300, 300, 26, BLANCO, None, None, esp=3))
    elif detras and d == "raglan":
        f.append(letras(EQUIPO, 300, 222, 38, k["letra"], None, None, esp=4))
    elif detras:
        f.append(letras(EQUIPO, 300, 170, 50, k["letra"], None, None, esp=4))
        if k["diseno"] == "ola":
            f.append(f'<text x="300" y="200" text-anchor="middle" font-family="Oswald" font-weight="500" '
                     f'font-size="14" letter-spacing="3" fill="{ORO}">CORUÑA · {COORDS}</text>')
    else:
        if d == "banda":
            pecho = ""
        elif d == "varsity":
            pecho = (letras("A", 222, 236, 110, k["varsity"], BLANCO, ORO, esp=0)
                     + imagen(aqui.parent / "tridente sin fondo.png", 380, 172, 60))
        elif d == "partido":
            pecho = (letras("ATLAN", 238, 206, 52, k["letra"], k["perfil"], None, esp=2)
                     + letras("TICS", 358, 206, 52, k["letra"], k["perfil"], None, esp=2))
        elif d == "saten":
            pecho = (parche(215, 175, 30, TEAL_OSC, ORO, letras("A", 215, 192, 46, BLANCO, None, None, esp=0))
                     + imagen(aqui.parent / "tridente sin fondo.png", 385, 175, 66))
        elif d == "parches":
            pecho = (parche(215, 180, 34, TEAL, ORO, letras("A", 215, 199, 52, BLANCO, None, None, esp=0))
                     + parche(385, 180, 34, TEAL_OSC, BLANCO, imagen(aqui.parent / "tridente sin fondo.png", 385, 180, 50))
                     + parche(80, 330, 22, BLANCO, ORO, letras("10", 80, 341, 28, TEAL, None, None, esp=0))
                     + parche(520, 330, 22, ORO, BLANCO, imagen(aqui.parent / "cabeza minimalista sin fondo.png", 520, 330, 34)))
        elif d == "anorak":
            pecho = (letras(EQUIPO, 300, 296, 40, BLANCO, None, None, esp=4)
                     + f'<path d="M180,330 L420,330 L440,450 L160,450 Z" fill="{k["base"]}" stroke="{LINEA}" stroke-width="1.8"/>'
                     + cost("M186,338 L414,338 M180,338 L166,440 M420,338 L434,440", .5)
                     + imagen(aqui.parent / "circular sin fondo.png", 300, 390, 56))
        elif d == "partida":
            pecho = (letras("ATLAN", 238, 206, 52, BLANCO, ORO, None, esp=2)
                     + letras("TICS", 358, 206, 52, BLANCO, ORO, None, esp=2))
        elif d == "bloques":
            pecho = letras(EQUIPO, 232, 158, 22, BLANCO, None, None, esp=2) + imagen(aqui.parent / escudo, 370, 150, 64)
        elif d == "estampado":
            pecho = (parche(215, 175, 36, k["base"], ORO, imagen(aqui.parent / escudo, 215, 175, 70))
                     + letras(EQUIPO, 385, 184, 24, BLANCO, None, None, esp=2))
        elif d == "raglan":
            pecho = letras(EQUIPO, 246, 162, 18, k["letra"], None, None, esp=2) + imagen(aqui.parent / escudo, 362, 156, 56)
        elif d == "warmup":
            pecho = letras(EQUIPO, 200, 158, 20, k["letra"], None, None, esp=2) + imagen(aqui.parent / escudo, 400, 150, 60)
        else:
            pecho = letras(EQUIPO, 232, 158, 22, k["letra"], None, None, esp=2) + imagen(aqui.parent / escudo, 370, 150, 64)
        f.append(pecho
                 + (f'<path d="M300,60 V250" stroke="{LINEA}" stroke-width="2.4"/>' + cost("M292,64 V248 M308,64 V248", .45)
                    if d == "anorak" else
                    f'<path d="M300,60 V530" stroke="{LINEA}" stroke-width="2.4"/>' + cost("M292,64 V526 M308,64 V526", .45))
                 + f'<rect x="293" y="62" width="14" height="22" rx="3" fill="{ORO}" stroke="{LINEA}" stroke-width="1"/>'
                 + ("" if d == "anorak" else cost("M182,390 L200,450 M418,390 L400,450", .7)))
    if k.get("saten"):
        f.append(saten(f"sat{sfx}{int(detras)}"))
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
            + (f'<polygon points="0,330 400,330 400,520 0,520" fill="{k["pierna"]}"/>'
               f'<path d="M0,330 H400" stroke="{ORO}" stroke-width="4"/>' if k.get("pierna") else "")
            + (saten(f"satp{sfx}{int(detras)}") if k.get("saten") else "")
            + f'{"" if detras else cost("M200,34 V120", .6)}</g>'
            + contorno(P_FORMA)
            + ('' if detras else f'<path d="M190,6 Q200,40 210,6" fill="none" stroke="{BLANCO}" stroke-width="2.4"/>'))


# ── HOJAS ────────────────────────────────────────────────────────────────────────────────
def filtros(sfx):
    return (f'<filter id="brocha{sfx}" x="-10%" y="-10%" width="120%" height="120%">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.018 0.06" numOctaves="2" seed="4"/>'
            '<feDisplacementMap in="SourceGraphic" scale="14"/></filter>'
            f'<filter id="jaspe{sfx}"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2"/>'
            '<feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".22"/></feComponentTransfer>'
            '<feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>'
            '<filter id="felpa"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="5"/>'
            '<feDisplacementMap in="SourceGraphic" scale="3"/></filter>')


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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Yellowtail&display=swap">
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
