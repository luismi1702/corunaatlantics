# Vídeos — Coruña Atlantics

Carpeta de producción de vídeo para Instagram (Reels) y TikTok.

## Estructura

- `brutos/` — material en bruto: grabaciones de entrenos, partidos, móvil, etc.
- `assets/` — recursos reutilizables: logos sin fondo, música, overlays, cierres de vídeo.
- `output/` — vídeos finales exportados, listos para subir.

Convención de nombres en `output/`: `YYYY-MM-DD_tema_plataforma.mp4`
(ej. `2026-07-20_convocatoria-tryouts_reel.mp4`)

## Especificaciones por plataforma

| Plataforma | Formato | Resolución | Duración ideal | Notas |
|---|---|---|---|---|
| Instagram Reels | 9:16 MP4 (H.264 + AAC) | 1080×1920 | 15–60 s (máx 90 s) | Portada 1080×1920 |
| TikTok | 9:16 MP4 (H.264 + AAC) | 1080×1920 | 15–60 s | Deja libre el borde derecho (iconos) e inferior (caption) |
| Stories | 9:16 MP4 | 1080×1920 | ≤ 15 s por story | — |
| Feed IG (cuadrado) | 1:1 MP4 | 1080×1080 | ≤ 60 s | Para publicaciones normales |

**Zonas seguras 9:16:** deja ~250 px libres arriba y ~420 px abajo para que la UI de TikTok/IG no tape texto o logos.

## Identidad visual (rebranding mayo 2026)

- Colores: Teal `#4ECDC4` · Gold `#D4A843` · Ink `#040d12`
- Tipografía: Anton (titulares) · Barlow Condensed (UI) · Barlow (cuerpo)
- Hashtag: **#WeAreAtlantics** · Mascota: Poseidón
- Logos: usar SIEMPRE las versiones "sin fondo" (están en la raíz del proyecto)

## Recetas rápidas (ffmpeg)

```powershell
# Convertir un vídeo horizontal a 9:16 con fondo borroso
ffmpeg -i brutos\clip.mp4 -filter_complex "[0:v]scale=1080:1920,boxblur=20[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy output\clip_916.mp4

# Recortar de 0:05 a 0:35
ffmpeg -ss 5 -to 35 -i brutos\clip.mp4 -c copy output\corte.mp4

# Poner el logo (sin fondo) en una esquina
ffmpeg -i brutos\clip.mp4 -i "..\circular sin fondo.png" -filter_complex "[1:v]scale=200:-1[logo];[0:v][logo]overlay=W-w-40:60" output\con_logo.mp4
```
