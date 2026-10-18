# -*- coding: utf-8 -*-
"""Playsheet de ataque para el staff: A4 vertical, para plastificar.

Arriba, todas las jugadas por formación con su número y su dibujo (la misma
numeración que la wristband). Debajo, qué jugadas cantar en cada situación del
partido, y al final una franja para apuntar a mano.

El reparto por situaciones es un BORRADOR sacado de lo que dice el playbook de
cada jugada; lo decide el staff. Se cambia en SITUACIONES.

Uso: python playsheet.py  ->  playsheet.html (y el PDF con Chrome).
"""
import contextlib, io, os

AQUI = os.path.dirname(os.path.abspath(__file__))

with contextlib.redirect_stdout(io.StringIO()):     # generar.py y wristband.py imprimen lo que escriben
    import generar as g
    import wristband as w

# (situación, aclaración, números de jugada)
SITUACIONES = [
    ("Apertura", "primeras jugadas del partido", [31, 11, 23, 24]),
    ("1.º down", "", [11, 31, 32, 23, 14]),
    ("3.º y 4.º corto", "5 yardas o menos", [21, 22, 24, 42, 51]),
    ("3.º y 4.º largo", "más de 5 yardas", [12, 13, 14, 33, 43]),
    ("Zona roja", "cerca de la end zone", [41, 43, 24, 51]),
    ("Conversión", "", [51, 22, 42]),
    ("Engaño", "una vez por partido", [15, 16, 33]),
]

NUM = {}          # número -> (formación, jugada)
for form, _, nombres in g.APP_FORMACIONES:
    for i, nombre in enumerate(nombres, start=1):
        NUM[w.DECENA[form] + i] = (form, g.REGISTRO[nombre])


def indice():
    filas = []
    for form, _, nombres in g.APP_FORMACIONES:
        d = w.DECENA[form]
        cas = "".join(w.casilla(d + i, form, g.REGISTRO[n]) for i, n in enumerate(nombres, start=1))
        filas.append(f'<div class="ffila"><div class="fnom f{d}"><b>{d + 1}{"–" + str(d + len(nombres)) if len(nombres) > 1 else ""}</b>'
                     f'<span>{form}</span></div><div class="fcas">{cas}</div></div>')
    return "".join(filas)


def situaciones():
    bloques = []
    for nombre, nota, nums in SITUACIONES:
        items = "".join(f'<li class="f{w.DECENA[NUM[n][0]]}"><b>{n}</b><span>{NUM[n][1]["nombre"]}</span></li>' for n in nums)
        nota = f'<small>{nota}</small>' if nota else ""
        bloques.append(f'<section class="sit"><h3>{nombre}{nota}</h3><ul>{items}</ul></section>')
    return "".join(bloques)


CSS = """
@page { size:A4; margin:0; }
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { background:#cfd8da; font-family:'Barlow',sans-serif; color:#040d12; }
.hoja { width:210mm; height:297mm; margin:8mm auto; background:#fff; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 2mm 8mm rgba(4,13,18,.25); }
@media print { body { background:none; } .hoja { margin:0; box-shadow:none; } }

.barra { background:#040d12; color:#fff; display:flex; align-items:center; gap:3mm; padding:2mm 8mm 2mm 5mm; border-bottom:1.1mm solid #D4A843; flex:none; }
.barra img { height:11mm; width:auto; }
.barra h1 { font-family:'Anton',sans-serif; font-weight:400; font-size:17pt; letter-spacing:.04em; text-transform:uppercase; }
.barra h1 span { color:#D4A843; }
.barra .club { margin-left:auto; font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:9pt; letter-spacing:.28em; text-transform:uppercase; color:#4ECDC4; }

.cuerpo { flex:1; min-height:0; display:flex; flex-direction:column; gap:3.5mm; padding:4mm 6mm 5mm; }

/* índice: una fila por formación */
.indice { flex:0 0 158mm; display:flex; flex-direction:column; gap:1.6mm; min-height:0; }
.ffila { flex:1; min-height:0; display:grid; grid-template-columns:11mm 1fr; gap:1.2mm; }
.fnom { background:#040d12; color:#fff; border-radius:1mm; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1mm; border-left:1.2mm solid; }
.fnom b { font-family:'Anton',sans-serif; font-weight:400; font-size:7.5pt; }
.fnom span { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:7pt; letter-spacing:.08em; text-transform:uppercase; writing-mode:vertical-rl; transform:rotate(180deg); }
.fcas { display:grid; grid-template-columns:repeat(6,1fr); gap:1.2mm; min-height:0; }
.cas { background:#fff; border:.3mm solid #d5dee0; border-top:1mm solid; border-radius:.8mm; display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.cab { display:flex; align-items:center; gap:1.2mm; padding:.6mm 1.2mm 0; flex:none; }
.cab b { font-family:'Anton',sans-serif; font-weight:400; font-size:11pt; line-height:1; }
.cab span { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:8pt; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dib { flex:1; min-height:0; position:relative; }
.dib svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
.dib path { stroke-width:4 !important; }
.dib path[stroke-dasharray="3 3"] { stroke-width:2.6 !important; }
.dib circle { r:10px; stroke-width:2.6 !important; }
.dib rect[width="15"] { width:19px; height:19px; transform:translate(-2px,-2px); stroke-width:2.6 !important; }
.dib text { font-size:13px !important; }
.dib text[font-size="8"] { font-size:11px !important; }

/* situaciones */
.lado { flex:1; display:flex; flex-direction:column; gap:2mm; min-height:0; }
.sits { display:grid; grid-template-columns:repeat(4,1fr); gap:2mm; }
.sit { border:.35mm solid #d5dee0; border-radius:1.2mm; overflow:hidden; }
.sit h3 { background:#006E82; color:#fff; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:9.5pt; letter-spacing:.06em; text-transform:uppercase; padding:.8mm 2mm; display:flex; align-items:baseline; gap:1.5mm; }
.sit h3 { flex-direction:column; align-items:flex-start; gap:0; }
.sit h3 small { font-weight:600; font-size:6.5pt; letter-spacing:.04em; text-transform:none; color:#bfe9e6; }
.sit ul { list-style:none; padding:1mm 2mm 1.2mm; }
.sit li { display:flex; align-items:baseline; gap:1.5mm; font-size:9pt; line-height:1.45; }
.sit li b { font-family:'Anton',sans-serif; font-weight:400; font-size:9.5pt; width:5.5mm; }
.sit li span { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:9.5pt; text-transform:uppercase; letter-spacing:.02em; }
.notas { flex:1; border:.35mm solid #d5dee0; border-radius:1.2mm; padding:1.5mm 2mm; display:flex; flex-direction:column; min-height:0;
  background:repeating-linear-gradient(transparent 0 6.4mm, #d5dee0 6.4mm 6.7mm); background-position:0 6.5mm; }
.notas b { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:8pt; letter-spacing:.14em; text-transform:uppercase; color:#5b6a70; }

/* un color por formación, el mismo que en la wristband */
.f10 { border-color:#006E82; } .f20 { border-color:#D4A843; } .f30 { border-color:#006E82; } .f40 { border-color:#D4A843; } .f50 { border-color:#040d12; }
.f10 .cab b, li.f10 b, li.f30 b, .f30 .cab b { color:#006E82; }
.f20 .cab b, li.f20 b, li.f40 b, .f40 .cab b { color:#9a7414; }
.f50 .cab b, li.f50 b { color:#040d12; }
.fnom.f10, .fnom.f30 { border-left-color:#4ECDC4; } .fnom.f20, .fnom.f40 { border-left-color:#D4A843; } .fnom.f50 { border-left-color:#fff; }
"""

# Encuadre de los dibujos: cada formación con su escala (igual que en la wristband)
JS = """
const grupos = {};
document.querySelectorAll('.cas').forEach(c => {
  const k = [...c.classList].find(x => /^f[0-9]+$/.test(x));
  (grupos[k] = grupos[k] || []).push(c.querySelector('.dib svg'));
});
Object.values(grupos).forEach(svgs => {
  const medidas = svgs.map(svg => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    svg.querySelectorAll('path, circle, rect[width="15"], text').forEach(el => {
      if (el.closest('defs')) return;
      const b = el.getBBox();
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
    });
    return { svg, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 };
  });
  const m = 12;
  const W = Math.max(...medidas.map(d => d.w)) + 2 * m;
  const H = Math.max(...medidas.map(d => d.h)) + 2 * m;
  medidas.forEach(d => d.svg.setAttribute('viewBox', [d.cx - W / 2, d.cy - H / 2, W, H].join(' ')));
});
"""

html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Playsheet Coruña Atlantics</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
{g.DEFS}
<section class="hoja">
  <div class="barra"><img src="{w.ESCUDO}" alt=""><h1>Playsheet · <span>Ataque</span></h1><span class="club">Coruña Atlantics</span></div>
  <div class="cuerpo">
    <div class="indice">{indice()}</div>
    <div class="lado">
      <div class="sits">{situaciones()}</div>
      <div class="notas"><b>Notas del partido</b></div>
    </div>
  </div>
</section>
<script>{JS}</script>
</body></html>
"""

with open(os.path.join(AQUI, "playsheet.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("playsheet.html")
