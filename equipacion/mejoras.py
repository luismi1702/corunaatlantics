"""Variantes de mejora de cada prenda elegida, para compararlas y quedarse con la mejor.

Uso:  python mejoras.py S6        -> mejoras-S6.png con todas las variantes de la S6
Las variantes de cada prenda están en VARIANTES. Dibuja con generar_ropa.py (la versión actual).
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
fuente = (aqui / "generar_ropa.py").read_text(encoding="utf-8")
g = {"__file__": str(aqui / "generar_ropa.py"), "__name__": "ropa"}
exec(compile(fuente[:fuente.index("trabajos = {}")], "generar_ropa", "exec"), g)
TEAL, ORO, BLANCO, MARINO, COORDS = g["TEAL"], g["ORO"], g["BLANCO"], g["MARINO"], g["COORDS"]

# S6: universitaria en arco, azul marino (ronda 1)
S6 = dict(g["_MARINO"], diseno="arco", letra=BLANCO, hilo=TEAL)
coords_espalda = (f'<text x="300" y="214" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="14" '
                  f'letter-spacing="3" fill="{ORO}">CORUÑA · {COORDS}</text>')

S6_FINAL = dict(S6, coruna_arriba=True, sin_tridente=True, sin_etiqueta=True, cordon_fin=178,
                y_coruna=206, arco_d="M172,318 Q300,232 428,318")

# S18: firma retro, blanco roto (ronda 3); de la S6 se hereda: letras arriba y sin etiqueta
HUESO = g["HUESO"]
S18 = dict(g["_BLANCA"], diseno="script", cuerpo=HUESO, mangas=HUESO, capucha=HUESO, hueco="#ddd3bd", rib=TEAL)
S18_ARRIBA = dict(S18, sin_etiqueta=True, cordon_fin=178, y_firma=268)

# S21: Tech Fleece con cremallera, gris y teal (ronda 4); de la S6 y la S18: sin tridente en el puño
S21 = dict(g["_GRIS"], diseno="tech", forma="zip", panel=TEAL, jaspe=False, cuerpo="#c3c8cb", mangas="#c3c8cb",
           capucha="#c3c8cb")
S21_LIMPIA = dict(S21, sin_tridente_puno=True, vivo=ORO)

S21_FINAL = dict(S21, espalda_tech="limpia", sin_tridente_puno=True)

# C2: canesú retro, azul marino y teal (ronda 1)
MARINO_OSC = g["MARINO_OSC"]
C2 = dict(titulo="", diseno="canesu", base=MARINO, canesu=TEAL, remate=TEAL, letra=BLANCO, pantalon=MARINO,
          pant_rib=MARINO_OSC, tiras=(TEAL, ORO), bolsillo=BLANCO)

C2_FINAL = dict(C2, pecho_c="solo_escudo", espalda_c="atlantics_football")

# C12: nombre partido, blanca y azul marino (ronda 2); del C2: ATLANTICS / FOOTBALL detrás
C12 = dict(titulo="", diseno="partido", base=BLANCO, remate=MARINO, letra=MARINO, perfil=ORO, pantalon=MARINO,
           pant_rib=MARINO_OSC, tiras=(BLANCO, ORO), bolsillo=BLANCO)

# C19: Tech Fleece, gris, teal y azul marino (ronda 4); del C2 y el C12: solo el escudo delante y ATLANTICS / FOOTBALL detrás
GRIS_TECH = "#c3c8cb"
C19 = dict(titulo="", diseno="tech", base=GRIS_TECH, panel=TEAL, panel2=MARINO, remate=MARINO, letra=MARINO,
           pantalon=GRIS_TECH, pant_rib=MARINO, tiras=(TEAL, MARINO), bolsillo=MARINO)
C19_LIMPIO = dict(C19, letra=BLANCO, pecho_c="solo_escudo", espalda_c="atlantics_football")

C19_FINAL = C19_LIMPIO
C12_FINAL = dict(C12, base=MARINO, letra=BLANCO, remate=TEAL, pecho_c="solo_escudo", espalda_c="atlantics_football",
                 pant_rib=TEAL, tiras=(TEAL, ORO))

VARIANTES = {
    "C19FINAL": ("chandal", [("C19", "Definitivo", C19_FINAL)]),
    # Las definitivas, juntas para decidir
    "FINALES_S": ("sudadera", [("S6", "Universitaria en arco · azul marino", S6_FINAL),
                               ("S18", "Firma retro · blanco roto", dict(S18_ARRIBA, coruna="no", espalda="limpia",
                                                                         sin_tridente_puno=True)),
                               ("S21", "Tech Fleece con cremallera · gris y teal", S21_FINAL)]),
    "FINALES_C": ("chandal", [("C2", "Canesú retro · marino y teal", C2_FINAL),
                              ("C12", "Marino con remates teal", C12_FINAL),
                              ("C19", "Tech Fleece · gris, teal y marino", C19_FINAL)]),
    "C19": ("chandal", [
        ("C19a", "El de partida", C19),
        ("C19b", "Escudo delante y ATLANTICS / FOOTBALL detrás", C19_LIMPIO),
        ("C19c", "Lo mismo con vivo de oro en la costura", dict(C19_LIMPIO, vivo=ORO)),
        ("C19d", "Sin el bajo marino, a juego con la S21", dict(C19_LIMPIO, panel2=None, remate=GRIS_TECH, vivo=ORO,
                                                                 pant_rib=TEAL, tiras=(TEAL, ORO))),
        ("C19e", "Panel marino arriba y bajo teal", dict(C19_LIMPIO, panel=MARINO, panel2=TEAL, remate=TEAL, vivo=ORO,
                                                          pant_rib=TEAL)),
        ("C19f", "Pantalón marino", dict(C19_LIMPIO, vivo=ORO, pantalon=MARINO, pant_rib=TEAL, tiras=(TEAL, ORO))),
    ]),
    "C2FINAL": ("chandal", [("C2", "Definitivo", C2_FINAL)]),
    "C12FINAL": ("chandal", [("C12", "Definitivo",   # la F con el escudo delante y ATLANTICS / FOOTBALL detrás
                              dict(C12, base=MARINO, letra=BLANCO, remate=TEAL, pecho_c="solo_escudo",
                                   espalda_c="atlantics_football", pant_rib=TEAL, tiras=(TEAL, ORO)))]),
    "C12": ("chandal", [
        ("C12a", "El de partida", C12),
        ("C12b", "Nombre partido de verdad por la cremallera", dict(C12, pecho_c="partido_separado")),
        ("C12c", "Lo mismo y ATLANTICS / FOOTBALL detrás", dict(C12, pecho_c="partido_separado",
                                                                  espalda_c="atlantics_football")),
        ("C12d", "Con remates rayados en oro", dict(C12, pecho_c="partido_separado", espalda_c="atlantics_football",
                                                     rib_rayas=(ORO, BLANCO))),
        ("C12e", "Nombre entero a un lado del pecho", dict(C12, pecho_c="nombre_grande", espalda_c="atlantics_football")),
        ("C12f", "Al revés: chaqueta marino y letras blancas", dict(C12, base=MARINO, letra=BLANCO, remate=TEAL,
                                                                    pecho_c="partido_separado",
                                                                    espalda_c="atlantics_football", pant_rib=TEAL,
                                                                    tiras=(TEAL, ORO))),
    ]),
    "S21FINAL": ("sudadera", [("S21", "Definitiva", S21_FINAL)]),
    "C2BASE": ("chandal", [("C2", "Solo el escudo delante, ATLANTICS FOOTBALL detrás",
                            dict(C2, pecho_c="solo_escudo", espalda_c="atlantics_football"))]),
    "C2": ("chandal", [
        ("C2a", "La de partida", C2),
        ("C2b", "CORUÑA sobre ATLANTICS en el pecho, sin escudo", dict(C2, pecho_c="coruna_nombre")),
        ("C2c", "Lo mismo y franja de rodilla en el pantalón", dict(C2, pecho_c="coruna_nombre", rodilla=TEAL)),
        ("C2d", "Tridente en el pecho y CORUÑA / ATLANTICS detrás", dict(C2, pecho_c="tridente", espalda_c="coruna_nombre",
                                                                         rodilla=TEAL)),
        ("C2e", "Al revés: cuerpo teal y canesú marino", dict(C2, base=TEAL, canesu=MARINO, remate=MARINO,
                                                               pecho_c="coruna_nombre", rodilla=MARINO, pantalon=TEAL,
                                                               pant_rib=MARINO, tiras=(MARINO, ORO))),
        ("C2f", "Canesú blanco", dict(C2, canesu=BLANCO, letra=TEAL, remate=TEAL, pecho_c="coruna_nombre",
                                      rodilla=TEAL)),
    ]),
    "S6FINAL": ("sudadera", [("S6", "Definitiva", S6_FINAL)]),
    "S18FINAL": ("sudadera", [("S18", "Definitiva",   # la firma como en la S18b, espalda limpia, sin tridente en el puño
                               dict(S18_ARRIBA, coruna="no", espalda="limpia", sin_tridente_puno=True))]),
    "S21BASE": ("sudadera", [("S21", "La de partida con la espalda limpia", dict(S21, espalda_tech="limpia", sin_tridente_puno=True))]),
    "S21": ("sudadera", [
        ("S21a", "La de partida", S21),
        ("S21b", "Vivo de oro y tridente en el pecho", dict(S21_LIMPIA, pecho_tech="tridente")),
        ("S21c", "Vivo de oro y ATLANTICS en el pecho", dict(S21_LIMPIA, pecho_tech="nombre")),
        ("S21d", "CORUÑA sobre ATLANTICS (como la S6)", dict(S21_LIMPIA, pecho_tech="coruna_nombre")),
        ("S21e", "Panel azul marino en lugar de teal", dict(S21_LIMPIA, panel=MARINO, pecho_tech="coruna_nombre",
                                                            rib=MARINO)),
        ("S21f", "Todo teal con panel marino y coordenadas detrás", dict(S21_LIMPIA, cuerpo=TEAL, mangas=TEAL, capucha=TEAL,
                                                                          panel=MARINO, rib=MARINO, hueco=g["MARINO_OSC"],
                                                                          pecho_tech="coruna_nombre", coords_espalda=True)),
    ]),
    "S18": ("sudadera", [
        ("S18a", "La de partida", S18),
        ("S18b", "Firma arriba, sin etiqueta", dict(S18_ARRIBA)),
        ("S18c", "CORUÑA encima de la firma (como la S6)", dict(S18_ARRIBA, coruna="encima", y_firma=290)),
        ("S18d", "Solo la firma, más grande", dict(S18_ARRIBA, coruna="no", firma_size=104, y_firma=280)),
        ("S18e", "Firma en azul marino, puños marino", dict(S18_ARRIBA, firma_color=MARINO, rib=MARINO, cordon=MARINO)),
        ("S18f", "Firma con tridente y dorsal a la espalda", dict(S18_ARRIBA, coruna="no", tridente_firma=True,
                                                                  y_firma=262, espalda="dorsal")),
    ]),
    # Nueva base de la S6: CORUÑA encima de ATLANTICS y la espalda sin el tridente
    "S6BASE": ("sudadera", [
        ("S6", "Nueva base: CORUÑA arriba, espalda limpia", dict(S6, coruna_arriba=True, sin_tridente=True, sin_etiqueta=True, cordon_fin=178,
                                                              y_coruna=206, arco_d="M172,318 Q300,232 428,318")),
    ]),
    "S6": ("sudadera", [
        ("S6a", "La de partida", S6),
        ("S6b", "Puños y cintura con filo de oro", dict(S6, rib_rayas=(ORO, BLANCO))),
        ("S6c", "Tridente bajo el arco en vez de CORUÑA", dict(S6, bajo_arco="tridente", rib_rayas=(ORO, BLANCO))),
        ("S6d", "Arco en oro", dict(S6, letra=ORO, perfil=BLANCO, hilo=TEAL, sub=ORO, rib_rayas=(ORO, BLANCO))),
        ("S6e", "Coordenadas en la espalda", dict(S6, rib_rayas=(ORO, BLANCO), extra_espalda=coords_espalda)),
        ("S6f", "Poseidón bajo el arco y capucha forrada en teal", dict(S6, bajo_arco="cabeza", hueco=TEAL,
                                                                          rib_rayas=(ORO, BLANCO), extra_espalda=coords_espalda)),
    ]),
}

codigo = sys.argv[1].upper()
prenda, variantes = VARIANTES[codigo]
ficha = g["ficha_sudadera"] if prenda == "sudadera" else g["ficha_chandal"]
_, alto_ficha = ficha(variantes[0][2], "tmp")
celda = alto_ficha / 2 + 70
out = ""
for n, (num, titulo, k) in enumerate(variantes):
    cuerpo, _ = ficha(k, f"v{n}")
    x, y = (n % 2) * 900, (n // 2) * celda
    out += (f'<g transform="translate({x},{y})">'
            f'<rect x="24" y="16" width="{24 + 20 * len(num)}" height="44" rx="6" fill="{TEAL}"/>'
            f'<text x="36" y="50" font-family="Oswald" font-weight="700" font-size="30" fill="#fff">{num}</text>'
            f'<text x="{60 + 20 * len(num)}" y="48" font-family="Oswald" font-weight="700" font-size="24" '
            f'fill="{TEAL}">{titulo.upper()}</text>'
            f'<g transform="translate(0,70) scale(.5)">{cuerpo}</g></g>')
filas = (len(variantes) + 1) // 2
total = int(filas * celda)
NOMBRES = {   # nombre y referencia de cada color para la proveedora
    "#006e82": ("Teal equipación", "CMYK aprox. C85 M35 Y28 K14"), "#004b59": ("Teal oscuro", ""),
    "#4ecdc4": ("Teal claro", ""), "#0f2640": ("Azul marino", ""), "#0a1a2e": ("Azul marino oscuro", ""),
    "#d4a843": ("Oro", ""), "#ffffff": ("Blanco", ""), "#eee7d6": ("Blanco roto", ""), "#ddd3bd": ("Blanco roto oscuro", ""),
    "#c3c8cb": ("Gris", ""), "#9aa0a4": ("Gris oscuro", ""), "#b9bec1": ("Gris jaspeado", ""),
}
PAPELES = {   # qué pieza lleva cada color, por prenda
    "sudadera": [("cuerpo", "Cuerpo"), ("mangas", "Mangas"), ("capucha", "Capucha"), ("hueco", "Forro de la capucha"),
                 ("panel", "Panel del pecho"), ("rib", "Puños y cintura"), ("cordon", "Cordones"),
                 ("letra", "Letras"), ("firma_color", "Firma"), ("perfil", "Perfil de las letras"),
                 ("hilo", "Hilo exterior de las letras")],
    "chandal": [("base", "Cuerpo"), ("canesu", "Canesú"), ("panel", "Panel del pecho"), ("panel2", "Bajo"),
                ("remate", "Cuello, puños y cintura"), ("letra", "Letras"), ("pantalon", "Pantalón"),
                ("pant_rib", "Cintura y bajos del pantalón"), ("tiras", "Tiras laterales")],
}


def leyenda(k, prenda, y0):
    """Fila de muestras de color con su código, nombre y dónde va."""
    usos = {}
    for clave, pieza in PAPELES[prenda]:
        v = k.get(clave)
        if prenda == "sudadera" and clave == "letra" and k.get("diseno") == "script":
            continue   # en la firma manda firma_color
        if clave == "firma_color" and k.get("diseno") == "script":
            v = v or TEAL
        for c in (v if isinstance(v, tuple) else (v,)):
            if c:
                usos.setdefault(c.lower(), []).append(pieza)
    usos.setdefault(ORO.lower(), []).append("Detalles en oro")
    out = (f'<text x="60" y="{y0 + 10}" font-family="Oswald" font-weight="700" font-size="22" letter-spacing="3" '
           f'fill="{TEAL}">COLORES</text>')
    ancho = 1680 / max(len(usos), 1)
    for i, (c, piezas) in enumerate(usos.items()):
        x = 60 + i * ancho
        nombre, ref = NOMBRES.get(c, ("", ""))
        piezas = " · ".join(dict.fromkeys(piezas))
        out += (f'<rect x="{x}" y="{y0 + 28}" width="64" height="64" rx="8" fill="{c}" stroke="#999" stroke-width="1.5"/>'
                f'<text x="{x + 78}" y="{y0 + 50}" font-family="Oswald" font-weight="700" font-size="20" fill="#222">{c.upper()}</text>'
                f'<text x="{x + 78}" y="{y0 + 72}" font-family="Oswald" font-weight="500" font-size="15" fill="#444">{nombre}</text>'
                f'<text x="{x + 78}" y="{y0 + 92}" font-family="Oswald" font-weight="500" font-size="13" fill="#777">{ref}</text>'
                f'<foreignObject x="{x}" y="{y0 + 100}" width="{ancho - 16}" height="60"><div xmlns="http://www.w3.org/1999/xhtml" '
                f'style="font:500 14px Oswald;color:#555;line-height:1.25">{piezas}</div></foreignObject>')
    return out


if len(variantes) == 1:   # una sola: la ficha a tamaño completo, con los colores debajo
    out, _ = ficha(variantes[0][2], "v0")
    out += f'<line x1="40" y1="{alto_ficha}" x2="1760" y2="{alto_ficha}" stroke="#ddd" stroke-width="2"/>'
    out += leyenda(variantes[0][2], prenda, alto_ficha + 30)
    total = int(alto_ficha + 200)
if len(variantes) > 1:
    out += f'<line x1="900" y1="16" x2="900" y2="{total - 16}" stroke="#ddd" stroke-width="2"/>'
out += "".join(f'<line x1="20" y1="{celda * f}" x2="1780" y2="{celda * f}" stroke="#ddd" stroke-width="2"/>'
               for f in range(1, filas))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1800, "height": total})
    ruta = aqui / "_mejoras.html"
    ruta.write_text(g["svg"](out, total), encoding="utf-8")
    pg.goto(ruta.as_uri()); pg.wait_for_load_state("networkidle")
    pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(aqui / f"mejoras-{codigo}.png")); ruta.unlink()
    b.close()
print("ok", f"mejoras-{codigo}.png")
