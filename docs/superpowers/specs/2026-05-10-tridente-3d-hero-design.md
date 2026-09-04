# Diseño: Tridente 3D — Hero Background

**Fecha:** 2026-05-10  
**Alcance:** Solo el hero de `index.html` — el resto de la página no se toca.

---

## Objetivo

Reemplazar el fondo de vídeo (storm.mp4 / waves.mp4) del hero con un tridente 3D sólido girando lentamente, construido con Three.js. El tridente actúa como elemento de fondo decorativo — el texto, logo y botones del hero quedan encima y deben seguir siendo perfectamente legibles.

---

## Geometría del tridente

Construido íntegramente con primitivas de Three.js (sin modelos externos):

- **Mango:** `CylinderGeometry` — largo, fino, centrado verticalmente
- **Barra transversal:** `CylinderGeometry` horizontal — conecta la base de las tres púas
- **Púa central:** `CylinderGeometry` (cuerpo) + `ConeGeometry` (punta) — más alta que las laterales
- **Púas laterales:** dos `CylinderGeometry` + `ConeGeometry` — simétricas, ligeramente más cortas, inclinadas ~15° hacia afuera
- Todo el grupo se agrupa en un `THREE.Group` para rotar como una sola pieza

---

## Materiales y luces

| Elemento | Tipo | Color | Notas |
|---|---|---|---|
| Cuerpo del tridente | `MeshStandardMaterial` | `#4ECDC8` (teal) | `emissive: #1a6b68`, `roughness: 0.3`, `metalness: 0.6` |
| Luz principal | `PointLight` | `#D4A843` (gold) | Intensidad alta, orbita lentamente en el eje Y |
| Luz de relleno | `PointLight` | `#4ECDC8` (teal) | Intensidad baja, fija debajo del tridente |
| Luz ambiental | `AmbientLight` | blanco | Intensidad baja (0.2) para no perder las sombras |
| Fondo canvas | — | `#040d12` | Color ink, sin vídeo |

---

## Animación

- **Rotación Y:** constante, ~0.003 rad/frame (una vuelta completa cada ~35 segundos)
- **Flotación:** oscilación sinusoidal en Y, amplitud ±0.15 unidades, período ~7 segundos
- **Órbita de luz dorada:** la `PointLight` dorada orbita en círculo alrededor del tridente en el plano XZ, misma velocidad que la rotación

---

## Composición en pantalla

- Canvas Three.js: `position: fixed; inset: 0; z-index: 0` — fondo de toda la página en el hero
- El tridente se escala para ocupar aproximadamente el 55-65% de la altura del viewport
- Centrado en pantalla
- El overlay oscuro existente (`rgba(4,13,18,0.75)`) se mantiene encima del canvas para garantizar legibilidad del texto
- El resto del contenido del hero (título, botones, mascota) permanece por encima con `z-index: 1`

---

## Implementación técnica

- Three.js cargado desde CDN con `importmap` en el `<head>`: `https://unpkg.com/three@0.163.0/build/three.module.js`
- El bloque `<div class="ocean-bg">` se reemplaza por `<canvas id="trident-canvas">`
- El script de Three.js se añade como `<script type="module">` al final del body
- Los scripts existentes (header scroll, hamburger, form, weather effects) no se modifican
- El canvas se redimensiona con `ResizeObserver` para ser responsive

---

## Criterio de éxito

- El tridente gira suave sin stuttering a 60fps en un portátil normal
- El texto del hero es perfectamente legible encima del tridente
- En móvil (< 600px) el tridente escala correctamente y no causa scroll horizontal
- No rompe ninguna sección existente fuera del hero
