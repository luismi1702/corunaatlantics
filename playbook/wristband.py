# -*- coding: utf-8 -*-
"""Wristbands de ataque y de defensa, a tamaño real para imprimir.

Tres ventanas: la de arriba es una carátula (no deja ver las jugadas) y las
jugadas, numeradas por formación, van repartidas en las otras dos.
Numeración: 11-16 Spread, 21-24 Twins, 31-33 Trips, 41-43 Bunch, 51 Trips Stacked.

Uso: python wristband.py  ->  wristband.html (A4, con marcas de corte).
Los dibujos salen de generar.py, así que la wristband y el playbook siempre
coinciden.
"""
import contextlib, io, os

AQUI = os.path.dirname(os.path.abspath(__file__))

with contextlib.redirect_stdout(io.StringIO()):     # generar.py imprime lo que escribe
    import generar as g

# Tamaño de la tarjeta que entra en cada ventana, en mm. La ventana de la
# muñequera mide 90 x 70 por dentro: la tarjeta va 1 mm más corta por cada
# lado para que entre, y MARGEN es la franja que tapa el marco, donde no se
# pone nada que haya que leer.
VENTANA = (90, 70)
ANCHO, ALTO, MARGEN = VENTANA[0] - 2, VENTANA[1] - 2, 4

# Ventana 2 y ventana 3: qué formaciones van en cada una.
VENTANAS = [["Spread"], ["Twins", "Trips", "Bunch", "Trips Stacked"]]

FORMS = {nom: nombres for nom, _, nombres in g.APP_FORMACIONES}
DECENA = {nom: 10 * (i + 1) for i, (nom, _, _) in enumerate(g.APP_FORMACIONES)}

def cabeza_incrustada(alto=420):
    """La cabeza de Poseidón sin fondo, recortada a su contorno (el PNG trae mucho margen)."""
    import base64
    from PIL import Image
    im = Image.open(os.path.join(AQUI, "..", "cabeza minimalista sin fondo.png")).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox())
    im = im.resize((round(im.width * alto / im.height), alto), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


ESCUDO = cabeza_incrustada()


def dibujo_muneca(svg, con_qb=False):
    """El dibujo del playbook, adaptado a una casilla de 3 cm: se recorta la zona
    del QB (siempre igual) y el campo de banda a banda, para que la jugada
    ocupe todo el sitio. Las líneas y los círculos se engordan por CSS."""
    import re
    if con_qb:      # el QB tiene ruta o lanza un lateral: se deja el campo entero
        svg = svg.replace('viewBox="0 0 300 166"', 'viewBox="12 0 276 166"', 1)
    else:
        svg = svg.replace('viewBox="0 0 300 166"', 'viewBox="12 0 276 132"', 1)
        svg = re.sub(r'<circle cx="[\d.]+" cy="[\d.]+" r="8" fill="#D4A843"[^>]*/><text[^>]*>Q</text>', '', svg)
    svg = re.sub(r'<text[^>]*>\d+ yd</text>', '', svg)        # rótulos 5 yd / 10 yd: ilegibles a este tamaño
    return svg


def casilla(num, form, j):
    return (f'<div class="cas f{DECENA[form]}"><div class="cab"><b>{num}</b><span>{j["nombre"]}</span></div>'
            f'<div class="dib">{dibujo_muneca(j["svg"], any(k == "Q" for k, _, _ in j["rutas"]))}</div></div>')


def ventana_jugadas(formas):
    cas = []
    for form in formas:
        for i, nombre in enumerate(FORMS[form], start=1):
            cas.append(casilla(DECENA[form] + i, form, g.REGISTRO[nombre]))
    leyenda = "".join(f'<span class="f{DECENA[f]}"><b>{DECENA[f] + 1}{"–" + str(DECENA[f] + len(FORMS[f])) if len(FORMS[f]) > 1 else ""}</b> {f}</span>'
                      for f in formas)
    cols = 2 if len(cas) <= 6 else 3          # la tarjeta es estrecha: pocas columnas, dibujos más anchos
    return (f'<div class="ventana jugadas"><div class="leyenda">{leyenda}</div>'
            f'<div class="rejilla" style="grid-template-columns:repeat({cols},1fr)">{"".join(cas)}</div></div>')


def caratula(titulo):
    return (f'<div class="ventana caratula"><img src="{ESCUDO}" alt="">'
            f'<div><span>Coruña Atlantics</span><h1>{titulo}</h1><em>#WeAreAtlantics</em></div></div>')


# --- defensa: las coberturas del capítulo 6, por nombre (es lo que se canta)
DEF_VENTANAS = [["Rocco", "Jonas", "Simon", "Ramone", "Salomé"], ["Bunch", "Joachim", "Valhalla"]]


def dibujo_def(svg):
    """La cobertura del playbook en una casilla: sin rótulos de yardas, sin la zona
    del QB (la flecha del rush se entiende igual) y con los triángulos más grandes."""
    import re
    svg = svg.replace('viewBox="0 0 300 166"', 'viewBox="12 0 276 120"', 1)
    svg = re.sub(r'<text[^>]*>[0-9]+ yd</text>', '', svg)

    def grande(m):
        x, y = float(m.group("x")), float(m.group("ty")) - 0.5
        f = 1.6
        tri = (f'<path d="M{x - 9 * f:.1f} {y - 7 * f:.1f} L{x + 9 * f:.1f} {y - 7 * f:.1f} L{x:.1f} {y + 8 * f:.1f} z" '
               f'fill="{m.group("c")}" stroke="#fff" stroke-width="1.2"/>')
        txt = (f'<text x="{x:.1f}" y="{y - 1:.1f}" font-family="Barlow Condensed, sans-serif" font-weight="700" '
               f'font-size="{12 if len(m.group("k")) > 1 else 14}" text-anchor="middle" fill="#fff" class="tri">{m.group("k")}</text>')
        return tri + txt
    return re.sub(r'<path d="M[\d.]+ [\d.]+ L[\d.]+ [\d.]+ L[\d.]+ [\d.]+ z" fill="(?P<c>#[0-9a-fA-F]+)" stroke="#fff" stroke-width="1"/>'
                  r'<text x="(?P<x>[\d.]+)" y="(?P<ty>[\d.]+)"[^>]*>(?P<k>[A-Z]+)</text>', grande, svg)


def casilla_def(c):
    extra = "sin rush" if "Sin rush" in c["sub"] else ""
    return (f'<div class="cas fdef"><div class="cab"><b>{g.DNUM[c["nombre"]]}</b><span>{c["nombre"]}</span><em>{extra}</em></div>'
            f'<div class="dib">{dibujo_def(c["svg"])}</div></div>')


def leyenda_def():
    filas = "".join(f'<li><i style="background:{g.DCOL[k]}"></i><b>{k}</b> {g.DNOMBRE[k]}</li>' for k in g.DCOL)
    return f'<div class="cas fdef ley"><ul>{filas}</ul></div>'


def ventana_def(nombres, titulo, cols, leyenda=False):
    cas = [casilla_def(g.COBERTURAS[n]) for n in nombres] + ([leyenda_def()] if leyenda else [])
    return (f'<div class="ventana jugadas"><div class="leyenda"><span class="fdef"><b>{titulo}</b></span></div>'
            f'<div class="rejilla" style="grid-template-columns:repeat({cols},1fr)">{"".join(cas)}</div></div>')


CSS = f"""
@page {{ size:A4; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html {{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
body {{ background:#cfd8da; font-family:'Barlow',sans-serif; color:#040d12; }}
.hoja {{ width:210mm; height:297mm; margin:8mm auto; background:#fff; padding:14mm 15mm; position:relative; box-shadow:0 2mm 8mm rgba(4,13,18,.25); }}
@media print {{ body {{ background:none; }} .hoja {{ margin:0; box-shadow:none; }} }}
.hoja h2 {{ font-family:'Anton',sans-serif; font-weight:400; font-size:15pt; letter-spacing:.04em; text-transform:uppercase; color:#006E82; }}
.hoja > p {{ font-size:9pt; color:#5b6a70; margin:1mm 0 6mm; }}
.juego {{ display:flex; flex-direction:column; gap:7mm; align-items:flex-start; }}
.fila {{ display:flex; align-items:center; gap:4mm; }}
.fila > small {{ width:22mm; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:8pt; letter-spacing:.14em; text-transform:uppercase; color:#5b6a70; }}

/* La ventana: tamaño real y línea de corte discontinua alrededor */
.ventana {{ width:{ANCHO}mm; height:{ALTO}mm; outline:.25mm dashed #9aa9ae; outline-offset:1.5mm; overflow:hidden; }}

.caratula {{ background:#040d12; color:#fff; display:flex; align-items:center; justify-content:center; gap:3mm; padding:{MARGEN}mm; border-bottom:2mm solid #D4A843; position:relative; }}
.caratula::before {{ content:''; position:absolute; left:0; right:0; top:{MARGEN + 1}mm; height:1.2mm; background:#006E82; }}
.caratula img {{ height:34mm; width:auto; margin-top:3mm; }}
.caratula span {{ font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:8pt; letter-spacing:.32em; text-transform:uppercase; color:#4ECDC4; }}
.caratula h1 {{ font-family:'Anton',sans-serif; font-weight:400; font-size:24pt; line-height:1; letter-spacing:.03em; text-transform:uppercase; margin:1mm 0 2mm; }}
.caratula em {{ font-family:'Barlow Condensed',sans-serif; font-style:normal; font-weight:700; font-size:8pt; letter-spacing:.24em; color:#D4A843; }}

.jugadas {{ background:#040d12; display:flex; flex-direction:column; padding:{MARGEN}mm; }}
.leyenda {{ display:flex; gap:2.5mm; background:#040d12; padding:.8mm 2mm; flex:none; }}
.leyenda span {{ font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:6.5pt; letter-spacing:.1em; text-transform:uppercase; color:#fff; display:flex; align-items:center; gap:1mm; }}
.leyenda span b {{ font-family:'Anton',sans-serif; font-weight:400; font-size:7pt; letter-spacing:.02em; padding:0 1mm; border-radius:.6mm; color:#040d12; }}
.rejilla {{ flex:1; display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:1fr; gap:.5mm; padding:.5mm; background:#d5dee0; }}
.cas {{ background:#fff; display:flex; flex-direction:column; min-height:0; overflow:hidden; border-top:1mm solid; }}
.cab {{ display:flex; align-items:center; gap:1mm; padding:.4mm 1mm 0; flex:none; }}
.cab b {{ font-family:'Anton',sans-serif; font-weight:400; font-size:9pt; line-height:1; }}
.cab span {{ font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:6.4pt; letter-spacing:.03em; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
.dib {{ flex:1; min-height:0; position:relative; }}
.dib svg {{ position:absolute; inset:0; width:100%; height:100%; display:block; }}
/* A 3 cm de ancho todo va al doble de grueso que en el playbook */
.dib path {{ stroke-width:5 !important; }}
.dib path[stroke-dasharray="3 3"] {{ stroke-width:3 !important; }}
.dib circle {{ r:11px; stroke-width:3 !important; }}
.dib rect[width="15"] {{ width:21px; height:21px; transform:translate(-3px,-3px); stroke-width:3 !important; }}
.dib text {{ font-size:15px !important; }}
.dib text[font-size="8"] {{ font-size:12px !important; }}

/* Un color por formación: la franja de arriba de cada casilla y su número */
.f10 {{ border-color:#006E82; }} .f10 .cab b, .leyenda .f10 b {{ color:#006E82; }} .leyenda .f10 b {{ background:#4ECDC4; color:#040d12; }}
.f20 {{ border-color:#D4A843; }} .f20 .cab b {{ color:#9a7414; }} .leyenda .f20 b {{ background:#D4A843; }}
.f30 {{ border-color:#006E82; }} .f30 .cab b {{ color:#006E82; }} .leyenda .f30 b {{ background:#4ECDC4; }}
.f40 {{ border-color:#D4A843; }} .f40 .cab b {{ color:#9a7414; }} .leyenda .f40 b {{ background:#D4A843; }}
.f50 {{ border-color:#040d12; }} .f50 .cab b {{ color:#040d12; }} .leyenda .f50 b {{ background:#fff; }}

/* Defensa: zonas con su borde fino, triángulos sin engordar y solo las flechas más gruesas */
.fdef {{ border-color:#c0392b; }}
.leyenda .fdef b {{ font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:7pt; letter-spacing:.14em; background:#c0392b; color:#fff; padding:0 1.5mm; }}
.fdef .cab b {{ color:#c0392b; }}
.fdef .cab span {{ font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:7pt; text-transform:uppercase; }}
.fdef .cab em {{ margin-left:auto; font-family:'Barlow Condensed',sans-serif; font-style:normal; font-weight:700; font-size:6.5pt; color:#9a7414; white-space:nowrap; }}
.fdef .dib path {{ stroke-width:1.2 !important; }}
.fdef .dib path[marker-end] {{ stroke-width:3.4 !important; }}
.fdef .dib circle {{ r:8px; stroke-width:1.6 !important; }}
.fdef .dib rect[width="14"] {{ width:14px; height:14px; transform:none; stroke-width:1.6 !important; }}
.fdef .dib text {{ font-size:9px !important; }}
.fdef .dib text.tri {{ font-size:13px !important; }}
.ley {{ border-top-color:#040d12; justify-content:center; }}
.ley ul {{ list-style:none; padding:1mm 2mm; display:grid; gap:.6mm; }}
.ley li {{ font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:7pt; display:flex; align-items:center; gap:1.2mm; }}
.ley li i {{ width:2.4mm; height:2.4mm; border-radius:50%; flex:none; }}
.ley li b {{ font-weight:700; width:4.5mm; }}
"""

html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Wristband Coruña Atlantics</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
{g.DEFS}
<section class="hoja">
  <h2>Wristband · Ataque</h2>
  <p>Tamaño real: cada tarjeta mide {ANCHO} × {ALTO} mm, para una ventana de {VENTANA[0]} × {VENTANA[1]} mm; los {MARGEN} mm del borde quedan bajo el marco. Imprimir al 100 % (sin «ajustar a la página») y recortar por la línea discontinua.</p>
  <div class="juego">
    <div class="fila"><small>Ventana 1 · arriba</small>{caratula("Ataque")}</div>
    <div class="fila"><small>Ventana 2</small>{ventana_jugadas(VENTANAS[0])}</div>
    <div class="fila"><small>Ventana 3</small>{ventana_jugadas(VENTANAS[1])}</div>
  </div>
</section>
<section class="hoja">
  <h2>Wristband · Defensa</h2>
  <p>Mismo tamaño que la de ataque. Cada cobertura lleva su número de call (del 1 al 8), para poder mandarla con el número; las jugadas de ataque van del 11 al 51.</p>
  <div class="juego">
    <div class="fila"><small>Ventana 1 · arriba</small>{caratula("Defensa")}</div>
    <div class="fila"><small>Ventana 2 · zona</small>{ventana_def(DEF_VENTANAS[0], "1–5 · Zona", 2)}</div>
    <div class="fila"><small>Ventana 3 · hombre</small>{ventana_def(DEF_VENTANAS[1], "6–8 · Hombre a hombre", 2, leyenda=True)}</div>
  </div>
</section>
<script>
// Cada dibujo se encuadra en su jugada: se mide lo que ocupan rutas y
// jugadores. Todas las jugadas de una formación usan el mismo tamaño de
// encuadre dentro de cada formación (el de su jugada más grande), para que jugadores y flechas midan lo
// mismo en todas; cada jugada se centra en su casilla.
const grupos = {{}};
document.querySelectorAll('.cas').forEach(c => {{
  const k = [...c.classList].find(x => /^f[0-9]+$/.test(x));
  (grupos[k] = grupos[k] || []).push(c.querySelector('.dib svg'));
}});
Object.values(grupos).forEach(svgs => {{
  const medidas = svgs.map(svg => {{
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    svg.querySelectorAll('path, circle, rect[width="15"], text').forEach(el => {{
      if (el.closest('defs')) return;
      const b = el.getBBox();
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
    }});
    return {{ svg, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 }};
  }});
  const m = 12;
  const W = Math.max(...medidas.map(d => d.w)) + 2 * m;
  const H = Math.max(...medidas.map(d => d.h)) + 2 * m;
  medidas.forEach(d => d.svg.setAttribute('viewBox', [d.cx - W / 2, d.cy - H / 2, W, H].join(' ')));
}});
</script>
</body></html>
"""

with open(os.path.join(AQUI, "wristband.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("wristband.html")
