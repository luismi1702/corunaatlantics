"""Plantillas (PNG sin fondo) para las Custom Layers de los uniformes del Team Builder de CFB27.

Uso: python equipacion/cfb27/generar.py
Saca los PNG en equipacion/cfb27/png/ y una hoja de muestra en equipacion/cfb27/hoja.png.
Todas recortadas casi sin margen: el juego escala la imagen entera y el margen la encoge.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
SAL = Path(__file__).resolve().parent / "png"
SAL.mkdir(exist_ok=True)

FRESHMAN = str(RAIZ / "equipacion/fuentes/Freshman.ttf")
GRADUATE = str(RAIZ / "monograma/fuentes/Graduate-Regular.ttf")

TEAL = "#038391"
ORO = "#D4A843"
BLANCO = "#FFFFFF"
TINTA = "#040d12"
ROJO = "#B22234"
AZUL_US = "#3C3B6E"
AZUL_GAL = "#0099CC"

MAX = 1024  # lado mayor de la imagen final


def recortar(img, margen=6):
    caja = img.getbbox()
    img = img.crop(caja)
    w, h = img.size
    lienzo = Image.new("RGBA", (w + 2 * margen, h + 2 * margen), (0, 0, 0, 0))
    lienzo.paste(img, (margen, margen), img)
    esc = MAX / max(lienzo.size)
    return lienzo.resize((round(lienzo.width * esc), round(lienzo.height * esc)), Image.LANCZOS)


def texto_capas(txt, fuente, tam, relleno, contornos, espaciado=0):
    """Texto con contornos concéntricos. contornos = [(color, grosor_total), ...] de fuera a dentro."""
    f = ImageFont.truetype(fuente, tam)
    ancho = sum(f.getlength(c) for c in txt) + espaciado * (len(txt) - 1)
    pad = max([g for _, g in contornos] + [0]) + 20
    img = Image.new("RGBA", (int(ancho) + 2 * pad, int(tam * 1.6) + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for color, grosor in contornos + [(relleno, 0)]:
        x = pad
        for c in txt:
            d.text((x, pad), c, font=f, fill=relleno if grosor == 0 else color,
                   stroke_width=grosor, stroke_fill=color)
            x += f.getlength(c) + espaciado
    return img


def letra_capas(c, fuente, tam, relleno, contornos):
    return texto_capas(c, fuente, tam, relleno, contornos)


def texto_arco(txt, fuente, tam, relleno, contornos, radio, espaciado=0, hacia_arriba=True):
    """Texto en arco (estilo pecho universitario). Centro del arco debajo del texto."""
    f = ImageFont.truetype(fuente, tam)
    anchos = [f.getlength(c) + espaciado for c in txt]
    total = sum(anchos) - espaciado
    lado = int(radio * 2 + tam * 4)
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    cx = cy = lado // 2
    ang = -total / 2 / radio
    for c, a in zip(txt, anchos):
        medio = ang + (a - espaciado) / 2 / radio
        l = letra_capas(c, fuente, tam, relleno, contornos)
        l = l.crop(l.getbbox())
        signo = 1 if hacia_arriba else -1
        rot = l.rotate(-math.degrees(medio) * signo, resample=Image.BICUBIC, expand=True)
        r = radio if hacia_arriba else radio
        x = cx + r * math.sin(medio)
        y = cy - signo * r * math.cos(medio)
        img.paste(rot, (int(x - rot.width / 2), int(y - rot.height / 2)), rot)
        ang += a / radio
    return img


def guardar(img, nombre):
    img = recortar(img)
    img.save(SAL / f"{nombre}.png")
    return nombre, img


piezas = []

# 1. Wordmark del pecho, recto (camiseta teal / camiseta blanca)
for sufijo, rell, cont in [
    ("teal", BLANCO, [(TEAL, 22), (ORO, 12)]),       # para camiseta teal o negra
    ("blanca", TEAL, [(ORO, 22), (BLANCO, 14), (TEAL, 0)]),  # para camiseta blanca
    ("oro", ORO, [(TINTA, 14)]),                       # para camiseta negra
]:
    cont = [c for c in cont if c[1] > 0]
    piezas.append(guardar(texto_capas("ATLANTICS", FRESHMAN, 260, rell, cont, espaciado=6),
                          f"pecho-atlantics-{sufijo}"))

# 2. Wordmark del pecho en arco
piezas.append(guardar(texto_arco("ATLANTICS", FRESHMAN, 230, BLANCO, [(TEAL, 22), (ORO, 12)], radio=1300),
                      "pecho-atlantics-arco-teal"))
piezas.append(guardar(texto_arco("ATLANTICS", FRESHMAN, 230, TEAL, [(ORO, 22), (BLANCO, 14)], radio=1300),
                      "pecho-atlantics-arco-blanca"))

# 3. Nombre de la escuela
piezas.append(guardar(texto_capas("MARYLAND STATE", FRESHMAN, 220, BLANCO, [(TEAL, 20), (ORO, 10)], espaciado=4),
                      "pecho-maryland-state-teal"))
piezas.append(guardar(texto_capas("MARYLAND STATE", FRESHMAN, 220, TEAL, [(ORO, 20), (BLANCO, 12)], espaciado=4),
                      "pecho-maryland-state-blanca"))
piezas.append(guardar(texto_arco("MARYLAND STATE", FRESHMAN, 200, BLANCO, [(TEAL, 20), (ORO, 10)], radio=1500),
                      "pecho-maryland-state-arco-teal"))

# 4. Tira fina para la nuca o el cuello trasero (una tinta)
for sufijo, col in [("blanco", BLANCO), ("oro", ORO), ("teal", TEAL)]:
    piezas.append(guardar(texto_capas("MARYLAND STATE", GRADUATE, 200, col, [], espaciado=18),
                          f"nuca-maryland-state-{sufijo}"))
    piezas.append(guardar(texto_capas("WE ARE ATLANTICS", GRADUATE, 200, col, [], espaciado=18),
                          f"nuca-we-are-atlantics-{sufijo}"))

# 5. Letras MS para la cadera del pantalón o el casco
piezas.append(guardar(texto_capas("MS", FRESHMAN, 400, BLANCO, [(TEAL, 34), (ORO, 18)], espaciado=-10),
                      "ms-teal"))
piezas.append(guardar(texto_capas("MS", FRESHMAN, 400, TEAL, [(ORO, 34), (BLANCO, 20)], espaciado=-10),
                      "ms-blanca"))

# 6. Tridente y monograma para la manga (recortados)
for origen, nombre in [
    (RAIZ / "tridente sin fondo.png", "manga-tridente-oro"),
    (RAIZ / "monograma/definitivo/monograma-ac-blanco sin fondo.png", "manga-monograma-ac-blanco"),
    (RAIZ / "monograma/definitivo/monograma-ac-teal sin fondo.png", "manga-monograma-ac-teal"),
]:
    piezas.append(guardar(Image.open(origen).convert("RGBA"), nombre))


# 7. Parches de bandera (manga o pecho), con ribete
def parche_us():
    w, h = 950, 500
    img = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w + 39, h + 39], radius=18, fill=ORO)
    o = 20
    fh = h / 13
    for i in range(13):
        d.rectangle([o, o + i * fh, o + w, o + (i + 1) * fh], fill=ROJO if i % 2 == 0 else BLANCO)
    cw, ch = w * 0.4, fh * 7
    d.rectangle([o, o, o + cw, o + ch], fill=AZUL_US)
    for fila in range(9):
        n = 6 if fila % 2 == 0 else 5
        for col in range(n):
            x = o + cw / 12 * (2 * col + 1 + (0 if fila % 2 == 0 else 1))
            y = o + ch / 10 * (fila + 1)
            r = 9
            pts = [(x + r * math.cos(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4),
                    y + r * math.sin(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4)) for k in range(10)]
            d.polygon(pts, fill=BLANCO)
    return img


def parche_galicia():
    w, h = 950, 630
    img = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w + 39, h + 39], radius=18, fill=ORO)
    o = 20
    d.rectangle([o, o, o + w, o + h], fill=BLANCO)
    t = h * 0.22
    d.polygon([(o, o), (o + t, o), (o + w, o + h - 0.0), (o + w - t, o + h)], fill=AZUL_GAL)
    # limpiar las esquinas para que la banda vaya de esquina a esquina
    return img


piezas.append(guardar(parche_us(), "parche-bandera-usa"))
piezas.append(guardar(parche_galicia(), "parche-bandera-galicia"))


# 8. Sello circular de la escuela (parche de pecho o de manga)
def sello():
    lado = 1200
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = lado / 2
    d.ellipse([10, 10, lado - 10, lado - 10], fill=ORO)
    d.ellipse([40, 40, lado - 40, lado - 40], fill=TEAL)
    d.ellipse([250, 250, lado - 250, lado - 250], fill=ORO)
    d.ellipse([268, 268, lado - 268, lado - 268], fill=TEAL)
    arriba = texto_arco("MARYLAND STATE", GRADUATE, 92, BLANCO, [], radio=440, espaciado=8)
    img.alpha_composite(arriba, (int(c - arriba.width / 2), int(c - arriba.height / 2)))
    abajo = texto_arco("ATLANTICS", GRADUATE, 92, BLANCO, [], radio=440, espaciado=14, hacia_arriba=False)
    img.alpha_composite(abajo, (int(c - abajo.width / 2), int(c - abajo.height / 2)))
    for ang in (180, 0):  # estrellas a los lados
        x = c + 440 * math.cos(math.radians(ang))
        pts = [(x + 26 * math.cos(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4),
                c + 26 * math.sin(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4)) for k in range(10)]
        d.polygon(pts, fill=ORO)
    tri = Image.open(RAIZ / "tridente sin fondo.png").convert("RGBA")
    tri = tri.crop(tri.getbbox())
    esc = 520 / tri.height
    tri = tri.resize((round(tri.width * esc), 520), Image.LANCZOS)
    img.alpha_composite(tri, (int(c - tri.width / 2), int(c - tri.height / 2)))
    return img


piezas.append(guardar(sello(), "parche-sello-maryland-state"))


# 9. Parche de capitán (C con estrellas, se usa en muchos equipos de la NCAA)
def capitan():
    img = Image.new("RGBA", (700, 800), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, 699, 799], radius=60, fill=ORO)
    d.rounded_rectangle([22, 22, 677, 777], radius=46, fill=TEAL)
    c = texto_capas("C", FRESHMAN, 520, BLANCO, [(ORO, 14)])
    c = c.crop(c.getbbox())
    img.alpha_composite(c, (350 - c.width // 2, 300 - c.height // 2))
    for i in range(4):
        x = 350 + (i - 1.5) * 120
        pts = [(x + 40 * math.cos(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4),
                670 + 40 * math.sin(math.radians(-90 + k * 36)) * (1 if k % 2 == 0 else 0.4)) for k in range(10)]
        d.polygon(pts, fill=ORO)
    return img


piezas.append(guardar(capitan(), "parche-capitan"))


# Hoja de muestra: cada pieza sobre teal, blanco y negro
celda = 300
cols = 4
filas = math.ceil(len(piezas) / cols)
fondos = [TEAL, "#F2F2F2", TINTA]
hoja = Image.new("RGB", (cols * celda * 3, filas * (celda + 40)), "#888888")
dh = ImageDraw.Draw(hoja)
fuente_et = ImageFont.truetype(GRADUATE, 18)
for i, (nombre, img) in enumerate(piezas):
    fx, fy = (i % cols) * celda * 3, (i // cols) * (celda + 40)
    for j, fondo in enumerate(fondos):
        caja = Image.new("RGB", (celda, celda), fondo)
        mini = img.copy()
        mini.thumbnail((celda - 30, celda - 30), Image.LANCZOS)
        caja.paste(mini, ((celda - mini.width) // 2, (celda - mini.height) // 2), mini)
        hoja.paste(caja, (fx + j * celda, fy))
    dh.text((fx + 8, fy + celda + 8), nombre, font=fuente_et, fill="white")
hoja.save(SAL.parent / "hoja.png")
print(len(piezas), "plantillas en", SAL)
