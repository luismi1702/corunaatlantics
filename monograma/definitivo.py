"""Monograma AC definitivo: Graduate, una tinta (teal y blanco).

A diferencia de generar.py, aquí los filetes no son trazos con grosor: todo se
convierte en una sola forma cerrada (con huecos), que es lo que piden bordado,
serigrafía y vinilo. Usa la misma composición que generar.py (TIPOS["graduate"]).

Salida en definitivo/: un .svg y un PNG sin fondo a 2000 px por color.
Necesita shapely (pip install shapely).
"""
import os
import subprocess

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

from generar import AQUI, EDGE, TIPOS, captura, zona_cruce

COLORES = {"teal": "#006E82", "blanco": "#FFFFFF"}
PASOS = 12  # puntos por curva


class Muestreo(BasePen):
    """Convierte el glifo en anillos de puntos (las curvas, en tramos rectos)."""
    def __init__(self, gs):
        super().__init__(gs)
        self.anillos, self.act = [], []

    def _moveTo(self, p):
        self.act = [p]

    def _lineTo(self, p):
        self.act.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.act[-1]
        for i in range(1, PASOS + 1):
            t = i / PASOS
            u = 1 - t
            self.act.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                             u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self.act[-1]
        for i in range(1, PASOS + 1):
            t = i / PASOS
            u = 1 - t
            self.act.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                             u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if len(self.act) > 2:
            self.anillos.append(self.act)
        self.act = []

    _endPath = _closePath


def forma(font, letra, s, x0, base):
    gs = font.getGlyphSet()
    pen = Muestreo(gs)
    gs[font.getBestCmap()[ord(letra)]].draw(pen)
    geo = None
    for anillo in pen.anillos:  # par-impar: cada contorno suma o resta
        p = Polygon([(x0 + s * x, base - s * y) for x, y in anillo]).buffer(0)
        geo = p if geo is None else geo.symmetric_difference(p)
    return geo


def letra_tinta(g, r_ext, r_med):
    """Exterior lleno, filete medio hueco, relleno lleno."""
    exterior = g.buffer(r_ext, join_style="round", quad_segs=16)
    medio = g.buffer(r_med, join_style="round", quad_segs=16)
    return exterior.difference(medio).union(g), exterior


def a_path(geo):
    partes = []
    for poly in getattr(geo, "geoms", [geo]):
        for anillo in [poly.exterior, *poly.interiors]:
            pts = list(anillo.coords)[:-1]
            partes.append("M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z")
    return " ".join(partes)


def piezas(t):
    """Las dos letras ya colocadas: (A, C) como formas, sin filetes."""
    font = TTFont(os.path.join(AQUI, t["fuente"]))
    s = t["escala"]
    wc = font.getGlyphSet()[font.getBestCmap()[ord("C")]].width
    x0 = (1000 - (t["dx"] + wc) * s) / 2
    d = t.get("desfase", 0)  # la A sube y la C baja esa cantidad
    ga = forma(font, "A", s, x0, t["base"] - d - t.get("sube_a", 0))  # sube_a: la A sube aún más
    gc = forma(font, "C", s, x0 + t["dx"] * s, t["base"] + d)
    return ga, gc


def zona_auto(t, como=False):
    """Con cruce="auto": la C va delante en la zona de contacto más baja (el pie de la A).
    Solo vale si las letras se tocan en dos sitios separados. como=True devuelve la forma."""
    ga, gc = piezas(t)
    r = t["exterior"] / 2 * t["escala"]
    contacto = ga.buffer(r).intersection(gc.buffer(r))
    zonas = sorted(getattr(contacto, "geoms", [contacto]), key=lambda p: p.centroid.y)
    if len(zonas) < 2:
        raise ValueError("las letras se tocan en un solo sitio: no hay entrelazado limpio")
    z = zonas[-1].buffer(4)
    return z if como else list(z.exterior.coords)


def zona(t):
    """Dónde va la C por encima de la A, como forma.
    cruce: rectángulo/puntos | "auto" (solo en el pie de la A) |
           "auto-inverso" (en todo salvo el pie) | "c-delante" (en todo) |
           "c-tapa" (en todo, y la A tampoco asoma por el hueco de la C)."""
    c = t["cruce"]
    lienzo = box(-500, -500, 2000, 2000)
    if c in ("c-delante", "c-tapa"):
        return lienzo
    if c == "auto":
        return zona_auto(t, como=True)
    if c == "auto-inverso":
        return lienzo.difference(zona_auto(t, como=True))
    return Polygon(zona_cruce(c))


def construir(t):
    """Forma final a una tinta para la composición t (dict de TIPOS)."""
    s = t["escala"]
    ga, gc = piezas(t)
    r_ext, r_med = t["exterior"] / 2 * s, t["medio"] / 2 * s
    tinta_a, ext_a = letra_tinta(ga, r_ext, r_med)
    tinta_c, ext_c = letra_tinta(gc, r_ext, r_med)
    z = zona(t)
    if t["cruce"] == "c-tapa":
        # la silueta de la C con el hueco relleno tapa a la A
        ext_c = ext_c.union(gc.convex_hull.buffer(r_ext, join_style="round", quad_segs=16))
    # mismo orden que generar.py: C, encima A, y encima la C dentro de la zona del cruce
    total = tinta_c.difference(ext_a).union(tinta_a)
    total = total.difference(ext_c.intersection(z)).union(tinta_c.intersection(z))
    total = unary_union(total).buffer(0)
    # quita astillas y rendijas de menos de ~5 unidades que deja el cruce
    total = total.buffer(-2.5).buffer(2.5).buffer(2.5).buffer(-2.5)
    return total.simplify(0.05)


def main():
    total = construir(TIPOS["graduate"])

    out = os.path.join(AQUI, "definitivo")
    os.makedirs(out, exist_ok=True)
    minx, miny, maxx, maxy = total.bounds
    m = 20
    vb = f"{minx - m:.0f} {miny - m:.0f} {maxx - minx + 2 * m:.0f} {maxy - miny + 2 * m:.0f}"
    d = a_path(total)
    tmp = os.path.join(out, "_tmp.html")
    for nombre, color in COLORES.items():
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">'
               f'<path d="{d}" fill="{color}" fill-rule="evenodd"/></svg>')
        base = f"monograma-ac-{nombre}"
        open(os.path.join(out, base + ".svg"), "w", encoding="utf-8").write(svg)
        # PNG cuadrado de 2000 px con el monograma centrado
        open(tmp, "w", encoding="utf-8").write(
            "<!doctype html><style>html,body{margin:0;background:transparent}"
            "svg{display:block;width:1000px;height:1000px}</style>" + svg.replace("<svg ", '<svg preserveAspectRatio="xMidYMid meet" ', 1))
        captura(tmp, os.path.join(out, base + " sin fondo.png"), 1000, 1000, 2, transparente=True)
    os.remove(tmp)
    print("definitivo/: svg y png de", ", ".join(COLORES), "| piezas:", len(getattr(total, "geoms", [total])))


if __name__ == "__main__":
    main()
