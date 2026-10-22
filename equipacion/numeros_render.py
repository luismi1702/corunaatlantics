"""Cambia la tipografía de los dorsales en el render del proveedor (imagen, no vectorial).

Borra el número de pecho y espalda de render-proveedor-<kit>-original.png rellenando con la tela
de alrededor y dibuja encima el mismo número en fuentes/Jersey M54.ttf.

Uso:  python numeros_render.py [numero]   -> render-proveedor-<kit>.png (después, ficha_proveedor.py)
Los números pequeños de las mangas no se tocan.
"""
import pathlib, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

aqui = pathlib.Path(__file__).resolve().parent
FUENTE = aqui / "fuentes" / "Jersey M54.ttf"
NUM = sys.argv[1] if len(sys.argv) > 1 else "10"
TEAL, ORO, BLANCO = (0, 110, 130), (212, 160, 40), (255, 255, 255)
# caja de cada dorsal (x0, y0, x1, y1) y caída del lado derecho en px (perspectiva del render)
KITS = {
    "local": dict(relleno=BLANCO, zonas=[((186, 285, 576, 696), 0, (205, 295, 562, 682)), ((714, 628, 1032, 986), 9)]),
    "visitante": dict(relleno=TEAL, zonas=[((280, 258, 575, 588), 0), ((762, 527, 1028, 824), 8)]),
}


def mascara(img, caja, kit):
    """Píxeles del número viejo dentro de la caja: lo que no es color de la tela."""
    x0, y0, x1, y1 = caja
    hsv = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    oro = (h > 8) & (h < 35) & (s > 90)
    if kit == "local":
        m = oro | ((s < 70) & (v > 150))            # blanco y oro sobre teal
    else:
        m = oro | ((h > 80) & (h < 110) & (s > 90))  # teal y oro sobre blanco
    # solo las manchas que llegan al centro de la caja: fuera queda el fondo blanco que asoma por el borde
    n, etq, est, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    limpio = np.zeros(m.shape, np.uint8)
    for i in range(1, n):
        cx0, cy0, cw, ch = est[i, :4]
        if cx0 < m.shape[1] - 45 and cx0 + cw > 45 and cy0 < m.shape[0] - 25 and cy0 + ch > 25 and est[i, 4] > 200:
            limpio[etq == i] = 255
    m = cv2.dilate(limpio, np.ones((9, 9), np.uint8), iterations=2)
    total = np.zeros(img.shape[:2], np.uint8)
    total[y0:y1, x0:x1] = m
    return total


def dorsal(alto, relleno, perfil=7):
    f = ImageFont.truetype(str(FUENTE), 1000)
    l, t, r, b = f.getbbox(NUM)
    f = ImageFont.truetype(str(FUENTE), int(1000 * alto / (b - t)))
    l, t, r, b = f.getbbox(NUM, stroke_width=perfil)
    im = Image.new("RGBA", (r - l + 4, b - t + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2 - t), NUM, font=f, fill=relleno + (255,), stroke_width=perfil, stroke_fill=ORO + (255,))
    return np.array(im)


for kit, k in KITS.items():
    img = np.array(Image.open(aqui / f"render-proveedor-{kit}-original.png").convert("RGB"))
    for caja, caida, *dib in k["zonas"]:
        m = mascara(img, caja, kit)
        img = cv2.inpaint(img, m, 9, cv2.INPAINT_TELEA)
        x0, y0, x1, y1 = caja
        x0, y0, x1, y1 = caja
        img[y0:y1, x0:x1] = np.where(m[y0:y1, x0:x1, None] > 0, cv2.GaussianBlur(img[y0:y1, x0:x1], (0, 0), 6), img[y0:y1, x0:x1])
        x0, y0, x1, y1 = dib[0] if dib else caja
        alto = (y1 - y0) - 26 - caida
        d = dorsal(alto, k["relleno"])
        h, w = d.shape[:2]
        cx = (x0 + x1) / 2
        dx0, dy0 = cx - w / 2, y0 + 12
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = np.float32([[dx0, dy0], [dx0 + w, dy0 + caida], [dx0 + w, dy0 + h + caida], [dx0, dy0 + h]])
        capa = cv2.warpPerspective(d, cv2.getPerspectiveTransform(src, dst), (img.shape[1], img.shape[0]), flags=cv2.INTER_LANCZOS4)
        a = capa[..., 3:4].astype(float) / 255
        # sombreado de la tela: se conserva la luz del render debajo del número
        luz = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), (0, 0), 25).astype(float)
        luz = (luz / max(luz[y0:y1, x0:x1].mean(), 1))[..., None].clip(0.86, 1.08)
        img = (img * (1 - a) + capa[..., :3] * luz * a).clip(0, 255).astype(np.uint8)
    Image.fromarray(img).save(aqui / f"render-proveedor-{kit}.png")
    print("ok", kit)
