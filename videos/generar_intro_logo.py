"""Intro de logo para Reels: Poseidón en neón -> logo completo con rayos -> #WEAREATLANTICS cargando.

Inspirado en el intro de los Salamanca Falcons (oct. 2026). Todo generado aquí, sin plantillas
ni servicios de pago: numpy + OpenCV para la imagen y ffmpeg para codificar.

    python generar_intro_logo.py                 # sale en output/intro-logo_reel.mp4
    python generar_intro_logo.py --texto "#WEAREATLANTICS" --salida output/otro.mp4

El sonido son efectos sintetizados (zumbido, golpe y subida). La música se pone en Instagram.
"""
import argparse
import pathlib
import subprocess
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

aqui = pathlib.Path(__file__).resolve().parent
raiz = aqui.parent

p = argparse.ArgumentParser()
p.add_argument("--texto", default="#WEAREATLANTICS")
p.add_argument("--salida", default="output/intro-logo_reel.mp4")
p.add_argument("--fps", type=int, default=30)
a = p.parse_args()

W, H, FPS, DUR = 1080, 1920, a.fps, 5.5
N = int(DUR * FPS)
rng = np.random.default_rng(7)

TEAL = np.array([0.306, 0.804, 0.769], np.float32)   # #4ECDC4
GOLD = np.array([0.831, 0.659, 0.263], np.float32)   # #D4A843
INK = np.array([0.016, 0.051, 0.071], np.float32)    # #040d12


def suave(x, a0, a1):
    x = np.clip((x - a0) / (a1 - a0), 0, 1)
    return x * x * (3 - 2 * x)


def blur(img, s):
    out = cv2.GaussianBlur(np.ascontiguousarray(img, np.float32), (0, 0), s)
    return out.reshape(img.shape)   # OpenCV se come el canal único


# --- El logo y sus capas (en una caja con margen para el brillo) -----------------------
LOGO_W, PAD = 900, 90
im = Image.open(raiz / "avatar sin fondo v2.png").convert("RGBA")
im = im.resize((LOGO_W, round(im.height * LOGO_W / im.width)), Image.LANCZOS)
logo = np.asarray(im, np.float32) / 255
logo = np.pad(logo, ((PAD, PAD), (PAD, PAD), (0, 0)))
BH, BW = logo.shape[:2]
alfa = logo[..., 3:4]
rgb = logo[..., :3] * alfa                         # premultiplicado

lum = (rgb * np.float32([0.3, 0.59, 0.11])).sum(-1).astype(np.float32)
gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)
gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)
ga = cv2.Sobel(alfa[..., 0], cv2.CV_32F, 1, 0, ksize=3) ** 2 + cv2.Sobel(alfa[..., 0], cv2.CV_32F, 0, 1, ksize=3) ** 2
mag = np.maximum(np.sqrt(gx * gx + gy * gy), np.sqrt(ga) * 0.6)
borde = np.clip((mag - 0.12) / 0.35, 0, 1)
borde = np.clip(blur(borde, 0.8) * 1.4, 0, 1)

# El tridente y la corona brillan en oro, lo demás en teal.
r, g, b = (logo[..., i] for i in range(3))
oro = ((r > 0.5) & (g > 0.35) & (b < 0.4) & (r > b + 0.25) & (logo[..., 3] > 0.5)).astype(np.float32)
oro = np.clip(blur(oro, 7) * 4.0, 0, 1)[..., None]
color = GOLD * oro + TEAL * (1 - oro)

e = borde[..., None]
neon = (blur(e, 1.0) * (0.7 * color + 0.3) * 1.3
        + blur(e, 5) * color * 1.6
        + blur(e, 18) * color * 1.4)

# Halo exterior que se queda tras rellenarse el logo.
fuera = (logo[..., 3] < 0.5).astype(np.uint8)
dist = cv2.distanceTransform(fuera, cv2.DIST_L2, 5)
banda = (np.exp(-dist / 14) * (dist > 0)).astype(np.float32)
halo = blur(banda, 6)[..., None] * TEAL * 0.9


def ruido(h, w, celdas, semilla):
    rr = np.random.default_rng(semilla)
    return cv2.resize(rr.random((celdas, max(2, celdas * w // h))).astype(np.float32), (w, h),
                      interpolation=cv2.INTER_CUBIC)


# Chispazos eléctricos: crestas finas de ruido pegadas al contorno.
chispas = []
for k in range(12):
    n = 0.65 * ruido(BH, BW, 22, 100 + k) + 0.35 * ruido(BH, BW, 60, 200 + k)
    fil = (1 - np.abs(2 * n - 1)) ** 26
    c = fil * np.exp(-dist / 22) * (dist > 0)
    c = c[..., None] * (0.5 * TEAL + 0.5)
    chispas.append(c * 2.2 + blur(c, 4) * TEAL * 2.5)

# --- Fondo: humo, rayos, brasas -----------------------------------------------------
CX, CY = W / 2, 830
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
theta = np.arctan2(yy - CY, xx - CX)
radio = np.hypot(xx - CX, yy - CY)

humo_big = sum(ruido(H * 2, W, c, 300 + c) * w for c, w in ((6, 0.55), (14, 0.3), (40, 0.15)))
humo_big = (humo_big - humo_big.min()) / (humo_big.max() - humo_big.min())

vineta = (1 - 0.55 * suave(np.hypot((xx - W / 2) / W, (yy - H / 2) / H), 0.25, 0.75))[..., None]

brasas = [dict(x=rng.uniform(0, W), y=rng.uniform(0, H), vx=rng.uniform(-15, 15), vy=rng.uniform(-90, -25),
               s=rng.uniform(1.2, 3.2), c=GOLD if rng.random() < 0.3 else TEAL, f=rng.uniform(0, 6.3))
          for _ in range(90)]

# --- Texto y barra -------------------------------------------------------------------
fuente = aqui / "assets" / "fuentes" / "Anton-Regular.ttf"
TXT_W = 940
tam = 200
while True:
    f = ImageFont.truetype(str(fuente), tam)
    x0, y0, x1, y1 = f.getbbox(a.texto)
    if x1 - x0 <= TXT_W:
        break
    tam -= 2
tw, th = x1 - x0, y1 - y0
capa = Image.new("L", (tw + 40, th + 40), 0)
ImageDraw.Draw(capa).text((20 - x0, 20 - y0), a.texto, font=f, fill=255)
txt_mask = np.asarray(capa, np.float32) / 255
TX, TY = int((W - capa.width) / 2), 1335
BAR_X0, BAR_X1, BAR_Y, BAR_H = TX + 20, TX + 20 + tw, 1300, 12

# Secuencia de encendido del neón (como un tubo que arranca).
arranque = [0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1]


def fotograma(i):
    t = i / FPS
    img = np.empty((H, W, 3), np.float32)
    img[:] = INK

    # humo que sube despacio
    off = int((t * 40) % H)
    humo = humo_big[H - off:2 * H - off] if off else humo_big[H:2 * H]
    img += (humo ** 2)[..., None] * np.array([0.03, 0.10, 0.12], np.float32) * (0.7 + 0.3 * suave(t, 1.2, 1.6))

    # rayos de luz detrás del logo
    ray_a = suave(t, 1.28, 1.40) * (1 - 0.6 * suave(t, 1.45, 2.4))
    if ray_a > 0:
        th_ = theta + t * 0.06
        rays = 0.5 * np.cos(23 * th_) + 0.3 * np.cos(37 * th_ + 1.3) + 0.2 * np.cos(61 * th_ + 0.4)
        rays = np.clip((rays + 0.15) * 1.6, 0, 1) ** 2
        luz = rays * np.exp(-radio / 520) * 0.9 + np.exp(-radio / 230) * 0.8
        img += (luz * ray_a)[..., None] * (0.55 + 0.45 * TEAL)

    # fogonazo al rellenarse
    fl = np.exp(-max(t - 1.33, 0) / 0.10) * suave(t, 1.22, 1.33)
    if fl > 0.01:
        img += (np.exp(-radio / 420) * fl * 1.6)[..., None]

    # capas del logo
    if t < 0.15:
        ao = 0.0
    elif t < 0.15 + len(arranque) / 40:
        ao = arranque[int((t - 0.15) * 40)]
    else:
        ao = 0.93 + 0.07 * rng.random()
    ao *= 1 - suave(t, 1.30, 1.75)
    af = suave(t, 1.24, 1.40)
    ac = ao * (0.6 + 0.4 * rng.random())
    if t > 1.5 and rng.random() < 0.12:
        ac = 0.35
    ah = suave(t, 1.3, 1.6) * (0.55 + 0.1 * np.sin(t * 9))

    suma = neon * ao + chispas[(i // 2) % len(chispas)] * ac + halo * ah
    sobre_rgb, sobre_a = rgb * af, alfa * af

    # escala: el neón se aleja despacio, el logo entra con un golpe y luego empuje lento
    if t < 1.3:
        s = 1.10 - 0.04 * t / 1.3
    else:
        s = 1.0 + 0.07 * np.exp(-(t - 1.3) * 7) + 0.02 * (t - 1.3) / 4
    M = np.float32([[s, 0, CX - s * BW / 2], [0, s, CY - s * BH / 2]])
    capa_suma = cv2.warpAffine(suma.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    if af > 0:
        crgb = cv2.warpAffine(sobre_rgb, M, (W, H), flags=cv2.INTER_LINEAR)
        ca = cv2.warpAffine(sobre_a, M, (W, H), flags=cv2.INTER_LINEAR)[..., None]
        img = img * (1 - ca) + crgb
    img += capa_suma

    # brasas
    capa_b = np.zeros((H, W, 3), np.float32)
    for bz in brasas:
        x = (bz["x"] + bz["vx"] * t) % W
        y = (bz["y"] + bz["vy"] * t) % H
        v = 0.5 + 0.5 * np.sin(t * 5 + bz["f"])
        cv2.circle(capa_b, (int(x * 4), int(y * 4)), int(bz["s"] * 4), tuple(float(c) * v for c in bz["c"]),
                   -1, cv2.LINE_AA, shift=2)
    img += capa_b * 1.2 + blur(capa_b, 4) * 1.5

    # barra de carga y texto
    ta = suave(t, 1.85, 2.3)
    if ta > 0:
        prog = suave(t, 2.15, 4.3)
        dy = int((1 - ta) * 40)
        y0b = BAR_Y + dy
        # marco de la barra
        cv2.rectangle(img, (BAR_X0, y0b), (BAR_X1, y0b + BAR_H), tuple(float(c) * ta * 0.5 for c in (0.55, 0.62, 0.65)),
                      2, cv2.LINE_AA)
        xf = int(BAR_X0 + 3 + (BAR_X1 - BAR_X0 - 6) * prog)
        if xf > BAR_X0 + 3:
            relleno = np.zeros((H, W, 3), np.float32)
            relleno[y0b + 3:y0b + BAR_H - 2, BAR_X0 + 3:xf] = TEAL
            relleno[y0b + 3:y0b + BAR_H - 2, max(BAR_X0 + 3, xf - 10):xf] = GOLD
            img += relleno * ta + blur(relleno, 8) * 1.6 * ta

        # texto: gris apagado que se va iluminando con la barra
        m = txt_mask * ta
        hh, ww = m.shape
        ty = TY + dy
        zona = img[ty:ty + hh, TX:TX + ww]
        corte = BAR_X0 + (BAR_X1 - BAR_X0) * prog - TX
        lit = (np.arange(ww)[None, :] < corte).astype(np.float32)
        lit = blur(lit, 3) * np.ones((hh, 1), np.float32)
        gris = np.array([0.30, 0.36, 0.39], np.float32)
        col = gris * (1 - lit[..., None]) + np.array([1, 1, 1], np.float32) * lit[..., None]
        zona[:] = zona * (1 - m[..., None]) + col * m[..., None]
        pulso = suave(t, 4.25, 4.45) * (1 - 0.7 * suave(t, 4.5, 5.2))
        brillo = blur(m * lit, 10)[..., None] * TEAL * (0.35 + 1.2 * pulso)
        zona += brillo

    img *= vineta
    img += (rng.standard_normal((H // 2, W // 2), dtype=np.float32) * 0.018).repeat(2, 0).repeat(2, 1)[..., None]
    return (np.clip(img, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)


# --- Sonido -------------------------------------------------------------------------
SR = 48000
ts = np.arange(int(DUR * SR)) / SR
aud = np.zeros_like(ts)
# zumbido del neón que arranca
gate = np.zeros_like(ts)
for k, v in enumerate(arranque):
    gate[(ts >= 0.15 + k / 40) & (ts < 0.15 + (k + 1) / 40)] = v
gate[(ts >= 0.15 + len(arranque) / 40) & (ts < 1.3)] = 1
gate = np.convolve(gate, np.ones(200) / 200, "same")
saw = 2 * ((ts * 100) % 1) - 1
aud += 0.10 * saw * gate
crk = (rng.random(ts.size) < 0.004) * rng.standard_normal(ts.size)
aud += 0.35 * np.convolve(crk, np.exp(-np.arange(300) / 40), "same") * gate
# subida antes del golpe
ruido_w = rng.standard_normal(ts.size)
sub = suave(ts, 0.5, 1.32) * (ts < 1.33)
aud += 0.18 * np.convolve(ruido_w, np.ones(12) / 12, "same") * sub ** 2
# golpe
dt = np.clip(ts - 1.33, 0, None)
f0 = 40 + 80 * np.exp(-dt * 12)
golpe = np.sin(2 * np.pi * np.cumsum(f0) / SR) * np.exp(-dt * 2.6) * (ts >= 1.33)
aud += 0.9 * golpe + 0.4 * ruido_w * np.exp(-dt * 25) * (ts >= 1.33)
# carga: tono que sube y remate
car = suave(ts, 2.15, 2.4) * (1 - suave(ts, 4.25, 4.35))
fc = 180 + 260 * suave(ts, 2.15, 4.3)
aud += 0.05 * np.sin(2 * np.pi * np.cumsum(fc) / SR) * car
dt2 = np.clip(ts - 4.3, 0, None)
aud += (0.5 * np.sin(2 * np.pi * 55 * ts) * np.exp(-dt2 * 3) + 0.12 * np.sin(2 * np.pi * 880 * ts) * np.exp(-dt2 * 5)) * (ts >= 4.3)
aud = np.tanh(aud * 1.2) * 0.8
aud *= 1 - suave(ts, DUR - 0.3, DUR)

tmp = aqui / "output" / "_intro_audio.wav"
tmp.parent.mkdir(exist_ok=True)
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((aud * 32767).astype(np.int16).tobytes())

# --- Codificar ----------------------------------------------------------------------
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
print("ok", out.relative_to(aqui))
