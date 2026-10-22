"""Bocetos de la equipación de flag en ficha técnica (camiseta y pantalón, delante y detrás).

Uso:  python generar.py   -> saca boceto-local.png y boceto-visitante.png en esta carpeta
Los colores y el dorsal se cambian en KITS. Necesita playwright (como redes/plantillas).
"""
import pathlib
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
TEAL, ORO, BLANCO, NEGRO, LINEA = "#006E82", "#D4A843", "#FFFFFF", "#16191c", "#2b2b2b"

KITS = {
    "local": dict(cuerpo=TEAL, cuello=TEAL, num=BLANCO, perfil=ORO, franja=BLANCO, puno=ORO,
                  nombre=BLANCO, hilo="#003f4b", filo=ORO, dentro="#004b59", pantalon=NEGRO, banda=TEAL, banda2=ORO, cintura=NEGRO,
                  manga="numero", hombreras=True, pecho_nombre=True, escudo="tridente"),
    "visitante": dict(cuerpo=BLANCO, cuello=TEAL, num=TEAL, perfil=ORO, franja=TEAL, puno=ORO,
                      nombre=TEAL, hilo=TEAL, filo=None, dentro="#e4e8e9", pantalon=BLANCO, banda=TEAL, banda2=ORO, cintura=BLANCO,
                      manga="tridente", hombreras=False, pecho_nombre=True, escudo=None),
}
DORSAL, NOMBRE, EQUIPO = "10", "PLAYER NAME", "ATLANTICS"

# Silueta de la camiseta en una caja de 600 de ancho
N, Nd, S, Sd = (222, 14), (378, 14), (105, 44), (495, 44)
A, B, C = (6, 200), (62, 240), (130, 172)
Ad, Bd, Cd = (594, 200), (538, 240), (470, 172)
D, E = (124, 548), (476, 548)
cuerpo = (f"M{N[0]},{N[1]} L{S[0]},{S[1]} L{A[0]},{A[1]} L{B[0]},{B[1]} L{C[0]},{C[1]} "
          f"L{D[0]},{D[1]} Q300,560 {E[0]},{E[1]} L{Cd[0]},{Cd[1]} L{Bd[0]},{Bd[1]} "
          f"L{Ad[0]},{Ad[1]} L{Sd[0]},{Sd[1]} L{Nd[0]},{Nd[1]}")


def franjas(k, lado):
    """Puño en oro y franja encima, paralelos al borde de la manga (se recortan con la silueta)."""
    a, b = (A, B) if lado < 0 else (Ad, Bd)
    ux, uy = (0.583 if lado < 0 else -0.583), -0.813   # hacia el hombro
    def banda(t1, t2, color):
        ext = 40  # alarga la banda por los dos lados para que el recorte la cierre
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = (dx * dx + dy * dy) ** .5; dx, dy = dx / L * ext, dy / L * ext
        p = [(a[0] - dx + ux * t1, a[1] - dy + uy * t1), (b[0] + dx + ux * t1, b[1] + dy + uy * t1),
             (b[0] + dx + ux * t2, b[1] + dy + uy * t2), (a[0] - dx + ux * t2, a[1] - dy + uy * t2)]
        return f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in p)}" fill="{color}"/>'
    return banda(-20, 20, k["puno"]) + banda(20, 38, k["franja"])


def tridente(x, y, h, color):
    s = h / 100
    return (f'<g transform="translate({x},{y}) scale({s})" fill="{color}">'
            '<rect x="-4" y="10" width="8" height="90" rx="2"/>'
            '<path d="M0,-6 L9,12 L4,12 L4,40 L-4,40 L-4,12 L-9,12Z"/>'
            '<path d="M-26,4 L-17,20 L-21,20 L-21,40 Q-21,52 -4,54 L-4,46 Q-13,45 -13,38 L-13,20 L-17,20Z"/>'
            '<path d="M26,4 L17,20 L21,20 L21,40 Q21,52 4,54 L4,46 Q13,45 13,38 L13,20 L17,20Z"/>'
            '<rect x="-12" y="58" width="24" height="7" rx="2"/></g>')


# Números de bloque con las esquinas cortadas, como la serigrafía de la NFL. Se dibujan a mano
# (ninguna letra gratuita se parece lo bastante): cada cifra son barras en una caja de 90x150.
W, H, T, CH = 90, 150, 30, 16
_SEG = {"a": (0, 0, W, T), "g": (0, 60, W, T), "d": (0, H - T, W, T), "f": (0, 0, T, 90),
        "b": (W - T, 0, T, 90), "e": (0, 60, T, 90), "c": (W - T, 60, T, 90), "g3": (22, 60, W - 22, T)}
_CIFRAS = {"0": "a b c d e f", "2": "a b g e d", "3": "a b g3 c d", "4": "f b g c", "5": "a f g c d",
           "6": "a f g e d c", "7": "a b c", "8": "a b c d e f g", "9": "a b f g c d"}
_UNO = "20,0 58,0 58,150 24,150 24,34 0,34 0,20"
_ids = iter(range(10 ** 6))


def _octogono(x0, y0, x1, y1, c):
    return f"{x0+c},{y0} {x1-c},{y0} {x1},{y0+c} {x1},{y1-c} {x1-c},{y1} {x0+c},{y1} {x0},{y1-c} {x0},{y0+c}"


def numero(txt, x, y, alto, k, rot=0):
    """Dorsal centrado en x con la base en y, de `alto` px. Relleno k["num"], perfil k["perfil"]
    y por fuera un hilo fino k["hilo"] (el doble perfil de la NFL)."""
    anchos = [58 if d == "1" else W for d in txt]
    total = sum(anchos) + 20 * (len(txt) - 1)
    capas = [(k["hilo"], 16), (k["perfil"], 8), (k["num"], 0)]   # color y grosor del trazo, de fuera a dentro
    salida = ""
    for color, sw in capas:
        grupo, cx = "", 0
        for d, w in zip(txt, anchos):
            if d == "1":
                grupo += f'<polygon points="{" ".join(f"{float(a.split(",")[0]) + cx},{a.split(",")[1]}" for a in _UNO.split())}"/>'
            else:
                barras = "".join(f'<rect x="{sx + cx}" y="{sy}" width="{bw}" height="{bh}"/>'
                                 for sx, sy, bw, bh in (_SEG[s] for s in _CIFRAS[d].split()))
                i, e = next(_ids), sw / 2
                grupo += (f'<clipPath id="o{i}"><polygon points="{_octogono(cx - e, -e, cx + w + e, H + e, CH + e * .41)}"/></clipPath>'
                          f'<g clip-path="url(#o{i})">{barras}</g>')
            cx += w + 20
        trazo = f' stroke="{color}" stroke-width="{sw}" stroke-linejoin="miter"' if sw else ""
        salida += f'<g fill="{color}"{trazo}>{grupo}</g>'
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({alto / H}) translate({-total / 2},{-H})">'
            f'{salida}</g>')


def _imagen(nombre, x, y, alto, rot=0):
    """Un PNG de la carpeta (versión sin fondo, ya recortada) centrado en x, y."""
    import base64
    from PIL import Image
    ruta = aqui / nombre
    w, h = Image.open(ruta).size
    ancho = alto * w / h
    datos = base64.b64encode(ruta.read_bytes()).decode()
    return (f'<g transform="translate({x},{y}) rotate({rot})"><image href="data:image/png;base64,{datos}" '
            f'x="{-ancho / 2}" y="{-alto / 2}" width="{ancho}" height="{alto}"/></g>')


def cabeza(x, y, ancho):
    """La cabeza de Poseidón (cabeza.png, sacada de cabeza minimalista sin fondo.png)."""
    return _imagen("cabeza.png", x, y, ancho * 350 / 360)


def hombreras(color):
    """Las dos franjas de oro de cada hombro, cruzando la costura del hombro hacia abajo."""
    out = ""
    for s_, n_ in ((S, N), (Sd, Nd)):
        dx, dy = n_[0] - s_[0], n_[1] - s_[1]; L = (dx * dx + dy * dy) ** .5; dx, dy = dx / L, dy / L
        px, py = -dy, dx
        if py < 0: px, py = -px, -py            # hacia abajo, dentro de la camiseta
        for t in (.22, .40):
            x0, y0 = s_[0] + (n_[0] - s_[0]) * t, s_[1] + (n_[1] - s_[1]) * t
            w, l = 15, 78
            pts = [(x0 - px * 20, y0 - py * 20), (x0 + dx * w - px * 20, y0 + dy * w - py * 20),
                   (x0 + dx * w + px * l, y0 + dy * w + py * l), (x0 + px * l, y0 + py * l)]
            out += f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="{color}"/>'
    return out


def camiseta(k, detras):
    clip = f'clip{"B" if detras else "F"}'
    if detras:
        cuello = (f'<path d="M{N[0]-14},{N[1]-2} Q300,58 {Nd[0]+14},{Nd[1]-2} Q300,34 {N[0]-14},{N[1]-2}Z" '
                  f'fill="{k["cuello"]}" stroke="{LINEA}" stroke-width="2"/>')
        pecho = (f'<text x="300" y="158" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="44" '
                 f'letter-spacing="2" fill="{k["nombre"]}">{NOMBRE}</text>'
                 + numero(DORSAL, 300, 445, 240, k))
    else:
        escote = f'L300,104 Z'
        cuello = (f'<path d="M{N[0]},{N[1]} Q300,34 {Nd[0]},{Nd[1]} L300,104Z" fill="{k["dentro"]}" '
                  f'stroke="{LINEA}" stroke-width="1.6"/>'
                  f'<path d="M{N[0]-14},{N[1]-4} L300,124 L{Nd[0]+14},{Nd[1]-4} L{Nd[0]},{Nd[1]} '
                  f'L300,104 L{N[0]},{N[1]}Z" fill="{k["cuello"]}" stroke="{LINEA}" stroke-width="2"/>'
                  + (f'<path d="M{N[0]-10},{N[1]-3} L300,118 L{Nd[0]+10},{Nd[1]-3}" fill="none" '
                     f'stroke="{k["filo"]}" stroke-width="4" stroke-linejoin="miter"/>' if k["filo"] else ''))
        if k["pecho_nombre"]:
            pecho = (f'<text x="300" y="220" text-anchor="middle" font-family="Oswald" font-weight="700" '
                       f'font-size="54" letter-spacing="3" fill="{k["num"]}" stroke="{k["perfil"]}" stroke-width="3" '
                       f'paint-order="stroke">{EQUIPO}</text>'
                     + numero(DORSAL, 300, 480, 205, k))
        else:
            escudo = {"cabeza": cabeza(300, 148, 54), "tridente": tridente(300, 140, 50, ORO)}.get(k["escudo"], "")
            pecho = escudo + numero(DORSAL, 300, 465, 240, k)
    if k["manga"] == "tridente":
        # El tridente del club (tridente.png, de tridente sin fondo.png) grande en la manga y
        # siguiendo su eje, con las puntas hacia el hombro, como en la foto de referencia
        mangas = _imagen("tridente.png", 84, 146, 104, rot=35) + _imagen("tridente.png", 516, 146, 104, rot=-35)
    else:
        mangas = (numero(DORSAL, 72, 160, 52, k, rot=35)
                  + numero(DORSAL, 528, 160, 52, k, rot=-35))
    if k["hombreras"]:
        mangas += hombreras(ORO)
    forma = cuerpo + (f' Q300,40 {N[0]},{N[1]}Z' if detras else f' {escote}')
    cost = (f'<path d="M{D[0]+4},{D[1]-14} Q300,546 {E[0]-4},{E[1]-14}" fill="none" stroke="{LINEA}" '
            f'stroke-width="1.4" stroke-dasharray="6 5" opacity=".55"/>'
            f'<path d="M{S[0]+8},{S[1]+8} L{C[0]-2},{C[1]}" fill="none" stroke="{LINEA}" stroke-width="1.2" stroke-dasharray="5 5" opacity=".4"/>'
            f'<path d="M{Sd[0]-8},{Sd[1]+8} L{Cd[0]+2},{Cd[1]}" fill="none" stroke="{LINEA}" stroke-width="1.2" stroke-dasharray="5 5" opacity=".4"/>')
    return (f'<clipPath id="{clip}"><path d="{forma}"/></clipPath>'
            f'<path d="{forma}" fill="{k["cuerpo"]}"/>'
            f'<g clip-path="url(#{clip})">{franjas(k, -1)}{franjas(k, 1)}{mangas}{pecho}{cost}</g>'
            f'<path d="{forma}" fill="none" stroke="{LINEA}" stroke-width="2.4" stroke-linejoin="round"/>'
            + cuello)


def pantalon(k, detras):
    clip = f'clipP{"B" if detras else "F"}'
    forma = "M30,0 H370 V40 L402,386 L214,376 L200,296 L186,376 L-2,386 L30,40 Z"
    bandas = (f'<polygon points="30,40 58,40 44,390 -10,390" fill="{k["banda2"]}"/>'
              f'<polygon points="30,40 50,40 34,390 -10,390" fill="{k["banda"]}"/>'
              f'<polygon points="370,40 342,40 356,390 410,390" fill="{k["banda2"]}"/>'
              f'<polygon points="370,40 350,40 366,390 410,390" fill="{k["banda"]}"/>')
    extra = ''
    cost = (f'<path d="M4,362 L186,354" fill="none" stroke="{LINEA}" stroke-width="1.3" stroke-dasharray="6 5" opacity=".5"/>'
            f'<path d="M396,362 L214,354" fill="none" stroke="{LINEA}" stroke-width="1.3" stroke-dasharray="6 5" opacity=".5"/>')
    return (f'<clipPath id="{clip}"><path d="{forma}"/></clipPath>'
            f'<path d="{forma}" fill="{k["pantalon"]}"/>'
            f'<g clip-path="url(#{clip})">{bandas}'
            f'<rect x="30" y="0" width="340" height="40" fill="{k["cintura"]}"/>'
            f'<line x1="30" y1="40" x2="370" y2="40" stroke="{LINEA}" stroke-width="1.8"/>'
            f'<path d="M34,8 H366" stroke="{LINEA}" stroke-width="1.2" stroke-dasharray="6 5" opacity=".5"/>'
            f'{extra}{cost}</g>'
            f'<path d="{forma}" fill="none" stroke="{LINEA}" stroke-width="2.4" stroke-linejoin="round"/>')


# Fila de colores al pie, para la proveedora (igual que en las fichas de sudaderas y chándales)
NOMBRES = {"#006e82": ("Teal equipación", "CMYK aprox. C85 M35 Y28 K14"), "#d4a843": ("Oro", ""),
           "#ffffff": ("Blanco", ""), "#16191c": ("Negro", ""), "#003f4b": ("Teal muy oscuro", ""),
           "#004b59": ("Teal oscuro", ""), "#e4e8e9": ("Gris claro", "")}
PIEZAS = [("cuerpo", "Cuerpo"), ("cuello", "Cuello"), ("filo", "Filo del cuello"), ("dentro", "Interior del cuello"),
          ("num", "Números y ATLANTICS del pecho"), ("perfil", "Perfil de los números"), ("hilo", "Hilo exterior de los números"),
          ("nombre", "Nombre de la espalda"), ("franja", "Franja de la manga"), ("puno", "Puño"),
          ("pantalon", "Pantalón"), ("cintura", "Cintura del pantalón"), ("banda", "Banda lateral"), ("banda2", "Filo de la banda")]
ALTO = 1600


def leyenda(k, y0):
    usos = {}
    for clave, pieza in PIEZAS:
        if k.get(clave):
            usos.setdefault(k[clave].lower(), []).append(pieza)
    if k.get("hombreras"):
        usos.setdefault(ORO.lower(), []).append("Franjas de los hombros")
    if k.get("manga") == "tridente":
        usos.setdefault(ORO.lower(), []).append("Tridentes de las mangas")
    out = (f'<line x1="40" y1="{y0 - 30}" x2="1760" y2="{y0 - 30}" stroke="#ddd" stroke-width="2"/>'
           f'<text x="60" y="{y0 + 10}" font-family="Oswald" font-weight="700" font-size="22" letter-spacing="3" '
           f'fill="{TEAL}">COLORES</text>')
    ancho = 1680 / len(usos)
    for i, (c, piezas) in enumerate(usos.items()):
        x = 60 + i * ancho
        nombre, ref = NOMBRES.get(c, ("", ""))
        out += (f'<rect x="{x}" y="{y0 + 28}" width="64" height="64" rx="8" fill="{c}" stroke="#999" stroke-width="1.5"/>'
                f'<text x="{x + 78}" y="{y0 + 50}" font-family="Oswald" font-weight="700" font-size="20" fill="#222">{c.upper()}</text>'
                f'<text x="{x + 78}" y="{y0 + 72}" font-family="Oswald" font-weight="500" font-size="15" fill="#444">{nombre}</text>'
                f'<text x="{x + 78}" y="{y0 + 92}" font-family="Oswald" font-weight="500" font-size="13" fill="#777">{ref}</text>'
                f'<foreignObject x="{x}" y="{y0 + 100}" width="{ancho - 16}" height="70"><div xmlns="http://www.w3.org/1999/xhtml" '
                f'style="font:500 14px Oswald;color:#555;line-height:1.25">{" · ".join(piezas)}</div></foreignObject>')
    return out


def hoja(k):
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap">
<style>html,body{{margin:0;background:#fff}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="{ALTO}" viewBox="0 0 1800 {ALTO}">
<rect width="1800" height="{ALTO}" fill="#fff"/>
<g transform="translate(60,50) scale(1.3)">{camiseta(k, False)}</g>
<g transform="translate(960,50) scale(1.3)">{camiseta(k, True)}</g>
<g transform="translate(250,880) scale(1.2)">{pantalon(k, False)}</g>
<g transform="translate(1070,880) scale(1.2)">{pantalon(k, True)}</g>
{leyenda(k, 1420)}
</svg>'''


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1800, "height": ALTO})
    for nombre, k in KITS.items():
        html = aqui / f"boceto-{nombre}.html"
        html.write_text(hoja(k), encoding="utf-8")
        pg.goto(html.as_uri()); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(aqui / f"boceto-{nombre}.png")); print("ok", f"boceto-{nombre}.png")
    b.close()
