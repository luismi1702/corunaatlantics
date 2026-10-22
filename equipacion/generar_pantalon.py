"""Pantalón sin líneas a los lados (norma de la liga) y con el tridente en oro delante, en la
pernera izquierda. Saca un PDF con el antes y el después de la local y la visitante.

Uso:  python generar_pantalon.py  -> pantalon-sin-lineas.pdf (castellano) y shorts-no-side-lines.pdf
      (inglés, para el proveedor) en esta carpeta
El dibujo del pantalón es el mismo de generar_render.py.
"""
import base64
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

aqui = pathlib.Path(__file__).resolve().parent
TEAL, ORO, BLANCO, NEGRO = "#006E82", "#D4A843", "#FFFFFF", "#17191b"
TEXTOS = {
    "es": dict(archivo="pantalon-sin-lineas", titulo="PANTALÓN · SIN LÍNEAS A LOS LADOS",
               sub="Por norma de la liga el pantalón no puede llevar líneas en los laterales.",
               kits=[("LOCAL", "Negro liso", NEGRO), ("VISITANTE", "Blanco liso", BLANCO)],
               antes="ANTES", ahora="AHORA", antes_txt="Banda teal y vivo oro a los lados",
               ahora_txt="sin líneas a los lados. Tridente en oro delante, pernera izquierda, ≈ 8 cm de alto",
               nota="Vista de frente. El tridente es el mismo de las mangas de la visitante (archivo vectorial ya enviado), en sus colores normales."),
    "en": dict(archivo="shorts-no-side-lines", titulo="SHORTS · NO SIDE LINES",
               sub="League rule: the shorts can't have any lines or stripes on the sides.",
               kits=[("HOME", "Plain black", NEGRO), ("AWAY", "Plain white", BLANCO)],
               antes="BEFORE", ahora="NOW", antes_txt="Teal side panel and gold piping",
               ahora_txt="no side lines. Gold trident on the front of the left leg, about 8 cm tall",
               nota="Front view. Same trident as on the away sleeves (vector file already sent), in its normal gold colors."),
}

FORMA = "M12,0 H328 L346,288 Q262,300 192,296 L170,236 L148,296 Q78,300 -6,288 Z"
# 296 px de largo ≈ 48 cm (talla L de David): 1 cm ≈ 6,2 px
CM = 6.2
ALTO_TRIDENTE = 8 * CM


def tridente(x, y, alto):
    ruta = aqui / "tridente.png"
    w, h = Image.open(ruta).size
    ancho = alto * w / h
    datos = base64.b64encode(ruta.read_bytes()).decode()
    return (f'<image href="data:image/png;base64,{datos}" x="{x - ancho / 2}" y="{y - alto / 2}" '
            f'width="{ancho}" height="{alto}"/>')


def pantalon(color, uid, lineas, logo):
    clip = f"p{uid}"
    fruncido = "".join(f'<path d="M{x},6 V32" stroke="#000" stroke-width="1.4" opacity=".22"/>'
                       for x in range(22, 320, 9))
    panel = ""
    if lineas:
        panel = (f'<polygon points="12,34 38,34 18,300 -20,300" fill="{TEAL}"/>'
                 f'<polygon points="38,34 44,34 24,300 18,300" fill="{ORO}"/>'
                 f'<polygon points="328,34 302,34 322,300 360,300" fill="{TEAL}"/>'
                 f'<polygon points="302,34 296,34 316,300 322,300" fill="{ORO}"/>')
    # Pernera izquierda del jugador = derecha de quien mira, por delante
    marca = tridente(262, 205, ALTO_TRIDENTE) if logo else ""
    sombras = (f'<path d="{FORMA}" fill="url(#malla)"/>'
               f'<path d="{FORMA}" fill="none" stroke="#000" stroke-width="36" opacity=".22" filter="url(#b14)"/>'
               f'<path d="M170,40 V236" stroke="#000" stroke-width="22" opacity=".16" fill="none" filter="url(#b8)"/>'
               f'<path d="M110,60 Q120,180 100,290 M230,60 Q220,180 240,290" stroke="#000" stroke-width="22" opacity=".09" fill="none" filter="url(#b14)"/>'
               f'<path d="{FORMA}" fill="url(#luz)"/>'
               f'<line x1="12" y1="34" x2="328" y2="34" stroke="#000" stroke-width="2" opacity=".3"/>')
    borde = f'<path d="{FORMA}" fill="none" stroke="#000" stroke-width="1.5" opacity=".18"/>'
    return (f'<clipPath id="{clip}"><path d="{FORMA}"/></clipPath>'
            f'<g filter="url(#sombra)"><path d="{FORMA}" fill="{color}"/></g>'
            f'<g clip-path="url(#{clip})">{panel}<rect x="0" y="0" width="340" height="34" fill="{color}"/>'
            f'{fruncido}{marca}{sombras}</g>{borde}')


DEFS = '''<defs>
<pattern id="malla" width="6" height="6" patternUnits="userSpaceOnUse">
  <circle cx="1.5" cy="1.5" r="1" fill="#000" opacity=".10"/><circle cx="4.5" cy="4.5" r="1" fill="#000" opacity=".10"/></pattern>
<radialGradient id="luz" cx=".42" cy=".28" r=".8">
  <stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
  <stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>
<filter id="b8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="b14" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="sombra" x="-10%" y="-10%" width="120%" height="125%">
  <feDropShadow dx="6" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".22"/></filter>
</defs>'''


def figura(color, uid, lineas, logo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -20 420 350">{DEFS}'
            f'{pantalon(color, uid, lineas, logo)}</svg>')


def fila(t, titulo, desc, color, i):
    return f'''<section><h2>{titulo}</h2><div class="par">
<div class="antes"><span class="tag">{t["antes"]}</span>{figura(color, f"a{i}", True, False)}
<p>{t["antes_txt"]}</p></div>
<div class="flecha">→</div>
<div class="ahora"><span class="tag ok">{t["ahora"]}</span>{figura(color, f"n{i}", False, True)}
<p><b>{desc}</b>, {t["ahora_txt"]}</p></div>
</div></section>'''


def pagina(t):
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&display=swap">
<style>@page{{size:A4;margin:0}}
body{{margin:0;font-family:Oswald,sans-serif;color:#222;background:#fff}}
.pag{{width:210mm;height:297mm;box-sizing:border-box;padding:14mm 14mm 10mm}}
h1{{margin:0;font-size:30px;letter-spacing:3px;color:{TEAL}}}
.sub{{margin:4px 0 8mm;font-size:16px;color:#666}}
h2{{font-size:20px;letter-spacing:4px;color:{TEAL};margin:0 0 3mm;border-bottom:2px solid #e3e3e3;padding-bottom:2mm}}
section{{margin-bottom:8mm}}
.par{{display:grid;grid-template-columns:1fr 10mm 1.35fr;align-items:center}}
.antes svg{{width:100%;opacity:.8}} .ahora svg{{width:100%}}
.flecha{{font-size:30px;color:#999;text-align:center}}
.tag{{display:inline-block;font-size:13px;letter-spacing:2px;padding:2px 10px;border-radius:4px;background:#ddd;color:#555}}
.tag.ok{{background:{TEAL};color:#fff}}
p{{margin:2mm 0 0;font-size:14px;color:#555;line-height:1.3}}
.nota{{font-size:13px;color:#777}}</style>
<div class="pag"><h1>{t["titulo"]}</h1>
<div class="sub">{t["sub"]}</div>
{"".join(fila(t, k, d, c, i) for i, (k, d, c) in enumerate(t["kits"]))}
<div class="nota">{t["nota"]}</div>
</div>'''

with sync_playwright() as p:
    b = p.chromium.launch()
    for t in TEXTOS.values():
        pg = b.new_page(viewport={"width": 794, "height": 1123})
        pg.set_content(pagina(t)); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.pdf(path=str(aqui / f"{t['archivo']}.pdf"), format="A4", print_background=True)
        pg.screenshot(path=str(aqui / f"{t['archivo']}.png"), full_page=True)
        pg.close(); print("ok", t["archivo"])
    b.close()
