"""Vídeo de Halloween: tormenta, un rayo descubre a Poseidón, se le enciende el ojo, sonríe con
una boca de calabaza y entra TRICK OR TOUCHDOWN.

Todo generado aquí (numpy + OpenCV + PIL, ffmpeg para codificar), sin servicios de pago.
La cara sale de sonrisa.py.

    python generar.py            # videos/halloween/halloween_reel.mp4 (1080x1920, 30 fps)
    python generar.py --prueba   # solo unos fotogramas sueltos en PNG para revisar
"""
import argparse
import pathlib
import subprocess
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import sonrisa

aqui = pathlib.Path(__file__).resolve().parent
raiz = aqui.parent.parent
fuentes = raiz / "videos/assets/fuentes"

p = argparse.ArgumentParser()
p.add_argument("--prueba", action="store_true")
p.add_argument("--salida", default="halloween_reel.mp4")
a = p.parse_args()

W, H, FPS, DUR = 1080, 1920, 30, 8.5
N = int(DUR * FPS)
rng = np.random.default_rng(31)

TEAL = np.float32([0.306, 0.804, 0.769])
GOLD = np.float32([0.831, 0.659, 0.263])
INK = np.float32([0.016, 0.051, 0.071])
ASCUA = np.float32([1.0, 0.45, 0.08])


def suave(x, a0, a1):
    x = np.clip((x - a0) / (a1 - a0), 0, 1)
    return x * x * (3 - 2 * x)


def blur(img, s):
    out = cv2.GaussianBlur(np.ascontiguousarray(img, np.float32), (0, 0), s)
    return out.reshape(img.shape)


def a_np(im):
    return np.asarray(im, np.float32) / 255


# --- Cabeza y capas, a tamaño de pantalla ------------------------------------------
CAB_W = 900
esc = CAB_W / sonrisa.cabeza().width
CAB_H = round(sonrisa.cabeza().height * esc)
PAD = 120


def a_pantalla(im):
    im = im.resize((CAB_W, CAB_H), Image.LANCZOS)
    arr = a_np(im)
    return np.pad(arr, ((PAD, PAD), (PAD, PAD), (0, 0)))


base = a_pantalla(sonrisa.cabeza())
BH, BW = base.shape[:2]
base_a = base[..., 3:4]
base_rgb = base[..., :3] * base_a

ojo_nucleo, ojo_glow = (a_pantalla(c) for c in sonrisa.ojo(1.0))

PASOS = 40
bocas = []
for k in range(PASOS + 1):
    capa, glow = sonrisa.boca(k / PASOS, 1.0)
    bocas.append((a_pantalla(capa), a_pantalla(glow)))
print("capas listas")

# punto de la cara hacia el que empuja la cámara (entre ojo y boca), en la caja con margen
FOCO = np.float32([(330 * sonrisa.S) * esc + PAD, (250 * sonrisa.S) * esc + PAD])

# --- Fondo: nubes, lluvia, rayos ----------------------------------------------------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def ruido(h, w, celdas, semilla):
    rr = np.random.default_rng(semilla)
    return cv2.resize(rr.random((celdas, max(2, celdas * w // h))).astype(np.float32), (w, h),
                      interpolation=cv2.INTER_CUBIC)


nubes = sum(ruido(H, W * 2, c, 500 + c) * w for c, w in ((5, 0.55), (12, 0.3), (34, 0.15)))
nubes = (nubes - nubes.min()) / (nubes.max() - nubes.min())
vineta = (1 - 0.65 * suave(np.hypot((xx - W / 2) / W, (yy - H * 0.45) / H), 0.2, 0.75))[..., None]

gotas = [dict(x=rng.uniform(-200, W + 200), y=rng.uniform(0, H), v=rng.uniform(1700, 2600),
              l=rng.uniform(25, 60), b=rng.uniform(0.08, 0.22)) for _ in range(260)]
brasas = [dict(x=rng.uniform(0, W), y=rng.uniform(0, H), vx=rng.uniform(-20, 20), vy=rng.uniform(-110, -40),
               s=rng.uniform(1.2, 3.0), f=rng.uniform(0, 6.3)) for _ in range(70)]


def rayo(semilla, x0, y0, y1):
    rr = np.random.default_rng(semilla)
    pts, x, y = [], x0, y0
    while y < y1:
        pts.append((x, y))
        y += rr.uniform(30, 70)
        x += rr.normal(0, 35)
    capa = np.zeros((H, W), np.float32)
    cv2.polylines(capa, [np.int32(pts)], False, 1.0, 3, cv2.LINE_AA)
    # una rama
    i = len(pts) // 3
    bx, by = pts[i]
    rama = [(bx, by)]
    for _ in range(6):
        bx += rr.normal(-30, 20); by += rr.uniform(25, 50)
        rama.append((bx, by))
    cv2.polylines(capa, [np.int32(rama)], False, 0.7, 2, cv2.LINE_AA)
    return capa[..., None] * 1.6 + blur(capa, 6)[..., None] * 2.0 + blur(capa, 30)[..., None] * 1.2


RAYO1 = rayo(4, 230, -20, 1150) * np.float32([0.75, 0.9, 1.0])
RAYO2 = rayo(9, 880, -20, 900) * np.float32([0.75, 0.9, 1.0])

# Momentos clave (s)
FLASH1, FLASH2, OJO_T, BOCA0, BOCA1, GOLPE = 1.0, 1.9, 2.6, 3.2, 4.3, 4.75


def fogonazo(t, t0):
    """Rayo: dos o tres parpadeos y caída."""
    d = t - t0
    if d < 0 or d > 0.6:
        return 0.0
    patron = [1.0, 0.2, 0.9, 0.6, 0.15]
    k = int(d * 30)
    base_ = patron[k] if k < len(patron) else 0.0
    return max(base_, np.exp(-d / 0.18) * 0.5)


# --- Textos --------------------------------------------------------------------------
def mascara_texto(txt, fuente, tam, espacio=0):
    f = ImageFont.truetype(str(fuente), tam)
    if espacio:
        anchos = [f.getlength(c) for c in txt]
        w = int(sum(anchos) + espacio * (len(txt) - 1)) + 20
        x0, y0, x1, y1 = f.getbbox(txt)
        im = Image.new("L", (w, y1 + 20), 0)
        d = ImageDraw.Draw(im)
        x = 10
        for c, an in zip(txt, anchos):
            d.text((x, 10), c, font=f, fill=255)
            x += an + espacio
        return a_np(im.crop((0, y0, w, y1 + 20)))
    x0, y0, x1, y1 = f.getbbox(txt)
    im = Image.new("L", (x1 - x0 + 20, y1 - y0 + 20), 0)
    ImageDraw.Draw(im).text((10 - x0, 10 - y0), txt, font=f, fill=255)
    return a_np(im)


ANTON = fuentes / "Anton-Regular.ttf"
BC = fuentes / "BarlowCondensed-Bold.ttf"
T_TRICK = mascara_texto("TRICK", ANTON, 250)
T_OR = mascara_texto("OR", ANTON, 150)
T_TD = mascara_texto("TOUCHDOWN", ANTON, 200)
T_FECHA = mascara_texto("31 · OCTUBRE", BC, 44, espacio=10)
T_TAG = mascara_texto("#WEAREATLANTICS", ANTON, 64)

# ajusta TOUCHDOWN al ancho
if T_TD.shape[1] > 980:
    f = 980 / T_TD.shape[1]
    T_TD = cv2.resize(T_TD, (980, int(T_TD.shape[0] * f)), interpolation=cv2.INTER_AREA)


def pega(img, m, cx, cy, color, alfa=1.0, escala=1.0, glow=None):
    if alfa <= 0:
        return
    if escala != 1.0:
        m = cv2.resize(m, (max(1, int(m.shape[1] * escala)), max(1, int(m.shape[0] * escala))),
                       interpolation=cv2.INTER_LINEAR)
    h, w = m.shape
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    mm = m[ya - y0:yb - y0, xa - x0:xb - x0][..., None] * alfa
    zona = img[ya:yb, xa:xb]
    if glow is not None:
        g = np.zeros((H, W), np.float32)
        g[ya:yb, xa:xb] = mm[..., 0]
        img += blur(g, 18)[..., None] * glow
    zona[:] = zona * (1 - mm) + color * mm


# --- Fotograma -------------------------------------------------------------------------
CX, CY = W / 2, 800


def fotograma(i):
    t = i / FPS
    img = np.empty((H, W, 3), np.float32)
    img[:] = INK

    f1, f2 = fogonazo(t, FLASH1), fogonazo(t, FLASH2)
    fg = fogonazo(t, GOLPE) * 0.8
    # rayos lejanos de vez en cuando al final
    f3 = fogonazo(t, 6.6) * 0.45
    flash = max(f1, f2, fg, f3)

    # nubes que pasan
    off = int(t * 35) % W
    nb = nubes[:, off:off + W]
    img += (nb ** 2.2)[..., None] * np.float32([0.05, 0.12, 0.15]) * (1 + 3 * flash)
    if f1 > 0:
        img += RAYO1 * f1
    if f2 > 0:
        img += RAYO2 * f2
    img += (np.exp(-np.hypot(xx - CX, yy - CY) / 700) * flash * 0.5)[..., None] * np.float32([0.7, 0.85, 1.0])

    # luz sobre la cabeza: oscura hasta el primer rayo, luego tenue y fría
    luz = 0.015 + 0.30 * suave(t, FLASH1, FLASH1 + 0.4) + 0.33 * suave(t, FLASH2, FLASH2 + 0.4)
    luz = luz + 0.35 * flash
    luz += 0.12 * suave(t, GOLPE, GOLPE + 0.2)
    tinte = np.float32([0.85, 0.95, 1.05])

    ojo_i = 0.0
    if t >= OJO_T:
        patron = [1, 0, 0, 1, 1, 0, 1, 1, 1]
        k = int((t - OJO_T) * 30)
        ojo_i = patron[k] if k < len(patron) else 0.9 + 0.1 * np.sin(t * 7)
    apertura = suave(t, BOCA0, BOCA1)
    bk = bocas[int(round(apertura * PASOS))]
    pulso = 0.85 + 0.15 * np.sin(t * 6) + 0.3 * np.exp(-max(t - GOLPE, 0) / 0.3) * (t >= GOLPE)

    cab = base_rgb * luz * tinte
    alfa = base_a
    # la boca tapa la cara (es opaca) y brilla sola
    cb, cbg = bk
    cab = cab * (1 - cb[..., 3:4]) + cb[..., :3] * cb[..., 3:4] * pulso
    cab = cab * (1 - ojo_nucleo[..., 3:4] * ojo_i) + ojo_nucleo[..., :3] * ojo_nucleo[..., 3:4] * ojo_i * 1.3
    suma = (ojo_glow[..., :3] * ojo_glow[..., 3:4] * ojo_i * 1.6
            + cbg[..., :3] * cbg[..., 3:4] * pulso * 1.4)

    # cámara: empuja hacia la cara mientras sonríe, golpe y se aleja
    if t < GOLPE:
        s = 0.95 + 0.06 * suave(t, 0, FLASH2) + 0.20 * suave(t, OJO_T - 0.2, GOLPE - 0.05)
        fx = suave(t, OJO_T - 0.2, GOLPE - 0.05)
    else:
        d = t - GOLPE
        s = 0.90 + 0.10 * np.exp(-d * 9) + 0.02 * d / 4
        fx = 0.0
    sacude = 0.0
    if GOLPE <= t < GOLPE + 0.45:
        sacude = 18 * np.exp(-(t - GOLPE) * 8)
    dx, dy = rng.normal(0, sacude), rng.normal(0, sacude)
    centro_caja = np.float32([BW / 2, BH / 2])
    ancla = centro_caja * (1 - fx) + FOCO * fx
    cy_dest = CY if t < GOLPE else CY - 170 * suave(t, GOLPE, GOLPE + 0.25)
    destino = np.float32([CX, cy_dest]) * (1 - fx) + np.float32([CX, 820]) * fx
    M = np.float32([[s, 0, destino[0] - s * ancla[0] + dx], [0, s, destino[1] - s * ancla[1] + dy]])
    crgb = cv2.warpAffine(cab.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    ca = cv2.warpAffine(alfa, M, (W, H), flags=cv2.INTER_LINEAR)[..., None]
    img = img * (1 - ca) + crgb
    img += cv2.warpAffine(suma.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    # resplandor rojo-naranja que tiñe el entorno cuando sonríe
    amb = apertura * 0.10 * pulso
    if amb > 0:
        img += (np.exp(-np.hypot(xx - CX, yy - 820) / 600) * amb)[..., None] * ASCUA

    # lluvia
    capa = np.zeros((H, W), np.float32)
    for g in gotas:
        y = (g["y"] + g["v"] * t) % (H + 100) - 50
        x = g["x"] - 0.25 * (g["y"] + g["v"] * t) % (H + 100)
        x = x % (W + 400) - 200
        cv2.line(capa, (int(x), int(y)), (int(x - g["l"] * 0.25), int(y - g["l"])),
                 g["b"] * (1 + 2.5 * flash), 1, cv2.LINE_AA)
    img += capa[..., None] * np.float32([0.7, 0.85, 0.9])

    # ascuas cuando ya sonríe
    if apertura > 0.3:
        cb_ = np.zeros((H, W, 3), np.float32)
        for bz in brasas:
            x = (bz["x"] + bz["vx"] * t) % W
            y = (bz["y"] + bz["vy"] * t) % H
            v = (0.5 + 0.5 * np.sin(t * 5 + bz["f"])) * suave(apertura, 0.3, 1.0)
            cv2.circle(cb_, (int(x * 4), int(y * 4)), int(bz["s"] * 4), tuple(float(c) * v for c in ASCUA),
                       -1, cv2.LINE_AA, shift=2)
        img += cb_ + blur(cb_, 4) * 1.4

    img *= vineta
    # textos
    ta = suave(t, GOLPE, GOLPE + 0.12)
    if ta > 0:
        def golpe(t0):
            d = t - t0
            if d < 0:
                return 0.0, 1.0
            e = 1.0 + 0.6 * np.exp(-d * 18)
            return suave(d, 0, 0.08), e
        al, e = golpe(GOLPE)
        wt, wo = T_TRICK.shape[1], T_OR.shape[1]
        x0 = (W - (wt + 10 + wo)) / 2
        pega(img, T_TRICK, x0 + wt / 2, 1360, np.float32([1, 1, 1]), al, e, glow=TEAL * 0.25)
        al, e = golpe(GOLPE + 0.10)
        pega(img, T_OR, x0 + wt + 10 + wo / 2, 1360 + (T_TRICK.shape[0] - T_OR.shape[0]) / 2, GOLD, al, e,
             glow=GOLD * 0.35)
        al, e = golpe(GOLPE + 0.20)
        pega(img, T_TD, W / 2, 1610, TEAL * 1.15, al, e, glow=TEAL * 0.45)
        tg = suave(t, GOLPE + 0.6, GOLPE + 1.0)
        pega(img, T_FECHA, W / 2, 175, GOLD, tg)
        pega(img, T_TAG, W / 2, 1800, np.float32([0.92, 0.95, 0.95]), tg)

    # grano
    img += (rng.standard_normal((H // 2, W // 2), dtype=np.float32) * 0.02).repeat(2, 0).repeat(2, 1)[..., None]
    # entrada desde negro y fundido final
    img *= suave(t, 0, 0.4) * (1 - suave(t, DUR - 0.35, DUR))
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


if a.prueba:
    for t in (0.5, 1.05, 2.3, 2.9, 3.7, 4.25, 4.9, 6.0):
        Image.fromarray(fotograma(int(t * FPS))).save(aqui / f"prueba_{t:.2f}.png")
    print("pruebas ok")
    raise SystemExit

# --- Sonido -------------------------------------------------------------------------
SR = 48000
ts = np.arange(int(DUR * SR)) / SR
ruido_w = rng.standard_normal(ts.size)


def paso_bajo(x, n):
    return np.convolve(x, np.ones(n) / n, "same")


aud = np.zeros_like(ts)
# lluvia de fondo
aud += 0.10 * (ruido_w - paso_bajo(ruido_w, 6)) * (0.6 + 0.4 * suave(ts, 0, 1))
# dron grave que va subiendo
aud += 0.10 * np.sin(2 * np.pi * 41 * ts) * suave(ts, 0, 2) * (1 - 0.5 * suave(ts, GOLPE, GOLPE + 1))


def trueno(t0, fuerza):
    dt = np.clip(ts - t0, 0, None)
    on = ts >= t0
    crack = ruido_w * np.exp(-dt * 30) * on
    rumor = paso_bajo(ruido_w, 400) * 18 * np.exp(-dt * 1.6) * suave(ts, t0, t0 + 0.15) * on
    return fuerza * (0.6 * crack + rumor)


aud += trueno(FLASH1, 0.9) + trueno(FLASH2, 0.7) + trueno(6.6, 0.4)
# ojo que se enciende: zumbido eléctrico
dt = np.clip(ts - OJO_T, 0, None)
zum = (2 * ((ts * 110) % 1) - 1) * np.exp(-dt * 2.5) * (ts >= OJO_T)
aud += 0.12 * zum
# la sonrisa: crujido que sube de tono
ab = suave(ts, BOCA0, BOCA1) * (ts < GOLPE)
fc = 70 + 140 * suave(ts, BOCA0, BOCA1)
aud += 0.12 * np.sin(2 * np.pi * np.cumsum(fc) / SR) * ab * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 18 * ts)))
crk = (rng.random(ts.size) < 0.003) * rng.standard_normal(ts.size)
aud += 0.4 * np.convolve(crk, np.exp(-np.arange(200) / 30), "same") * ab
# golpe
dt = np.clip(ts - GOLPE, 0, None)
f0 = 38 + 90 * np.exp(-dt * 12)
aud += (0.95 * np.sin(2 * np.pi * np.cumsum(f0) / SR) * np.exp(-dt * 2.2)
        + 0.4 * ruido_w * np.exp(-dt * 22)) * (ts >= GOLPE)
aud = np.tanh(aud * 1.3) * 0.85
aud *= suave(ts, 0, 0.2) * (1 - suave(ts, DUR - 0.4, DUR))

tmp = aqui / "_audio.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((aud * 32767).astype(np.int16).tobytes())

out = aqui / a.salida
proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                         "-r", str(FPS), "-i", "-", "-i", str(tmp), "-c:v", "libx264", "-crf", "17",
                         "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                         "-shortest", "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)
for i in range(N):
    proc.stdin.write(fotograma(i).tobytes())
proc.stdin.close()
proc.wait()
tmp.unlink()
print("ok", out)
