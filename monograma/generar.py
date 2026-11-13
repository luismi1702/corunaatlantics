"""Monograma AC (chenille entrelazado) de Coruña Atlantics.

Saca las letras de la fuente como formas (no texto), las monta con dos filetes y
el cruce de la C sobre la A, y escribe:
  svg/  monograma en vectores, una versión por combinación de colores
  png/  las mismas sin fondo a 2000 px (las renderiza Edge en modo headless)
  hoja.html  hoja de prueba con todas las versiones

Uso:  python generar.py            todo
      python generar.py --debug    solo la hoja con las siluetas para ajustar el cruce
"""
import os
import subprocess
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

AQUI = os.path.dirname(os.path.abspath(__file__))
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

TEAL_K = "#006E82"   # teal de la equipación
TEAL = "#4ECDC4"     # teal de la web
GOLD = "#D4A843"
BONE = "#F2EFE6"
INK = "#040d12"

# Tipos: misma composición con dos letras distintas
TIPOS = {
    "graduate": dict(fuente="fuentes/Graduate-Regular.ttf", escala=0.74, dx=330, base=825,
                     exterior=170, medio=92, cruce="auto-inverso", desfase=100, sube_a=90),
    "freshman": dict(fuente="../equipacion/fuentes/Freshman.ttf", escala=0.62, dx=700, base=770,
                     exterior=170, medio=92, cruce=(430, 0, 570, 1000)),
}

# Combinaciones: exterior, filete medio, relleno A, relleno C, fondo de prueba
COLORES = {
    "principal":   dict(o=TEAL_K, m=BONE, a=TEAL_K, c=GOLD, fondo=INK),
    "sobre-oscuro": dict(o=TEAL, m=INK, a=TEAL, c=GOLD, fondo=INK),
    "sobre-teal":  dict(o=BONE, m=TEAL_K, a=BONE, c=GOLD, fondo=TEAL_K),
    "sobre-blanco": dict(o=TEAL_K, m=BONE, a=TEAL_K, c=GOLD, fondo=BONE),
}


def glifo(font, letra):
    gs = font.getGlyphSet()
    pen = SVGPathPen(gs)
    g = gs[font.getBestCmap()[ord(letra)]]
    g.draw(pen)
    return pen.getCommands(), g.width


def letras(tipo):
    t = TIPOS[tipo]
    f = TTFont(os.path.join(AQUI, t["fuente"]))
    (pa, wa), (pc, wc) = glifo(f, "A"), glifo(f, "C")
    s = t["escala"]
    ancho = (t["dx"] + wc) * s
    x0 = (1000 - ancho) / 2
    d = t.get("desfase", 0)  # la A sube y la C baja esa cantidad
    tr_a = f"matrix({s} 0 0 {-s} {x0:.1f} {t['base'] - d - t.get('sube_a', 0)})"
    tr_c = f"matrix({s} 0 0 {-s} {x0 + t['dx'] * s:.1f} {t['base'] + d})"
    return pa, pc, tr_a, tr_c, t


def capa(d, tr, o, m, relleno, t):
    j = 'stroke-linejoin="round"'
    return (f'<g transform="{tr}">'
            f'<path d="{d}" fill="{o}" stroke="{o}" stroke-width="{t["exterior"]}" {j}/>'
            f'<path d="{d}" fill="{m}" stroke="{m}" stroke-width="{t["medio"]}" {j}/>'
            f'<path d="{d}" fill="{relleno}"/></g>')


def zona_cruce(cruce):
    """Zona donde la C va por encima: rectángulo (x, y, ancho, alto) o lista de puntos."""
    if len(cruce) == 4 and all(isinstance(v, (int, float)) for v in cruce):
        x, y, w, h = cruce
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    return list(cruce)


def dibujo(tipo, col, uid):
    """Contenido SVG: C detrás, A encima y un trozo de C otra vez por encima (el cruce)."""
    pa, pc, tr_a, tr_c, t = letras(tipo)
    if isinstance(t["cruce"], str):  # "auto", "auto-inverso"...: la zona la calcula definitivo.py
        from definitivo import a_path, zona
        forma_zona = f'<path d="{a_path(zona(t))}" fill="#fff" fill-rule="evenodd"/>'
    else:
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in zona_cruce(t["cruce"]))
        forma_zona = f'<polygon points="{pts}" fill="#fff"/>'
    c = capa(pc, tr_c, col["o"], col["m"], col["c"], t)
    a = capa(pa, tr_a, col["o"], col["m"], col["a"], t)
    # máscara (no clip) para que el borde del cruce no deje una raya
    return (f'<defs><mask id="cr-{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">'
            f'{forma_zona}</mask></defs>'
            f'{c}{a}<g mask="url(#cr-{uid})">{c}</g>')


def svg(tipo, nombre, una_tinta=None):
    uid = f"{tipo}-{nombre}"
    if una_tinta:
        # una tinta: el filete medio es hueco (se ve la prenda)
        dentro = dibujo(tipo, dict(o="#fff", m="#000", a="#fff", c="#fff"), uid)
        cuerpo = (f'<defs><mask id="t-{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">'
                  f'<rect width="1000" height="1000" fill="#000"/>{dentro}</mask></defs>'
                  f'<rect width="1000" height="1000" fill="{una_tinta}" mask="url(#t-{uid})"/>')
    else:
        cuerpo = dibujo(tipo, COLORES[nombre], uid)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">{cuerpo}</svg>'


def debug():
    pa, pc, tr_a, tr_c, t = letras(sys.argv[2] if len(sys.argv) > 2 else "graduate")
    pts = "" if isinstance(t["cruce"], str) else " ".join(f"{x},{y}" for x, y in zona_cruce(t["cruce"]))
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" style="background:#fff">'
         f'<g transform="{tr_c}"><path d="{pc}" fill="rgba(0,0,255,.25)" stroke="blue" stroke-width="{t["exterior"]}" stroke-opacity=".2"/></g>'
         f'<g transform="{tr_a}"><path d="{pa}" fill="rgba(255,0,0,.25)" stroke="red" stroke-width="{t["exterior"]}" stroke-opacity=".2"/></g>'
         f'<polygon points="{pts}" fill="none" stroke="green" stroke-width="4"/>'
         + "".join(f'<line x1="{i}" y1="0" x2="{i}" y2="1000" stroke="#ccc"/><line x1="0" y1="{i}" x2="1000" y2="{i}" stroke="#ccc"/>' for i in range(100, 1000, 100))
         + '</svg>')
    open(os.path.join(AQUI, "debug.html"), "w", encoding="utf-8").write("<!doctype html><body style=margin:0>" + s)
    captura(os.path.join(AQUI, "debug.html"), os.path.join(AQUI, "debug.png"), 1000, 1000, 1)


def captura(html, png, w, h, escala, transparente=False):
    args = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
            f"--force-device-scale-factor={escala}", f"--screenshot={png}", "--virtual-time-budget=3000"]
    if transparente:
        args.append("--default-background-color=00000000")
    args.append("file:///" + html.replace("\\", "/"))
    subprocess.run(args, capture_output=True)


NOMBRES = {"principal": "Principal", "sobre-oscuro": "Sobre oscuro", "sobre-teal": "Sobre teal",
           "sobre-blanco": "Sobre blanco", "una-tinta-teal": "Una tinta (teal)", "una-tinta-blanco": "Una tinta (blanco)"}


def hoja(piezas):
    fichas = {t: "" for t in TIPOS}
    for tipo, nombre, fondo, contenido in piezas:
        fichas[tipo] += (f'<figure><div class="tile" style="background:{fondo}">{contenido}</div>'
                         f'<figcaption>{NOMBRES[nombre]}</figcaption></figure>')
    css = """
:root{--ink:#040d12;--ink2:#0b1c24;--line:#17323d;--gold:#D4A843;--bone:#F2EFE6;--mute:#8aa3ab;color-scheme:dark}
body{background:var(--ink);color:var(--bone);font-family:"Barlow",system-ui,sans-serif;font-size:16px;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding-block:40px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.eyebrow{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-size:13px}
h1{font-family:"Anton",Impact,sans-serif;font-weight:400;font-size:clamp(40px,7vw,72px);line-height:.95;margin:6px 0 0;text-wrap:balance}
h2{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-weight:700;font-size:24px;letter-spacing:.06em;text-transform:uppercase;margin:40px 0 4px}
p{color:var(--mute);max-width:64ch;margin:8px 0 0}
p b{color:var(--bone);font-weight:500}
.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px;margin-top:28px}
.hero .tile{border-radius:6px;padding:8%}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,170px),1fr));gap:14px;margin-top:16px}
figure{margin:0;display:flex;flex-direction:column;gap:6px;min-width:0}
.tile{aspect-ratio:1/1;max-width:100%;border-radius:4px;padding:10%;border:1px solid var(--line);box-sizing:border-box}
.tile svg{width:100%;height:100%;display:block}
figcaption{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:15px;letter-spacing:.04em;color:var(--mute)}
"""
    principal = {t: next(c for tp, n, f, c in piezas if tp == t and n == "principal") for t in TIPOS}
    html = f"""<title>Monograma AC</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;700&family=Barlow:wght@400;500&display=swap">
<style>{css}</style>
<div class="wrap">
<div class="eyebrow">#WeAreAtlantics · Ronda 3</div>
<h1>Monograma AC · Chenille</h1>
<p>El entrelazado elegido, ya dibujado con formas: la A pasa por encima de la C arriba y la C por encima de la A abajo. Dos letras para comparar: <b>Graduate</b>, la de la propuesta, y <b>Freshman</b>, la de los números de la camiseta. Con Freshman las letras solo se tocan en un punto, así que la C va delante en vez de entrelazada.</p>
<div class="hero">
<figure><div class="tile" style="background:{INK}">{principal['graduate']}</div><figcaption>Graduate · la de la propuesta</figcaption></figure>
<figure><div class="tile" style="background:{INK}">{principal['freshman']}</div><figcaption>Freshman · la de los números de la camiseta</figcaption></figure>
</div>
<h2>Graduate · versiones</h2>
<div class="grid">{fichas['graduate']}</div>
<h2>Freshman · versiones</h2>
<div class="grid">{fichas['freshman']}</div>
<p><b>Una tinta</b> es para bordar o serigrafiar en un solo color: el filete del medio queda hueco y se ve la prenda.</p>
</div>
"""
    open(os.path.join(AQUI, "hoja.html"), "w", encoding="utf-8").write(html)


def main():
    os.makedirs(os.path.join(AQUI, "svg"), exist_ok=True)
    os.makedirs(os.path.join(AQUI, "png"), exist_ok=True)
    tmp = os.path.join(AQUI, "_tmp.html")
    piezas = []
    for tipo in TIPOS:
        trabajos = [(n, None) for n in COLORES] + [("una-tinta-teal", TEAL_K), ("una-tinta-blanco", BONE)]
        for nombre, tinta in trabajos:
            contenido = svg(tipo, nombre, tinta)
            base = f"monograma-ac-{tipo}-{nombre}"
            open(os.path.join(AQUI, "svg", base + ".svg"), "w", encoding="utf-8").write(contenido)
            open(tmp, "w", encoding="utf-8").write(
                "<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>" + contenido)
            captura(tmp, os.path.join(AQUI, "png", base + " sin fondo.png"), 1000, 1000, 2, transparente=True)
            fondo = COLORES.get(nombre, {}).get("fondo") or (BONE if tinta == TEAL_K else TEAL_K)
            piezas.append((tipo, nombre, fondo, contenido))
    os.remove(tmp)
    hoja(piezas)
    print(f"{len(piezas)} versiones en svg/ y png/")


if __name__ == "__main__":
    debug() if "--debug" in sys.argv else main()
