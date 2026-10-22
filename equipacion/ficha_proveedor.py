"""Ficha para el proveedor: su render (ampliado) con la fila de colores debajo.

Uso:  python ficha_proveedor.py  -> ficha-proveedor-local.png y ficha-proveedor-visitante.png
Necesita render-proveedor-<kit>.png en esta carpeta.
"""
import base64, pathlib
from playwright.sync_api import sync_playwright

aqui = pathlib.Path(__file__).resolve().parent
TEAL = ("#006E82", "Teal", "CMYK aprox. C85 M35 Y28 K14")
ORO = ("#D4A843", "Oro", "CMYK aprox. C11 M29 Y87 K1")
BLANCO = ("#FFFFFF", "Blanco", "")
NEGRO = ("#16191C", "Negro", "")
FICHAS = {
    "local": ("EQUIPACIÓN LOCAL", [
        (TEAL, "Cuerpo de la camiseta · Cuello · Banda lateral del pantalón"),
        (ORO, "Franjas de los hombros · Filo del cuello · Puño · Perfil de los números · Vivo del pantalón"),
        (BLANCO, "Números · ATLANTICS · Franja de la manga"),
        (NEGRO, "Pantalón")]),
    "visitante": ("EQUIPACIÓN VISITANTE", [
        (BLANCO, "Cuerpo de la camiseta · Pantalón"),
        (TEAL, "Cuello · Franjas de los hombros · Números · ATLANTICS · Puño · Banda lateral del pantalón"),
        (ORO, "Franja central del hombro · Perfil de los números · Filo del puño · Tridentes · Vivo del pantalón")]),
}


def hoja(nombre, titulo, colores):
    img = base64.b64encode((aqui / f"render-proveedor-{nombre}.png").read_bytes()).decode()
    filas = "".join(
        f'<div class="c"><div class="m" style="background:{h}"></div><div><b>{h}</b><span>{n}</span>'
        f'<i>{ref}</i><p>{uso}</p></div></div>' for (h, n, ref), uso in colores)
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&display=swap">
<style>body{{margin:0;width:1440px;background:#fff;font-family:Oswald,sans-serif;color:#222}}
img{{display:block;width:1440px}}
.pie{{padding:10px 70px 60px;border-top:2px solid #e3e3e3;margin:0 40px}}
h2{{font-weight:700;letter-spacing:4px;color:#006E82;font-size:30px;margin:28px 0 24px}}
.g{{display:grid;grid-template-columns:1fr 1fr;gap:30px 50px}}
.c{{display:flex;gap:20px;align-items:flex-start}}
.m{{flex:0 0 96px;height:96px;border-radius:12px;border:2px solid #aaa}}
b{{display:block;font-size:30px}} span{{display:block;font-size:22px;font-weight:500;color:#444}}
i{{display:block;font-style:normal;font-size:18px;color:#777}} p{{margin:8px 0 0;font-size:19px;color:#555;line-height:1.3}}</style>
<img src="data:image/png;base64,{img}">
<div class="pie"><h2>{titulo} · COLORES</h2><div class="g">{filas}</div></div>'''


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 800})
    for nombre, (titulo, colores) in FICHAS.items():
        pg.set_content(hoja(nombre, titulo, colores)); pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(aqui / f"ficha-proveedor-{nombre}.png"), full_page=True); print("ok", nombre)
    b.close()
