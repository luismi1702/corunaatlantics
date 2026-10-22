"""Bocetos de la chaqueta varsity (letterman) en ficha técnica: delante y detrás, con los colores al pie.

Uso:  python generar_varsity.py            -> todas las opciones
      python generar_varsity.py mejoras    -> varsity/mejoras-2.png y mejoras-12.png, variantes de las elegidas
      python generar_varsity.py final 2c   -> varsity/final-2c.png, la ficha de la elegida con sus colores
Saca en varsity/ una ficha por opción (boceto-varsity-1.png ...) y una hoja por ronda con las cuatro
(opciones-varsity.png la 1, opciones-varsity-2.png la 2 y opciones-varsity-3.png la 3, sacadas de varsity reales).
Las opciones se cambian en VARSITY y VARSITY2. Dibuja con las piezas de generar_ropa.py.
"""
import math, pathlib
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
fuente = (aqui / "generar_ropa.py").read_text(encoding="utf-8")
g = {"__file__": str(aqui / "generar_ropa.py"), "__name__": "ropa"}
exec(compile(fuente[:fuente.index("trabajos = {}")], "generar_ropa", "exec"), g)
TEAL, TEAL_OSC, ORO, BLANCO, LINEA, HUESO = g["TEAL"], g["TEAL_OSC"], g["ORO"], g["BLANCO"], g["LINEA"], g["HUESO"]
C_CUERPO, C_MANGAS = g["C_CUERPO"], g["C_MANGAS"]
contorno, cost, canale, imagen, filtros = g["contorno"], g["cost"], g["canale"], g["imagen"], g["filtros"]
salida = aqui / "varsity"
TEAL_NOCHE = "#003F4B"   # teal muy oscuro, el "forest" de las de Aimé Leon Dore

# Ronda 1: las cuatro direcciones básicas
VARSITY = [
    # La de siempre del college: paño teal, mangas de cuero blancas, letra de felpa en el corazón
    dict(titulo="1 · Clásica college · teal y mangas blancas", cuerpo=TEAL, mangas=BLANCO, cuero=True,
         rib=TEAL, rayas=(BLANCO, ORO), pecho="letra", letra=BLANCO, perfil=ORO, borde=TEAL,
         botones=BLANCO, espalda="arco"),
    # Al revés: cuerpo blanco roto y mangas teal, como la equipación de fuera
    dict(titulo="2 · Invertida · blanco roto y mangas teal", cuerpo=HUESO, mangas=TEAL, cuero=True,
         rib=TEAL, rayas=(ORO, BLANCO), pecho="letra", letra=TEAL, perfil=ORO, borde=BLANCO,
         botones=TEAL, espalda="arco"),
    # Todo teal, mangas de paño también; el color lo pone solo el oro
    dict(titulo="3 · Monocolor · todo teal con oro", cuerpo=TEAL, mangas=TEAL, cuero=False,
         rib=TEAL_OSC, rayas=(ORO, ORO), pecho="letra", letra=ORO, perfil=TEAL_OSC, borde=TEAL_OSC,
         botones=ORO, espalda="recta"),
    # Béisbol de los 50: Atlantics en cursiva bordada cruzando el pecho
    dict(titulo="4 · Cursiva · teal y mangas blancas", cuerpo=TEAL, mangas=BLANCO, cuero=True,
         rib=TEAL, rayas=(BLANCO, ORO), pecho="firma", letra=BLANCO, perfil=ORO, borde=TEAL,
         botones=BLANCO, espalda="firma"),
]

# Ronda 2: sacadas de varsity reales
VARSITY2 = [
    # Kith x Golden Bear: punto liso tono sobre tono, letra gótica de felpa, parche pequeño en la manga, espalda limpia
    dict(titulo="5 · Kith x Golden Bear · gótica y espalda limpia", cuerpo=TEAL, mangas=HUESO, cuero=True,
         rib=TEAL, rayas=None, pecho="gotica", letra=HUESO, perfil=TEAL_NOCHE, borde=HUESO,
         botones=HUESO, espalda="limpia", parche_manga=TEAL),
    # Aimé Leon Dore (NY Highlanders, Olympiacos): cuerpo muy oscuro, cuero hueso también en el cuello,
    # iniciales entrelazadas en hueso y rayas blancas solo en los puños
    dict(titulo="6 · Aimé Leon Dore · CA entrelazadas", cuerpo=TEAL_NOCHE, mangas=HUESO, cuero=True,
         rib=TEAL_NOCHE, rayas=None, rayas_puno=(BLANCO, BLANCO), cuello=HUESO, pecho="monograma",
         letra=HUESO, perfil=HUESO, borde=TEAL_NOCHE, botones=HUESO, espalda="pequena"),
    # Tendencia de ahora: todo crema, mangas de ante, letra tono sobre tono con perfil oro
    dict(titulo="7 · Tono sobre tono · todo crema", cuerpo=HUESO, mangas="#E3D9C2", cuero=False,
         rib=HUESO, rayas=(ORO, HUESO), pecho="letra", letra=HUESO, perfil=ORO, borde=HUESO,
         botones=HUESO, espalda="pequena"),
    # NFL de los 90 (Starter, Nike Jaguars): escudo del equipo en el pecho y el nombre grande detrás
    dict(titulo="8 · NFL de los 90 · escudo en el pecho", cuerpo=TEAL, mangas=BLANCO, cuero=True,
         rib=TEAL, rayas=(BLANCO, ORO), pecho="escudo", letra=BLANCO, perfil=ORO, borde=TEAL,
         botones=BLANCO, espalda="recta"),
]

# Ronda 3: más lejos del college de siempre
VARSITY3 = [
    # Supreme x Cactus Plant: una banda de felpa cruza pecho y espalda con el nombre
    dict(titulo="9 · Banda de felpa (Supreme) · nombre cruzado", cuerpo=TEAL, mangas=BLANCO, cuero=True,
         rib=TEAL, rayas=(BLANCO, ORO), pecho="banda", banda=BLANCO, letra=TEAL, perfil=ORO, borde=BLANCO,
         botones=BLANCO, espalda="banda"),
    # Off-White: rayas diagonales bordadas por todas las mangas, como olas
    dict(titulo="10 · Mangas rayadas (Off-White) · olas en diagonal", cuerpo=HUESO, mangas=TEAL, cuero=False,
         rib=TEAL, rayas=None, rayas_puno=(ORO, ORO), pecho="nombre_pequeno", letra=TEAL, perfil=TEAL, borde=HUESO,
         botones=TEAL, espalda="pequena", mangas_diag=BLANCO),
    # Louis Vuitton (Pharrell): la mascota en felpa grande en el pecho, con la firma debajo
    dict(titulo="11 · Mascota de felpa (Louis Vuitton) · Poseidón", cuerpo=HUESO, mangas=TEAL, cuero=True,
         rib=TEAL, rayas=(ORO, HUESO), pecho="mascota", letra=TEAL, perfil=ORO, borde=HUESO,
         botones=TEAL, espalda="limpia"),
    # Supreme Captains: el nombre bajando por las mangas, pecho limpio con el tridente
    dict(titulo="12 · Letras en las mangas (Supreme) · CORUÑA", cuerpo=TEAL_NOCHE, mangas=TEAL, cuero=False,
         rib=TEAL_NOCHE, rayas=(ORO, ORO), pecho="tridente", letra=BLANCO, perfil=ORO, borde=TEAL_NOCHE,
         botones=ORO, espalda="recta", texto_manga="CORUÑA"),
]

# Mejoras de las elegidas (python generar_varsity.py mejoras)
B2, B12 = VARSITY[1], VARSITY3[3]
MEJORAS = {
    "2": [
        ("2 · Tal cual", B2),
        ("2b · Espalda recta, sin arco", dict(B2, espalda="recta")),
        ("2c · Rayas solo en oro, más sobria", dict(B2, rayas=(ORO, ORO))),
        ("2d · Mangas de paño (más barata)", dict(B2, cuero=False)),
        ("2e · CORUÑA en las mangas (de la 12)", dict(B2, texto_manga="CORUÑA", letra_manga=BLANCO, perfil=ORO)),
        ("2f · Tridente al otro lado del pecho", dict(B2, tridente_tambien=True)),
    ],
    "12": [
        ("12 · Tal cual", B12),
        ("12b · Cuerpo teal y mangas blanco roto", dict(B12, cuerpo=TEAL, rib=TEAL, mangas=HUESO, letra_manga=TEAL,
                                                       borde=TEAL)),
        ("12c · A de felpa en vez del tridente", dict(B12, pecho="letra", letra=BLANCO, borde=TEAL_NOCHE)),
        ("12d · CORUÑA en una manga, coordenadas en la otra", dict(B12, texto_manga=("43°22′16″N · 8°23′46″W", "CORUÑA"))),
        ("12e · ATLANTICS en las mangas y CORUÑA detrás", dict(B12, texto_manga="ATLANTICS", espalda="coruna")),
        ("12f · Mangas de cuero blanco roto", dict(B12, mangas=HUESO, cuero=True, letra_manga=TEAL_NOCHE)),
    ],
}

# Punto del proveedor (carta "夹克罗纹" de diciembre 2025), con los colores medidos en la carta
B2C = dict(B2, rayas=(ORO, ORO))
SHUISHOU, HAITUN, PACKERS = "#067878", "#20A89E", "#FFD71F"
MEJORAS["puno"] = [
    ("2C · Diseño (sin punto real)", B2C),
    ("2C-1 · Liso JKD-22 水手绿 (recomendada)", dict(B2C, rib=SHUISHOU, rayas=None)),
    ("2C-2 · JKS-102 海豚绿-包装工黄", dict(B2C, rib=HAITUN, rayas=(PACKERS,))),
    ("2C-3 · JKS-63 水手绿-白", dict(B2C, rib=SHUISHOU, rayas=(BLANCO,))),
]

NOMBRES = {"#067878": ("JKD-22 水手绿", "punto del proveedor"), "#20a89e": ("JKD-21 海豚绿", "punto del proveedor"),
           "#ffd71f": ("JKD-04 包装工黄", "punto del proveedor"), "#003f4b": ("Teal noche", ""), "#e3d9c2": ("Crema ante", ""),
           TEAL.lower(): ("Teal equipación", "CMYK aprox. C85 M35 Y28 K14"), TEAL_OSC.lower(): ("Teal oscuro", ""),
           ORO.lower(): ("Oro", ""), BLANCO.lower(): ("Blanco", ""), HUESO.lower(): ("Blanco roto", "")}


def letra_felpa(txt, x, y, size, k, sfx, fuente="Graduate"):
    """Letra de felpa (chenille) en capas: borde de fieltro, perfil y relleno peludo."""
    base = f'x="{x}" y="{y}" text-anchor="middle" font-family="{fuente}" font-size="{size}"'
    return (f'<text {base} fill="{k["borde"]}" stroke="{k["borde"]}" stroke-width="{size * .2:.1f}" stroke-linejoin="round">{txt}</text>'
            f'<text {base} fill="{k["perfil"]}" stroke="{k["perfil"]}" stroke-width="{size * .1:.1f}" stroke-linejoin="round">{txt}</text>'
            f'<text {base} fill="{k["letra"]}" filter="url(#felpa)">{txt}</text>')


def arco(txt, d, pid, size, k):
    tp = f'<textPath href="#{pid}" startOffset="50%">{txt}</textPath>'
    base = f'text-anchor="middle" font-family="Graduate" font-size="{size}" letter-spacing="2"'
    return (f'<path id="{pid}" d="{d}" fill="none"/>'
            f'<text {base} fill="{k["borde"]}" stroke="{k["borde"]}" stroke-width="{size * .2:.1f}" stroke-linejoin="round">{tp}</text>'
            f'<text {base} fill="{k["perfil"]}" stroke="{k["perfil"]}" stroke-width="{size * .1:.1f}" stroke-linejoin="round">{tp}</text>'
            f'<text {base} fill="{k["letra"]}">{tp}</text>')


def firma(txt, x, y, size, k):
    return g["firma"](txt, x, y, size, k["letra"], k["perfil"])


def rib_rayado(x0, y0, x1, y1, k, rayas="no-dado"):
    """Punto elástico con las dos rayas de las varsity (o liso, tono sobre tono, si no hay rayas)."""
    rayas = k["rayas"] if rayas == "no-dado" else rayas
    h = y1 - y0
    out = f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{h}" fill="{k["rib"]}"/>'
    if rayas and len(rayas) == 1:   # una sola raya ancha en el centro (las de "tres franjas" del proveedor)
        out += f'<rect x="{x0}" y="{y0 + h * .36}" width="{x1 - x0}" height="{h * .28}" fill="{rayas[0]}"/>'
    elif rayas:
        c1, c2 = rayas
        out += (f'<rect x="{x0}" y="{y0 + h * .3}" width="{x1 - x0}" height="{h * .14}" fill="{c1}"/>'
                f'<rect x="{x0}" y="{y0 + h * .56}" width="{x1 - x0}" height="{h * .14}" fill="{c2}"/>')
    return out + canale(x0, y0, x1, y1, 6)


def chaqueta(k, detras, sfx):
    id_ = f"v{sfx}{int(detras)}"
    f = [f'<clipPath id="{id_}"><path d="{C_CUERPO}"/></clipPath>',
         f'<linearGradient id="brillo{id_}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>'
         f'<stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>',
         f'<path d="{C_CUERPO}" fill="{k["cuerpo"]}"/>',
         f'<g clip-path="url(#{id_})">',
         f'<path d="{C_MANGAS}" fill="{k["mangas"]}"/>']
    if k.get("mangas_diag"):   # rayas diagonales bordadas en las mangas
        f.append(f'<clipPath id="md{id_}"><path d="{C_MANGAS}"/></clipPath><g clip-path="url(#md{id_})">'
                 + "".join(f'<path d="M-40,{y} L640,{y - 260}" stroke="{k["mangas_diag"]}" stroke-width="11"/>'
                           for y in range(80, 1100, 46)) + '</g>')
    if k.get("texto_manga"):   # el nombre bajando por cada manga
        textos = k["texto_manga"] if isinstance(k["texto_manga"], tuple) else (k["texto_manga"],) * 2
        if detras:   # de espaldas las mangas se ven cambiadas de lado
            textos = textos[::-1]
        for i, (tr, txt) in enumerate(zip(("M128,150 L72,440", "M472,150 L528,440"), textos)):
            if not txt:
                continue
            fuente, size, esp = ("Oswald", 22, 3) if "°" in txt else ("Graduate", 30 if len(txt) < 8 else 22, 7 if len(txt) < 8 else 3)
            f.append(f'<path id="tm{id_}{i}" d="{tr}" fill="none"/><text font-family="{fuente}" font-weight="700" font-size="{size}" '
                     f'letter-spacing="{esp}" fill="{k.get("letra_manga", k["letra"])}" stroke="{k["perfil"]}" stroke-width="1" '
                     f'text-anchor="middle"><textPath href="#tm{id_}{i}" startOffset="50%">{txt}</textPath></text>')
    if k["cuero"]:   # el cuero brilla y lleva la costura marcada
        f.append(f'<path d="{C_MANGAS}" fill="url(#brillo{id_})" opacity=".9"/>'
                 + f'<path d="M232,62 C190,120 160,180 150,232 M368,62 C410,120 440,180 450,232" fill="none" '
                   f'stroke="{LINEA}" stroke-width="1.8"/>')
    else:
        f.append(cost("M232,62 C190,120 160,180 150,232", .45) + cost("M368,62 C410,120 440,180 450,232", .45))
    # cintura y puños de punto
    f.append(rib_rayado(152, 496, 448, 530, k))
    for pts, (x0, x1) in (("40,466 110,470 108,514 42,512", (40, 110)), ("490,470 560,466 558,512 492,514", (490, 560))):
        f.append(f'<clipPath id="pu{id_}{x0}"><polygon points="{pts}"/></clipPath>'
                 f'<g clip-path="url(#pu{id_}{x0})">{rib_rayado(x0 - 4, 466, x1 + 4, 514, k, k.get("rayas_puno", k["rayas"]))}</g>')
    if detras:
        if k["espalda"] == "arco":
            f.append(arco("ATLANTICS", "M182,212 Q300,140 418,212", f"ar{id_}", 42, k)
                     + f'<text x="300" y="256" text-anchor="middle" font-family="Graduate" font-size="24" letter-spacing="8" '
                       f'fill="{k["letra"]}" stroke="{k["perfil"]}" stroke-width="1.2">FOOTBALL</text>')
        elif k["espalda"] == "recta":
            f.append(f'<text x="300" y="190" text-anchor="middle" font-family="Graduate" font-size="44" letter-spacing="3" '
                     f'fill="{k["letra"]}" stroke="{k["perfil"]}" stroke-width="2.5" paint-order="stroke">ATLANTICS</text>'
                     + f'<text x="300" y="238" text-anchor="middle" font-family="Graduate" font-size="26" letter-spacing="10" '
                       f'fill="{k["letra"]}">FOOTBALL</text>')
        elif k["espalda"] == "pequena":   # bordado pequeño bajo el cuello
            f.append(arco("ATLANTICS", "M232,150 Q300,118 368,150", f"ar{id_}", 22, dict(k, borde=k["cuerpo"])))
        elif k["espalda"] == "banda":
            f.append(f'<rect x="-20" y="150" width="640" height="78" fill="{k["banda"]}" filter="url(#felpa)"/>'
                     f'<path d="M-20,150 H620 M-20,228 H620" stroke="{ORO}" stroke-width="5"/>'
                     + letra_felpa("ATLANTICS", 300, 212, 54, dict(k, borde=k["banda"]), sfx))
        elif k["espalda"] == "coruna":
            f.append(f'<text x="300" y="150" text-anchor="middle" font-family="Graduate" font-size="22" letter-spacing="10" '
                     f'fill="{k["letra"]}">CORUÑA</text>'
                     + f'<text x="300" y="200" text-anchor="middle" font-family="Graduate" font-size="44" letter-spacing="3" '
                       f'fill="{k["letra"]}" stroke="{k["perfil"]}" stroke-width="2.5" paint-order="stroke">ATLANTICS</text>')
        elif k["espalda"] == "firma":
            f.append(firma("Atlantics", 300, 210, 84, k)
                     + f'<text x="300" y="290" text-anchor="middle" font-family="Graduate" font-size="24" letter-spacing="10" '
                       f'fill="{k["letra"]}">FOOTBALL</text>')
    else:
        if k["pecho"] == "letra":   # en el corazón, alta, a la altura de las letras college
            f.append(letra_felpa("A", 390, 222, 120, k, sfx))
        elif k["pecho"] == "gotica":   # la K gótica de Kith, aquí una A
            f.append(letra_felpa("A", 390, 226, 128, k, sfx, "UnifrakturCook"))
        elif k["pecho"] == "monograma":   # C y A entrelazadas, como el NY de los Highlanders
            f.append(letra_felpa("C", 372, 222, 104, k, sfx) + letra_felpa("A", 404, 238, 104, k, sfx))
        elif k["pecho"] == "banda":
            f.append(f'<rect x="-20" y="150" width="640" height="78" fill="{k["banda"]}" filter="url(#felpa)"/>'
                     f'<path d="M-20,150 H620 M-20,228 H620" stroke="{ORO}" stroke-width="5"/>'
                     + letra_felpa("ATLAN", 222, 212, 54, dict(k, borde=k["banda"]), sfx)
                     + letra_felpa("TICS", 380, 212, 54, dict(k, borde=k["banda"]), sfx))
        elif k["pecho"] == "nombre_pequeno":
            f.append(f'<text x="374" y="232" text-anchor="middle" font-family="Graduate" font-size="16" letter-spacing="2" '
                     f'fill="{k["letra"]}">ATLANTICS</text>')
        elif k["pecho"] == "mascota":   # Poseidón grande de felpa, con la firma debajo
            f.append(g["parche"](370, 210, 56, k["borde"], ORO, imagen(aqui.parent / "cabeza minimalista sin fondo.png", 370, 206, 96))
                     + firma("Atlantics", 372, 318, 36, k))
        elif k["pecho"] == "tridente":
            f.append(imagen(aqui.parent / "tridente sin fondo.png", 390, 190, 110))
        elif k["pecho"] == "escudo":   # el escudo circular, como los logos de las varsity NFL de los 90
            f.append(imagen(aqui.parent / "circular sin fondo.png", 392, 176, 116))
        else:
            f.append(firma("Atlantics", 300, 200, 62, k))
        if k.get("tridente_tambien"):   # tridente pequeño al otro lado del pecho
            f.append(imagen(aqui.parent / "tridente sin fondo.png", 222, 176, 70))
        if k.get("parche_manga"):   # parche pequeño en la manga del corazón
            f.append(g["parche"](494, 292, 22, k["parche_manga"], ORO,
                                 imagen(aqui.parent / "tridente sin fondo.png", 494, 292, 34)))
        # tapeta con los automáticos
        f.append(f'<path d="M300,60 V528" stroke="{LINEA}" stroke-width="2.2"/>'
                 + "".join(f'<circle cx="300" cy="{y}" r="9" fill="{k["botones"]}" stroke="{LINEA}" stroke-width="1.6"/>'
                           f'<circle cx="300" cy="{y}" r="3.5" fill="none" stroke="{LINEA}" stroke-width="1" opacity=".6"/>'
                           for y in range(98, 480, 62)))
        # bolsillos de ojal con ribete del color de las mangas
        for x0, x1 in ((178, 204), (422, 396)):
            f.append(f'<path d="M{x0},378 L{x1},460" stroke="{k["mangas"]}" stroke-width="12" stroke-linecap="round"/>'
                     f'<path d="M{x0},378 L{x1},460" stroke="{LINEA}" stroke-width="1.4" fill="none" opacity=".7"/>')
    f.append('</g>' + contorno(C_CUERPO)
             + f'<path d="M232,62 C190,120 160,180 150,232 M368,62 C410,120 440,180 450,232" fill="none" stroke="{LINEA}" stroke-width="1.6"/>')
    # cuello de punto (o de cuero, si lo pide la opción)
    cuello = ("M228,55 C260,70 340,70 372,55 L380,20 C340,34 260,34 220,20 Z" if not detras else
              "M228,55 C260,48 340,48 372,55 L378,20 C340,12 260,12 222,20 Z")
    f.append(f'<clipPath id="cu{id_}"><path d="{cuello}"/></clipPath>'
             f'<g clip-path="url(#cu{id_})">{rib_rayado(215, 12, 385, 72, dict(k, rib=k.get("cuello", k["rib"])))}</g>'
             + contorno(cuello, 2))
    if not detras:
        f.append(f'<path d="M300,28 V62" stroke="{LINEA}" stroke-width="2"/>')
    return "".join(f)


def ficha(k, sfx):
    return (f'<defs>{filtros(sfx)}</defs>'
            f'<g transform="translate(60,40) scale(1.3)">{chaqueta(k, False, sfx)}</g>'
            f'<g transform="translate(960,40) scale(1.3)">{chaqueta(k, True, sfx)}</g>'), 760


def leyenda(k, y0):
    usos = {}
    piezas = [("cuerpo", "Cuerpo (paño)"), ("mangas", "Mangas (cuero)" if k["cuero"] else "Mangas (paño)"),
              ("rib", "Cuello, puños y cintura"), ("letra", "Letras"), ("perfil", "Perfil de las letras"), ("borde", "Fieltro bajo las letras"),
              ("botones", "Automáticos")]
    for clave, pieza in piezas:
        usos.setdefault(k[clave].lower(), []).append(pieza)
    for c in (k["rayas"] or ()) + (k.get("rayas_puno") or ()):
        usos.setdefault(c.lower(), []).append("Rayas del punto")
    if k.get("banda"):
        usos.setdefault(k["banda"].lower(), []).append("Banda de felpa")
    if k.get("mangas_diag"):
        usos.setdefault(k["mangas_diag"].lower(), []).append("Rayas de las mangas")
    if k.get("cuello"):
        usos.setdefault(k["cuello"].lower(), []).append("Cuello")
    if k.get("parche_manga"):
        usos.setdefault(k["parche_manga"].lower(), []).append("Parche de la manga")
        usos.setdefault(ORO.lower(), []).append("Borde del parche")
    out = (f'<text x="60" y="{y0 + 10}" font-family="Oswald" font-weight="700" font-size="22" letter-spacing="3" '
           f'fill="{TEAL}">COLORES</text>')
    ancho = 1680 / len(usos)
    for i, (c, ps) in enumerate(usos.items()):
        x = 60 + i * ancho
        nombre, ref = NOMBRES.get(c, ("", ""))
        out += (f'<rect x="{x}" y="{y0 + 28}" width="64" height="64" rx="8" fill="{c}" stroke="#999" stroke-width="1.5"/>'
                f'<text x="{x + 78}" y="{y0 + 50}" font-family="Oswald" font-weight="700" font-size="20" fill="#222">{c.upper()}</text>'
                f'<text x="{x + 78}" y="{y0 + 72}" font-family="Oswald" font-weight="500" font-size="15" fill="#444">{nombre}</text>'
                f'<text x="{x + 78}" y="{y0 + 92}" font-family="Oswald" font-weight="500" font-size="13" fill="#777">{ref}</text>'
                f'<foreignObject x="{x}" y="{y0 + 100}" width="{ancho - 16}" height="60"><div xmlns="http://www.w3.org/1999/xhtml" '
                f'style="font:500 14px Oswald;color:#555;line-height:1.25">{" · ".join(dict.fromkeys(ps))}</div></foreignObject>')
    return out


def svg(cuerpo, alto):
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Yellowtail&family=Graduate&family=UnifrakturCook:wght@700&display=swap">
<style>html,body{{margin:0;background:#fff}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="{alto}" viewBox="0 0 1800 {alto}">
<rect width="1800" height="{alto}" fill="#fff"/>{cuerpo}</svg>'''


import sys
trabajos = {}
if len(sys.argv) > 2 and sys.argv[1] == "final":   # ficha grande de una variante, con sus colores
    codigo = sys.argv[2].lower()
    k = next(k for variantes in MEJORAS.values() for titulo, k in variantes if titulo.split(" ")[0].lower() == codigo)
    cuerpo, alto = ficha(k, "f")
    cuerpo += f'<line x1="40" y1="{alto}" x2="1760" y2="{alto}" stroke="#ddd" stroke-width="2"/>' + leyenda(k, alto + 30)
    trabajos[f"final-{codigo}"] = (svg(cuerpo, alto + 200), alto + 200)
elif len(sys.argv) > 1 and sys.argv[1] == "mejoras":
    celda = 760 / 2 + 60
    for codigo, variantes in MEJORAS.items():
        hoja = ""
        for i, (titulo, k) in enumerate(variantes):
            cuerpo, _ = ficha(k, f"m{codigo}{i}")
            x, y = (i % 2) * 900, (i // 2) * celda
            hoja += (f'<g transform="translate({x},{y})"><text x="30" y="44" font-family="Oswald" font-weight="700" font-size="30" '
                     f'fill="{TEAL}">{titulo.upper()}</text><g transform="translate(0,60) scale(.5)">{cuerpo}</g></g>')
        filas = math.ceil(len(variantes) / 2)
        total = int(filas * celda)
        hoja += (f'<line x1="900" y1="20" x2="900" y2="{total - 20}" stroke="#ddd" stroke-width="2"/>'
                 + "".join(f'<line x1="20" y1="{celda * r}" x2="1780" y2="{celda * r}" stroke="#ddd" stroke-width="2"/>'
                           for r in range(1, filas)))
        trabajos[f"mejoras-{codigo}"] = (svg(hoja, total), total)
for lista, inicio, hoja_nombre in (() if trabajos else ((VARSITY, 1, "opciones-varsity"), (VARSITY2, 5, "opciones-varsity-2"),
                                                       (VARSITY3, 9, "opciones-varsity-3"))):
    for i, k in enumerate(lista, inicio):
        cuerpo, alto = ficha(k, str(i))
        cuerpo += (f'<line x1="40" y1="{alto}" x2="1760" y2="{alto}" stroke="#ddd" stroke-width="2"/>' + leyenda(k, alto + 30))
        trabajos[f"boceto-varsity-{i}"] = (svg(cuerpo, alto + 200), alto + 200)
    # hoja con las cuatro, 2x2
    celda = 760 / 2 + 60
    hoja = ""
    for i, k in enumerate(lista):
        cuerpo, _ = ficha(k, f"c{inicio + i}")
        x, y = (i % 2) * 900, (i // 2) * celda
        hoja += (f'<g transform="translate({x},{y})"><text x="30" y="44" font-family="Oswald" font-weight="700" font-size="30" '
                 f'fill="{TEAL}">{k["titulo"].upper()}</text><g transform="translate(0,60) scale(.5)">{cuerpo}</g></g>')
    total = int(math.ceil(len(lista) / 2) * celda)
    hoja += (f'<line x1="900" y1="20" x2="900" y2="{total - 20}" stroke="#ddd" stroke-width="2"/>'
             f'<line x1="20" y1="{celda}" x2="1780" y2="{celda}" stroke="#ddd" stroke-width="2"/>')
    trabajos[hoja_nombre] = (svg(hoja, total), total)

salida.mkdir(exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ruta = aqui / "_varsity.html"
    for nombre, (html, alto) in trabajos.items():
        pg = b.new_page(viewport={"width": 1800, "height": alto})
        ruta.write_text(html, encoding="utf-8")
        pg.goto(ruta.as_uri()); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(400)
        pg.screenshot(path=str(salida / f"{nombre}.png")); pg.close(); print("ok", f"varsity/{nombre}.png")
    ruta.unlink()
    b.close()
