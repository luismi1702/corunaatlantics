"""Aplica el color de la marca (LUT Atlantics) a un vídeo y lo deja listo para Reels.

Uso:
    python estilo_atlantics.py brutos/IMG_1298.MOV
    python estilo_atlantics.py brutos/IMG_1298.MOV --intensidad 0.6     (más suave)
    python estilo_atlantics.py brutos/clip.mp4 --vertical              (horizontal -> 9:16 con fondo borroso)

Sale en output/<nombre>_atlantics.mp4 (1080x1920, H.264 + AAC).
El LUT está en assets/lut/atlantics.cube: también se puede importar en CapCut
de ordenador (Ajustar > LUT) o en DaVinci Resolve para usarlo a mano.
"""
import argparse
import pathlib
import subprocess

aqui = pathlib.Path(__file__).resolve().parent
lut = (aqui / "assets" / "lut" / "atlantics.cube").as_posix().replace(":", r"\:")

p = argparse.ArgumentParser()
p.add_argument("video")
p.add_argument("--intensidad", type=float, default=1.0, help="0 = original, 1 = estilo completo")
p.add_argument("--vertical", action="store_true", help="pasa un vídeo horizontal a 9:16 con fondo borroso")
a = p.parse_args()

src = pathlib.Path(a.video)
out = aqui / "output" / f"{src.stem}_atlantics.mp4"
out.parent.mkdir(exist_ok=True)

color = f"format=rgb48le,split[o][g];[g]lut3d='{lut}'[l];[o][l]blend=all_expr='A*(1-{a.intensidad})+B*{a.intensidad}',noise=alls=5:allf=t,vignette=PI/6,format=yuv420p"
if a.vertical:
    vf = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24[bg];"
          f"[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{color}")
else:
    vf = f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{color}"

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-filter_complex", vf,
                "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", str(out)], check=True)
print("ok", out.relative_to(aqui))
