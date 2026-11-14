"""Capas de la cara malvada de Poseidón para el vídeo de Halloween.

Todo se dibuja sobre la cabeza minimalista escalada x4. Las coordenadas van en píxeles de la
imagen original (446x433) y se multiplican por S.

    python sonrisa.py          # saca prueba_sonrisa.png para revisar
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

aqui = pathlib.Path(__file__).resolve().parent
raiz = aqui.parent.parent
S = 4

BASE = Image.open(raiz / "videos/assets/logos/cabeza_minimalista.png").convert("RGBA")
W0, H0 = BASE.size

# Puntos en la imagen original (cara de perfil mirando a la derecha)
OJO = [(305, 216), (326, 224), (318, 230)]
BOCA_ARRIBA = [(289, 238), (300, 254), (316, 264), (336, 269), (356, 268), (371, 262)]
BOCA_ABAJO = [(371, 262), (364, 280), (348, 291), (327, 292), (308, 283), (295, 263)]
TINTA = (4, 13, 18, 255)


def sc(pts):
    return [(x * S, y * S) for x, y in pts]


def cabeza():
    return BASE.resize((W0 * S, H0 * S), Image.LANCZOS)


def _interp(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if min(x0, x1) <= x <= max(x0, x1) and x0 != x1:
            return y0 + (x - x0) / (x1 - x0) * (y1 - y0)
    return pts[-1][1]


def boca(apertura=1.0, brillo=1.0):
    """Sonrisa tallada como una calabaza: hueco que brilla por dentro y dientes en punta
    recortados en tinta. apertura 0..1 la abre desde delante hacia la mejilla."""
    w, h = W0 * S, H0 * S
    vacio = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if apertura <= 0:
        return vacio, vacio.copy()
    xcorte = 371 - (371 - 289) * apertura
    a = [(x, y) for x, y in BOCA_ARRIBA if x >= xcorte]
    b = [(x, y) for x, y in BOCA_ABAJO if x >= xcorte]
    ya, yb = _interp(BOCA_ARRIBA, xcorte), _interp(BOCA_ABAJO[::-1], xcorte)
    # se va cerrando hacia la comisura que avanza
    yc = (ya + yb) / 2
    poli = [(xcorte, yc)] + a + b + [(xcorte, yc)]
    if len(poli) < 4:
        return vacio, vacio.copy()
    mascara = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mascara).polygon(sc(poli), fill=255)
    # luz de dentro: naranja en el centro, oro hacia el borde
    luz = Image.new("RGBA", (w, h), (255, 150, 30, 255))
    centro = Image.new("L", (w, h), 0)
    cx = sum(x for x, _ in poli) / len(poli)
    cy = sum(y for _, y in poli) / len(poli)
    ImageDraw.Draw(centro).ellipse([(cx - 30) * S, (cy - 8) * S, (cx + 30) * S, (cy + 8) * S], fill=255)
    centro = centro.filter(ImageFilter.GaussianBlur(10 * S))
    luz = Image.composite(Image.new("RGBA", (w, h), (255, 236, 170, 255)), luz, centro)
    capa = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    capa.paste(luz, (0, 0), mascara)
    # dientes en punta: triángulos de tinta que entran desde el borde
    d = ImageDraw.Draw(capa)
    def dientes(pts, hacia, alto):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            largo = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
            n = max(1, round(largo / 12))
            for i in range(n):
                t0, t1 = i / n, (i + 1) / n
                p0 = (x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0)
                p1 = (x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1)
                m = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + hacia * alto)
                d.polygon(sc([p0, p1, m]), fill=TINTA)
    dientes(a, +1, 8)
    dientes(b[::-1], -1, 7)
    # contorno de tinta para que encaje con el trazo del logo
    d.line(sc(poli), fill=TINTA, width=int(2.2 * S), joint="curve")
    # resplandor por fuera
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).polygon(sc(poli), fill=(255, 120, 20, int(210 * brillo)))
    glow = glow.filter(ImageFilter.GaussianBlur(10 * S))
    return capa, glow


def ojo(intensidad=1.0):
    w, h = W0 * S, H0 * S
    nucleo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if intensidad <= 0:
        return nucleo, nucleo.copy()
    ImageDraw.Draw(nucleo).polygon(sc(OJO), fill=(255, 60, 20, int(255 * intensidad)))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cx = sum(x for x, _ in OJO) / 3
    cy = sum(y for _, y in OJO) / 3
    r = 22
    ImageDraw.Draw(glow).ellipse([(cx - r) * S, (cy - r * 0.6) * S, (cx + r) * S, (cy + r * 0.6) * S],
                                 fill=(255, 60, 10, int(255 * intensidad)))
    glow = glow.filter(ImageFilter.GaussianBlur(7 * S))
    return nucleo, glow


def cara(apertura=1.0, intensidad=1.0):
    img = cabeza()
    g1 = boca(apertura, intensidad)
    g2 = ojo(intensidad)
    for capa in (g1[1], g2[1]):
        img = Image.alpha_composite(img, capa)
    for capa in (g1[0], g2[0]):
        img = Image.alpha_composite(img, capa)
    return img


if __name__ == "__main__":
    im = cara(1.0, 1.0)
    fondo = Image.new("RGBA", im.size, (4, 13, 18, 255))
    fondo.alpha_composite(im)
    fondo.convert("RGB").save(aqui / "prueba_sonrisa.png")
    fondo.crop((240 * S, 170 * S, 400 * S, 320 * S)).convert("RGB").save(aqui / "prueba_sonrisa_zoom.png")
    print("ok")
