# -*- coding: utf-8 -*-
"""Wristband grande: para la muñequera de ventana de 17 × 12 cm, que se abre
como un librito (varias páginas). Convive con la de 9 × 7 de wristband.py, que
no se toca.

Tres páginas: carátula (la que queda a la vista cerrada), ataque entero (las 17
jugadas, 11-51) y defensa entera (las 8 coberturas y la leyenda).

Uso: python wristband_grande.py  ->  wristband-grande.html y wristband-grande.pdf
(A4, con marcas de corte). Los dibujos y los estilos salen de wristband.py y
generar.py, así que las dos wristbands siempre coinciden.
"""
import contextlib, io, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))

with contextlib.redirect_stdout(io.StringIO()):     # generar.py y wristband.py imprimen lo que escriben
    import wristband as w
g = w.g

# La ventana mide 170 × 120 mm: la tarjeta va 1 mm más corta por cada lado
# para que entre. MARGEN es la franja que tapa el marco.
VENTANA = (170, 120)
ANCHO, ALTO, MARGEN = VENTANA[0] - 2, VENTANA[1] - 2, 5


def ataque():
    """Las 17 jugadas en una página, en orden de call: 4 columnas, como las
    casillas de la wristband pequeña (los dibujos son más anchos que altos)."""
    cas = [w.casilla(w.DECENA[f] + i, f, g.REGISTRO[n])
           for f, _, nombres in g.APP_FORMACIONES for i, n in enumerate(nombres, start=1)]
    leyenda = "".join(
        f'<span class="f{w.DECENA[f]}"><b>{w.DECENA[f] + 1}{"–" + str(w.DECENA[f] + len(ns)) if len(ns) > 1 else ""}</b> {f}</span>'
        for f, _, ns in g.APP_FORMACIONES)
    return (f'<div class="ventana xl jugadas"><div class="leyenda">{leyenda}</div>'
            f'<div class="rejilla" style="grid-template-columns:repeat(4,1fr)">{"".join(cas)}</div></div>')


def defensa():
    nombres = w.DEF_VENTANAS[0] + w.DEF_VENTANAS[1]
    cas = [w.casilla_def(g.COBERTURAS[n]) for n in nombres] + [w.leyenda_def()]
    return (f'<div class="ventana xl jugadas"><div class="leyenda"><span class="fdef"><b>1–5 · Zona</b></span>'
            f'<span class="fdef"><b>6–8 · Hombre a hombre</b></span></div>'
            f'<div class="rejilla" style="grid-template-columns:repeat(3,1fr)">{"".join(cas)}</div></div>')


CSS = w.CSS + f"""
.ventana.xl {{ width:{ANCHO}mm; height:{ALTO}mm; }}
.xl.jugadas, .xl.caratula {{ padding:{MARGEN}mm; }}
.xl.caratula {{ gap:8mm; border-bottom-width:3mm; }}
.xl.caratula::before {{ top:{MARGEN + 2}mm; height:2mm; }}
.xl.caratula img {{ height:72mm; margin-top:4mm; }}
.xl.caratula span {{ font-size:13pt; }}
.xl.caratula h1 {{ font-size:48pt; margin:2mm 0 4mm; }}
.xl.caratula em {{ font-size:13pt; }}
.xl .leyenda {{ gap:4mm; padding:1.2mm 2mm; }}
.xl .leyenda span {{ font-size:7.5pt; }}
.xl .leyenda span b {{ font-size:8.5pt; }}
.xl .cab b {{ font-size:11pt; }}
.xl .cab span {{ font-size:7.5pt; }}
.xl .fdef .cab span {{ font-size:9pt; }}
.xl .fdef .cab em {{ font-size:8pt; }}
.xl .ley li {{ font-size:9pt; gap:2mm; }}
.xl .ley li i {{ width:3.2mm; height:3.2mm; }}
.hoja .juego {{ gap:9mm; }}
"""

caratula = w.caratula("Playbook").replace('class="ventana caratula"', 'class="ventana xl caratula"')
script = re.search(r"<script>.*?</script>", w.html, re.S).group(0)    # el encuadre de los dibujos

html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Wristband grande Coruña Atlantics</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
{g.DEFS}
<section class="hoja">
  <h2>Wristband grande · 17 × 12 cm</h2>
  <p>Para la muñequera de ventana grande que se abre como un librito. Cada página mide {ANCHO} × {ALTO} mm, para una ventana de {VENTANA[0]} × {VENTANA[1]} mm; los {MARGEN} mm del borde quedan bajo el marco. Imprimir al 100 % (sin «ajustar a la página») y recortar por la línea discontinua.</p>
  <div class="juego">
    <div class="fila"><small>Página 1 · por fuera</small>{caratula}</div>
    <div class="fila"><small>Página 2 · ataque</small>{ataque()}</div>
  </div>
</section>
<section class="hoja">
  <h2>Wristband grande · Defensa</h2>
  <p>Las 8 coberturas con su número de call (del 1 al 8) y la leyenda de posiciones. Las jugadas de ataque van del 11 al 51.</p>
  <div class="juego">
    <div class="fila"><small>Página 3 · defensa</small>{defensa()}</div>
  </div>
</section>
{script}
</body></html>
"""

ruta = os.path.join(AQUI, "wristband-grande.html")
with open(ruta, "w", encoding="utf-8") as f:
    f.write(html)
print("wristband-grande.html")

if __name__ == "__main__":
    from pathlib import Path
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(Path(ruta).as_uri()); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
        pg.pdf(path=os.path.join(AQUI, "wristband-grande.pdf"), prefer_css_page_size=True, print_background=True)
        b.close()
    print("wristband-grande.pdf")
