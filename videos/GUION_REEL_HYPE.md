# Reel HYPE — Entrenamiento Coruña Atlantics

Formato: 9:16 · 1080×1920 · 30 fps · **24 segundos**
Objetivo: que alguien que no conoce el equipo quiera venir a probar.

---

## 1. Cómo pasar los vídeos del móvil (sin perder calidad)

**No uses WhatsApp ni Telegram normal** — recomprimen a 720p y te cargan el material.

| Método | Cómo | Calidad |
|---|---|---|
| **Cable USB** (mejor) | Conecta el móvil → "Transferir archivos" → copia de `DCIM/Camera` | Original |
| Google Drive / Fotos | Sube **como archivo**, no "optimizar espacio" → descarga en PC | Original |
| Telegram | Enviar **como archivo**, no como vídeo | Original |
| AirDrop (iPhone→Mac) | Directo | Original |

Déjalos todos en: `videos/brutos/`
Cuando estén ahí, dímelo y los analizo uno a uno para elegir los mejores momentos.

---

## 2. Estructura del montaje (timeline)

| # | Tiempo | Duración | Qué va | Texto en pantalla |
|---|---|---|---|---|
| 1 | 0:00–0:01.2 | 1.2s | **HOOK**: el plano más bestia que tengas (placaje, golpe de casco, sprint a cámara) | — |
| 2 | 0:01.2–0:01.4 | 0.2s | Flash teal + tridente (transición) | — |
| 3 | 0:01.4–0:02.8 | 1.4s | Plano general del equipo entrenando | `ESTO NO ES UN DEPORTE` |
| 4 | 0:02.8–0:04.2 | 1.4s | Drill de contacto / sled | — |
| 5 | 0:04.2–0:05.6 | 1.4s | Detalle: manos, casco, guantes, barro | `ES UNA FAMILIA` |
| 6 | 0:05.6–0:07.0 | 1.4s | Pase largo / recepción | — |
| 7 | 0:07.0–0:08.4 | 1.4s | Carrera con balón, cámara baja | — |
| 8 | 0:08.4–0:10.0 | 1.6s | Placaje o bloqueo fuerte | `CADA MARTES Y JUEVES` |
| 9 | 0:10.0–0:11.4 | 1.4s | Grupo gritando / piña del equipo | — |
| 10 | 0:11.4–0:13.0 | 1.6s | Esfuerzo: alguien reventado pero sonriendo | — |
| 11 | 0:13.0–0:15.0 | 2.0s | Jugada completa a **cámara lenta 0.4x** | — |
| 12 | 0:15.0–0:17.0 | 2.0s | Cara a cámara / celebración | `SIN EXPERIENCIA PREVIA` |
| 13 | 0:17.0–0:19.0 | 2.0s | Plano final épico (atardecer, equipo de espaldas) | `TE ESPERAMOS` |
| 14 | 0:19.0–0:21.0 | 2.0s | Último clip corto + congelado 0.3s al final | — |
| 15 | 0:21.0–0:24.0 | 3.0s | **`assets/endcard_3s.mp4`** (ya generado) | ya lleva logo + #WeAreAtlantics |

> Si te faltan clips, quita las escenas 7, 10 y 14 y te queda un reel de 18s igual de potente.
> **Menos clips buenos > más clips regulares.** Nunca metas un plano movido o desenfocado.

---

## 3. Cómo montarlo en CapCut (paso a paso)

### Preparar el proyecto
1. CapCut → **Nuevo proyecto** → arriba a la derecha, relación de aspecto **9:16**.
2. Importa TODO desde `videos/brutos/` y también `videos/assets/endcard_3s.mp4`.

### Instalar las fuentes de marca (hazlo una vez)
En `videos/assets/fuentes/` tienes **Anton** y **Barlow Condensed**.
Selecciona los 3 `.ttf` → clic derecho → **Instalar para todos los usuarios** → reinicia CapCut.
Aparecerán en la lista de fuentes de texto.

### Elegir la música PRIMERO (esto es lo importante)
1. Pestaña **Audio** → busca en la biblioteca de CapCut (gratis y sin copyright para IG).
   Busca: `sport trap`, `epic drums`, `hype workout`, `phonk`.
   Elige una que tenga un **drop claro entre el segundo 3 y el 6**.
2. Arrastra la música a la timeline.
3. Selecciona el audio → **Beat** (o "Ritmo") → **Detectar automáticamente**.
   Aparecen puntos amarillos en la pista: **cada corte de vídeo va sobre un punto amarillo.** Esto es el 90% de que un reel se sienta "profesional".

### Cortar al ritmo
4. Arrastra el clip 1 (el hook). Ponlo justo antes del primer beat fuerte.
5. Para cada clip: sitúa el cursor en el punto amarillo → tecla **Ctrl+B** para cortar → borra lo que sobra.
6. **Silencia el audio original de los clips** (icono de volumen a 0), salvo 1 o 2 donde el sonido ambiente (golpe, grito) sume — ahí déjalo al 30%.

### Efectos (con moderación)
7. Transiciones: entre clips usa solo **corte seco**. Un `Flash` o `Zoom rápido` únicamente en el segundo 1.2 y en el drop de la música. Nada más.
8. Cámara lenta (escena 11): selecciona el clip → **Velocidad → Normal → 0.4x** → activa **Suavizado de movimiento / Optical flow**.
9. Efecto global (opcional): **Efectos → Vídeo → "Shake" o "Zoom rápido"** solo en el drop.
10. Ajuste de color: **Ajustar** → Contraste `+15`, Saturación `+10`, Nitidez `+20`, Viñeta `+15`. Discreto — que parezca real, no un filtro.

### Textos
11. Fuente **Anton**, MAYÚSCULAS, color blanco con sombra, o teal `#4ECDC4`.
12. Tamaño grande (que ocupe ~70% del ancho), centrado, y **dentro de la zona segura**: nada por encima de 250 px ni por debajo de 1500 px.
13. Animación de entrada: **"Subir"** o **"Máquina de escribir"**, duración 0.3s. Cada texto en pantalla máximo 1.5s.

### Logo en esquina
14. Arrastra `assets/logos/logo_circular.png` a una pista superior, esquina superior izquierda, tamaño ~15%, opacidad 70%. Que dure todo el reel salvo el endcard.

### Exportar
15. **Exportar** → Resolución `1080p` · Frame rate `30` · Calidad **Alta** · Codificación `H.264`.
16. **Desactiva** la marca de agua de CapCut (quita el clip final que añade solo).
17. Guarda en `videos/output/` con este nombre:
    `2026-08-27_entreno-hype_reel.mp4`

---

## 4. Copy para Instagram

**Caption:**
```
Martes. 21:00. No hace falta que sepas jugar. Solo que quieras.

Fútbol americano en A Coruña — puerta abierta a quien quiera probar.
Escríbenos por DM y te decimos dónde y cuándo.

#WeAreAtlantics
```

**Hashtags (primer comentario, no en el caption):**
```
#CoruñaAtlantics #FutbolAmericano #AmericanFootball #ACoruña #Galicia
#Coruña #DeporteGalicia #FootballEspaña #LNFA #Poseidon #Tryouts
```

**Portada del Reel:** usa el frame de la escena 13 (el plano épico), o directamente `assets/endcard_1080x1920.png`.

**Cuándo publicar:** martes o jueves entre 20:00 y 22:00 (justo cuando la gente que entrena está mirando el móvil).

---

## 5. Assets ya listos en `videos/assets/`

- `endcard_3s.mp4` — cierre animado 3s, listo para arrastrar
- `endcard_1080x1920.png` — versión estática (sirve de portada)
- `logos/` — logos recortados y sin fondo: principal, circular, tridente, mascota, cabeza, balón
- `fuentes/` — Anton + Barlow Condensed + Barlow (instalar en Windows)

---

## 6. Editar en el MÓVIL (ruta recomendada)

Los clips ya están en el móvil, así que editar ahí te ahorra la transferencia. Lo único que necesitas llevar al teléfono es el pack de marca.

### Pasar el pack al móvil (una sola vez)
Sube esta carpeta a Google Drive o Fotos y descárgala en el teléfono:

- `assets/endcard_3s.mp4` → guárdalo **en la galería** (así CapCut lo ve como un vídeo más)
- `assets/textos/*.png` → guárdalos **en la galería**
- `assets/logos/logo_circular.png` → a la galería

> Por Telegram, envíatelos a "Mensajes guardados" **como archivo**, no como foto/vídeo.

### Diferencias respecto al PC
| | Móvil |
|---|---|
| Fuentes propias | No se pueden instalar → **usa los PNG de `textos/`**, ya llevan Anton |
| Detección de beats | Sí, igual que en PC: Audio → **Ritmo** → automático |
| Cortar | Cursor sobre el punto amarillo → botón **Dividir** |
| Cámara lenta | Velocidad → Normal → `0.4x` → activa **Suavizar** |
| Exportar | 1080p · 30 fps · calidad Alta |

### Cómo meter los textos en móvil
No uses la herramienta de Texto. En su lugar:
**Superponer → Añadir superposición → elige el PNG de `textos/`** → colócalo en el centro, escálalo y dale animación de entrada *Subir* (0.3s).
Fondo transparente, tipografía correcta, cero trabajo de fuentes.

### Sacar el resultado del móvil
Cuando exportes, súbelo a Drive y déjalo también en `videos/output/` del PC con el nombre `2026-08-27_entreno-hype_reel.mp4`, para tener el archivo del club.

---

## 7. Assets de texto listos (`assets/textos/`)

| Archivo | Texto | Va en la escena |
|---|---|---|
| `01_esto-no-es-un-deporte.png` | ESTO NO ES UN DEPORTE | 3 |
| `02_es-una-familia.png` | ES UNA FAMILIA (teal) | 5 |
| `03_martes-y-jueves.png` | CADA MARTES Y JUEVES | 8 |
| `04_sin-experiencia.png` | SIN EXPERIENCIA PREVIA | 12 |
| `05_te-esperamos.png` | TE ESPERAMOS (teal) | 13 |

Todos 1080 px de ancho, fondo transparente, Anton con sombra para que se lean sobre cualquier plano.
