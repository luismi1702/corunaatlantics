"""Catálogo con todas las opciones de sudadera y chándal de las cuatro rondas, numeradas seguidas.

Uso:  python catalogo.py                      -> todo el catálogo
      python catalogo.py S6 S7 C2 C12 ...     -> solo esas, en seleccion-sudaderas.png / seleccion-chandales.png
Saca catalogo-sudaderas-1.png (S1–S12), catalogo-sudaderas-2.png (S13–S24)
y lo mismo para los chándales (C1–C24). Cada ronda se dibuja con su propio
generar_ropa.py (guardado en rondaN/), así que salen tal cual se enseñaron.
"""
import pathlib, re, sys
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
ELEGIDAS = {c.upper() for c in sys.argv[1:]}
POR_HOJA = 12


def cargar(ronda):
    """Carga las funciones de dibujo de una ronda sin que se ponga a renderizar."""
    fuente = (aqui / f"ronda{ronda}" / "generar_ropa.py").read_text(encoding="utf-8")
    fuente = fuente[:fuente.index("trabajos = {}")]
    ns = {"__file__": str(aqui / "generar_ropa.py"), "__name__": f"ronda{ronda}"}
    exec(compile(fuente, f"ronda{ronda}", "exec"), ns)
    return ns


rondas = [cargar(r) for r in (1, 2, 3, 4)]
svg = rondas[-1]["svg"]   # la última tiene todas las fuentes (Oswald y Yellowtail)
TEAL = rondas[-1]["TEAL"]

for prenda, letra, clave_ficha, clave_opciones in (("sudaderas", "S", "ficha_sudadera", "SUDADERAS"),
                                                     ("chandales", "C", "ficha_chandal", "CHANDALES")):
    items = []
    for r, ns in enumerate(rondas, 1):
        for i, k in enumerate(ns[clave_opciones]):
            titulo = re.sub(r"^\d+\s*·\s*", "", k["titulo"])
            items.append((ns[clave_ficha], k, f"{letra}{len(items) + 1} · {titulo}", f"r{r}n{i}"))
    if ELEGIDAS:
        items = [it for it in items if it[2].split(" · ")[0] in ELEGIDAS]
        if not items:
            continue
    hojas = [items[i:i + POR_HOJA] for i in range(0, len(items), POR_HOJA)]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for h, hoja in enumerate(hojas, 1):
            _, alto_ficha = hoja[0][0](hoja[0][1], "tmp")
            celda = alto_ficha / 2 + 70
            out = ""
            for n, (ficha, k, titulo, sfx) in enumerate(hoja):
                cuerpo, _ = ficha(k, sfx)
                x, y = (n % 2) * 900, (n // 2) * celda
                num, resto = titulo.split(" · ", 1)
                out += (f'<g transform="translate({x},{y})">'
                        f'<rect x="24" y="16" width="{24 + 22 * len(num)}" height="44" rx="6" fill="{TEAL}"/>'
                        f'<text x="{36}" y="50" font-family="Oswald" font-weight="700" font-size="30" fill="#fff">{num}</text>'
                        f'<text x="{60 + 22 * len(num)}" y="48" font-family="Oswald" font-weight="700" font-size="24" '
                        f'fill="{TEAL}">{resto.upper()}</text>'
                        f'<g transform="translate(0,70) scale(.5)">{cuerpo}</g></g>')
            filas = (len(hoja) + 1) // 2
            total = int(filas * celda)
            out += f'<line x1="900" y1="16" x2="900" y2="{total - 16}" stroke="#ddd" stroke-width="2"/>'
            out += "".join(f'<line x1="20" y1="{celda * f}" x2="1780" y2="{celda * f}" stroke="#ddd" stroke-width="2"/>'
                           for f in range(1, filas))
            pg = b.new_page(viewport={"width": 1800, "height": total})
            ruta = aqui / "_catalogo.html"
            ruta.write_text(svg(out, total), encoding="utf-8")
            pg.goto(ruta.as_uri()); pg.wait_for_load_state("networkidle")
            pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
            nombre = f"seleccion-{prenda}.png" if ELEGIDAS else f"catalogo-{prenda}-{h}.png"
            pg.screenshot(path=str(aqui / nombre)); pg.close(); ruta.unlink()
            print("ok", nombre, f"({hoja[0][2].split(' · ')[0]}–{hoja[-1][2].split(' · ')[0]})")
        b.close()
