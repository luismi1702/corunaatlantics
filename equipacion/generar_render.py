"""Renders de catálogo de la equipación de flag, copiando la foto del proveedor (modelos 31033 y
31036): la camiseta de espaldas arriba a la izquierda, la de frente delante a la derecha y el
pantalón entre las dos.

Uso:  python generar_render.py   -> render-local.png y render-visitante.png en esta carpeta
Los colores de cada pieza están en KITS.
"""
import base64
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

aqui = pathlib.Path(__file__).resolve().parent
TEAL, ORO, BLANCO, NEGRO = "#006E82", "#D4A843", "#FFFFFF", "#17191b"

KITS = {
    "local": dict(cuerpo=TEAL, cuello=TEAL, filo=ORO, dentro="#004b59", num=BLANCO, perfil=ORO,
                  franjas=[ORO, ORO], puno=[ORO, BLANCO], manga="numero",
                  pantalon=NEGRO, panel=TEAL, vivo=ORO, cintura=NEGRO),
    "visitante": dict(cuerpo=BLANCO, cuello=TEAL, filo=None, dentro="#dfe5e6", num=TEAL, perfil=ORO,
                      franjas=[TEAL, ORO, TEAL], puno=[ORO, TEAL], manga="tridente",
                      pantalon=BLANCO, panel=TEAL, vivo=ORO, cintura=BLANCO),
}
DORSAL_W = 150   # el "10" se dibuja en una caja de 150 x 150

# Silueta: mitad izquierda en una caja de 560 de ancho; la derecha es su espejo
CUERPO_IZQ = "M200,20 Q130,30 72,58 C40,75 14,160 0,262 L96,298 C104,270 110,250 118,236 C112,380 106,520 112,648"
CUERPO_DER = "Q280,668 448,648 C454,520 448,380 442,236 C450,250 456,270 464,298 L560,262 C546,160 520,75 488,58 Q430,30 360,20"
MANGA = "M72,58 C40,75 14,160 0,262 L96,298 C104,270 110,250 118,236 Q122,140 150,40 Z"


def silueta(delante):
    cierre = " L280,112 Z" if delante else " Q280,46 200,20 Z"
    return f"{CUERPO_IZQ} {CUERPO_DER}{cierre}"


def espejo(svg):
    return f'<g transform="translate(560,0) scale(-1,1)">{svg}</g>'


def diez(x, base, alto, relleno, perfil, grosor):
    """El 10 como en la foto: números estrechos de esquinas redondeadas, relleno y perfil fino."""
    s = alto / 150
    uno = "M0,24 L28,0 L52,0 L52,150 L18,150 L18,42 L0,42 Z"
    cero = ("M82,0 H134 Q150,0 150,16 V134 Q150,150 134,150 H82 Q66,150 66,134 V16 Q66,0 82,0 Z "
            "M98,32 V118 H118 V32 Z")
    return (f'<g transform="translate({x - DORSAL_W * s / 2},{base - alto}) scale({s})" fill="{relleno}" '
            f'stroke="{perfil}" stroke-width="{grosor / s}" stroke-linejoin="round" paint-order="stroke" '
            f'fill-rule="evenodd"><path d="{uno}"/><path d="{cero}"/></g>')


def tridente(x, y, alto, rot):
    ruta = aqui / "tridente.png"
    w, h = Image.open(ruta).size
    ancho = alto * w / h
    datos = base64.b64encode(ruta.read_bytes()).decode()
    return (f'<g transform="translate({x},{y}) rotate({rot})"><image href="data:image/png;base64,{datos}" '
            f'x="{-ancho / 2}" y="{-alto / 2}" width="{ancho}" height="{alto}"/></g>')


def bandas_puno(colores):
    """Bandas paralelas al borde de la manga, de abajo arriba."""
    a, b = (0, 262), (96, 298)
    ux, uy = 0.936, 0.351
    nx, ny = 0.351, -0.936
    out, t = "", 0
    for color in colores:
        t2 = t + 17
        p = [(a[0] - ux * 40 + nx * t, a[1] - uy * 40 + ny * t), (b[0] + ux * 40 + nx * t, b[1] + uy * 40 + ny * t),
             (b[0] + ux * 40 + nx * t2, b[1] + uy * 40 + ny * t2), (a[0] - ux * 40 + nx * t2, a[1] - uy * 40 + ny * t2)]
        out += f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in p)}" fill="{color}"/>'
        t = t2
    return out


def franjas_hombro(colores, delante):
    """Franjas que bajan del hombro hacia la manga, como las de la foto."""
    out = ""
    x0 = 112 if delante else 120
    for i, color in enumerate(colores):
        x = x0 + i * 22
        out += (f'<polygon points="{x + 30},-20 {x + 44},-20 {x - 2},{150 if delante else 110} '
                f'{x - 16},{150 if delante else 110}" fill="{color}"/>')
    return out


def camiseta(k, delante, uid):
    forma = silueta(delante)
    clip, clipm = f"c{uid}", f"m{uid}"
    izq = (f'<g clip-path="url(#{clipm})">{bandas_puno(k["puno"])}</g>'
           + franjas_hombro(k["franjas"], delante))
    adorno = izq + espejo(izq)
    if k["manga"] == "numero":
        adorno += diez(54, 216, 54, k["num"], k["perfil"], 3).replace('<g transform="', '<g transform="rotate(20 54 190) ', 1)
        adorno += diez(506, 216, 54, k["num"], k["perfil"], 3).replace('<g transform="', '<g transform="rotate(-20 506 190) ', 1)
    else:
        adorno += tridente(56, 178, 70, 20) + tridente(504, 178, 70, -20)
    if delante:
        texto_color = k["num"]
        pecho = (f'<text x="280" y="232" text-anchor="middle" font-family="Graduate" font-size="42" font-weight="700" '
                 f'textLength="250" lengthAdjust="spacingAndGlyphs" fill="{texto_color}" '
                 + (f'stroke="{k["perfil"]}" stroke-width="5" paint-order="stroke"' if k["cuerpo"] == BLANCO else f'stroke="{texto_color}" stroke-width="2"')
                 + '>ATLANTICS</text>' + diez(280, 470, 210, k["num"], k["perfil"], 5))
        cuello = (f'<path d="M200,20 Q280,34 360,20 L280,112 Z" fill="{k["dentro"]}"/>'
                  + (f'<polyline points="194,14 280,124 366,14" fill="none" stroke="{k["filo"]}" stroke-width="24" stroke-linejoin="miter"/>'
                     if k["filo"] else "")
                  + f'<polyline points="194,14 280,124 366,14" fill="none" stroke="{k["cuello"]}" '
                    f'stroke-width="{16 if k["filo"] else 26}" stroke-linejoin="miter"/>')
    else:
        pecho = diez(280, 470, 270, k["num"], k["perfil"], 5)
        cuello = (f'<path d="M200,20 Q280,30 360,20 Q280,46 200,20 Z" fill="{k["dentro"]}"/>'
                  f'<path d="M196,18 Q280,50 364,18" fill="none" stroke="{k["cuello"]}" stroke-width="14"/>')
    sombras = (
        f'<path d="{forma}" fill="url(#malla)"/>'
        f'<path d="{forma}" fill="none" stroke="#000" stroke-width="46" opacity=".22" filter="url(#b14)"/>'
        f'<path d="M150,280 Q175,450 150,640" stroke="#000" stroke-width="40" opacity=".10" fill="none" filter="url(#b18)"/>'
        f'<path d="M410,280 Q385,450 410,640" stroke="#000" stroke-width="40" opacity=".10" fill="none" filter="url(#b18)"/>'
        f'<path d="M280,130 Q270,380 290,640" stroke="#fff" stroke-width="120" opacity=".06" fill="none" filter="url(#b18)"/>'
        f'<path d="M118,236 Q150,250 170,300" stroke="#000" stroke-width="18" opacity=".18" fill="none" filter="url(#b8)"/>'
        f'<path d="M442,236 Q410,250 390,300" stroke="#000" stroke-width="18" opacity=".18" fill="none" filter="url(#b8)"/>'
        f'<path d="M150,40 Q122,140 118,236" stroke="#000" stroke-width="10" opacity=".16" fill="none" filter="url(#b6)"/>'
        f'<path d="M410,40 Q438,140 442,236" stroke="#000" stroke-width="10" opacity=".16" fill="none" filter="url(#b6)"/>'
        f'<path d="{forma}" fill="url(#luz)"/>'
        f'<path d="M116,636 Q280,656 444,636" stroke="#000" stroke-width="1.4" stroke-dasharray="4 4" opacity=".25" fill="none"/>'
        f'<path d="M112,648 L114,620 M448,648 L446,620" stroke="#000" stroke-width="2" opacity=".35"/>')
    return (f'<clipPath id="{clip}"><path d="{forma}"/></clipPath><clipPath id="{clipm}"><path d="{MANGA}"/></clipPath>'
            f'<g filter="url(#sombra)"><path d="{forma}" fill="{k["cuerpo"]}"/></g>'
            f'<g clip-path="url(#{clip})">{adorno}{pecho}{sombras}</g>{cuello}')


def pantalon(k, uid):
    forma = "M12,0 H328 L346,288 Q262,300 192,296 L170,236 L148,296 Q78,300 -6,288 Z"
    clip = f"p{uid}"
    fruncido = "".join(f'<path d="M{x},6 V32" stroke="#000" stroke-width="1.4" opacity=".22"/>' for x in range(22, 320, 9))
    panel = (f'<polygon points="12,34 38,34 18,300 -20,300" fill="{k["panel"]}"/>'
             f'<polygon points="38,34 44,34 24,300 18,300" fill="{k["vivo"]}"/>'
             f'<polygon points="328,34 302,34 322,300 360,300" fill="{k["panel"]}"/>'
             f'<polygon points="302,34 296,34 316,300 322,300" fill="{k["vivo"]}"/>')
    sombras = (f'<path d="{forma}" fill="url(#malla)"/>'
               f'<path d="{forma}" fill="none" stroke="#000" stroke-width="36" opacity=".22" filter="url(#b14)"/>'
               f'<path d="M170,40 V236" stroke="#000" stroke-width="22" opacity=".16" fill="none" filter="url(#b8)"/>'
               f'<path d="M110,60 Q120,180 100,290 M230,60 Q220,180 240,290" stroke="#000" stroke-width="22" opacity=".09" fill="none" filter="url(#b14)"/>'
               f'<path d="{forma}" fill="url(#luz)"/>'
               f'<line x1="12" y1="34" x2="328" y2="34" stroke="#000" stroke-width="2" opacity=".3"/>')
    return (f'<clipPath id="{clip}"><path d="{forma}"/></clipPath>'
            f'<g filter="url(#sombra)"><path d="{forma}" fill="{k["pantalon"]}"/></g>'
            f'<g clip-path="url(#{clip})">{panel}<rect x="0" y="0" width="340" height="34" fill="{k["cintura"]}"/>'
            f'{fruncido}{sombras}</g>')


DEFS = '''<defs>
<pattern id="malla" width="6" height="6" patternUnits="userSpaceOnUse">
  <circle cx="1.5" cy="1.5" r="1" fill="#000" opacity=".10"/><circle cx="4.5" cy="4.5" r="1" fill="#000" opacity=".10"/></pattern>
<radialGradient id="luz" cx=".42" cy=".28" r=".8">
  <stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
  <stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>
<filter id="b6"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="b14" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="b18" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="sombra" x="-10%" y="-10%" width="120%" height="125%">
  <feDropShadow dx="6" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".22"/></filter>
</defs>'''


def escena(k):
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Graduate&display=swap">
<style>html,body{{margin:0;background:#fff}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1010" viewBox="0 0 1080 1010">{DEFS}
<rect width="1080" height="1010" fill="#ffffff"/>
<g transform="translate(40,30) scale(.95)">{camiseta(k, False, "B")}</g>
<g transform="translate(120,680) scale(.95)">{pantalon(k, "P")}</g>
<g transform="translate(470,300) scale(1.0)">{camiseta(k, True, "F")}</g>
</svg>'''


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1080, "height": 1010})
    for nombre, k in KITS.items():
        html = aqui / f"render-{nombre}.html"
        html.write_text(escena(k), encoding="utf-8")
        pg.goto(html.as_uri()); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(aqui / f"render-{nombre}.png")); print("ok", f"render-{nombre}.png")
        html.unlink()
    b.close()
