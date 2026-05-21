---
name: Coruña Atlantics
description: El equipo de football americano de A Coruña. Refundación 2026.
colors:
  ink: "#040d12"
  deep: "#071520"
  surf: "#0d2030"
  plasma-teal: "#4ECDC8"
  teal-dim: "#3aafab"
  trident-gold: "#D4A843"
  gold-lit: "#F0C060"
  text-primary: "#EEF4F6"
typography:
  display:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(4rem, 9vw, 8.5rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.22em"
rounded:
  xs: "2px"
  sm: "3px"
  md: "6px"
  lg: "10px"
spacing:
  sm: "0.8rem"
  md: "1.6rem"
  lg: "2rem"
  xl: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.plasma-teal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.8rem"
  button-primary-hover:
    backgroundColor: "{colors.teal-dim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.8rem"
  button-gold:
    backgroundColor: "{colors.trident-gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.8rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.8rem"
  input-field:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1rem"
---

# Design System: Coruña Atlantics

## 1. Overview

**Creative North Star: "El Nuevo Orden Atlántico"**

La oscuridad no es un mood: es el océano de noche. El sistema visual parte de fondos profundos de tinta marina y construye hacia arriba en capas de azul-negro, con teal de plasma y dorado de tridente como los únicos colores que perforan esa oscuridad. No hay decoración. Hay convicción.

Este sistema rechaza explícitamente la estética de equipos amateurs españoles: las webs de WordPress con colores eléctricos sin sistema, tipografía genérica y fotos de móvil. Este no es un equipo que "también tiene web"; es un equipo cuya web demuestra que van en serio. La producción visual es el argumento.

La sensación objetivo es la de un cartel de estadio visto a 20 metros: legible, poderoso, inequívoco. Sin ironía. Sin ternura. Con el peso específico de algo que se construyó para durar. Sin nostalgia, solo hacia adelante.

**Key Characteristics:**
- Fondos profundos de tinta con capas tonales hacia el surf
- Teal y dorado como los únicos colores que toman voz activa, nunca a la vez
- Anton para titulares que ocupan espacio con autoridad
- Barlow Condensed para UI que informa sin decorar
- Componentes sólidos con radio suave: forjados, no plásticos
- Sombras solo en estado activo: profundidad ganada, no regalada

## 2. Colors: La Paleta del Nuevo Orden

Tres familias: la oscuridad atlántica (neutrales), el plasma marino (primario), el tridente dorado (secundario). No hay cuarto color.

### Primary
- **Plasma Marino** (#4ECDC8): El color activo del sistema. Aparece en CTAs, focus rings, acentos de sección, bordes activos y el tridente 3D. Bioluminiscente: brilla contra la oscuridad sin esfuerzo. No se combina con el dorado en el mismo componente.
- **Plasma Marino Atenuado** (#3aafab): Exclusivo para estados hover del primario. Mismo hue, menos energía.

### Secondary
- **Tridente Dorado** (#D4A843): La segunda voz. Aparece en sec-labels, CTA del formulario y taglines del equipo. Establece el carácter de las secciones donde el teal descansa.
- **Dorado Encendido** (#F0C060): Hover del dorado. Solo en estado activo, nunca en reposo.

### Neutral
- **Tinta Profunda** (#040d12): El fondo base. El océano de noche. Todo empieza aquí.
- **Abismo** (#071520): Segunda capa tonal. Secciones internas, fondo de inputs, opciones de select.
- **Superficie Marina** (#0d2030): Tercera capa. Cards de jugadores, backgrounds de cards.
- **Texto Primario** (#EEF4F6): Blanco tintado de azul marino. Nunca blanco puro.

### Named Rules
**La Regla del Tridente.** Teal y dorado no aparecen en el mismo componente a la vez. Uno establece el tono de la sección; el otro descansa. La tensión entre ellos es el sistema; la mezcla la destruye.

**La Regla del Plasma.** El teal es el color activo del sistema. Su presencia en hover, focus y acento de sección no significa que se derrame sobre fondos. Aparece donde hay acción o jerarquía; los fondos son siempre neutrales.

## 3. Typography: La Tipografía del Cartel

**Display Font:** Anton (con fallback a Impact, sans-serif)
**Body Font:** Barlow (con fallback a sans-serif)
**Label/UI Font:** Barlow Condensed (con fallback a sans-serif)

**Carácter:** Anton es la voz del estadio: condensado, sin serifa, diseñado para ocupar espacio. Barlow es la voz del vestuario: clara, funcional, sin pretensiones. Barlow Condensed es la señal: para etiquetas, posiciones, navegación. Tres voces con roles distintos que nunca se confunden entre sí.

### Hierarchy
- **Display** (Anton 400, clamp(4rem, 9vw, 8.5rem), line-height 0.9): Nombre del equipo en el hero. Una sola aparición por página. Puede partirse en dos líneas con una palabra en teal.
- **Headline** (Anton 400, clamp(2.4rem, 5vw, 4rem), line-height 1): Títulos de sección. Admiten palabras en teal o dorado para activar el color de la sección.
- **Title** (Barlow Condensed 700, 0.88-1.4rem, letter-spacing 0.04-0.14em, uppercase): Nombres de jugadores, títulos de tarjeta, encabezados de formulario.
- **Body** (Barlow 400, 0.9-1rem, line-height 1.75, máx. 65ch): Texto de párrafo. Nunca más de 65 caracteres de ancho. Nunca Anton para cuerpo.
- **Label** (Barlow Condensed 700, 0.62-0.78rem, letter-spacing 0.14-0.24em, uppercase): Etiquetas de campo, sec-labels, navegación, posiciones del roster. La voz más pequeña del sistema.

### Named Rules
**La Regla del Anton.** Anton solo para display y headlines. No para botones, no para labels, no para cuerpo. Cuando Anton aparece en texto pequeño pierde su autoridad y se convierte en ruido.

**La Regla del Espacio de Letra.** Barlow Condensed en uppercase necesita letter-spacing generoso (mínimo 0.14em) para ser legible a tamaño pequeño. Sin él, las letras se colapsan en una mancha.

## 4. Elevation: Capas Tonales con Sombras de Estado

El sistema es tonal en reposo: profundidad por oscuridad de fondo, no por sombra. La pila va de ink (#040d12) como base hasta surf (#0d2030) como la superficie más elevada visible. En hover o estado activo, una sombra suave aparece para confirmar la interacción; en reposo, todo es plano.

El backdrop-filter blur se usa exclusivamente como capa de legibilidad sobre el vídeo de fondo, nunca como decoración de superficie.

### Shadow Vocabulary
- **Hover Lift** (`0 8px 32px rgba(4,13,18,0.6), 0 2px 8px rgba(78,205,200,0.08)`): Aparece en tarjetas y CTAs en hover. Combina masa oscura con micro-glow teal para anclar el elemento al sistema.
- **Glow de Acento** (`0 0 40px rgba(78,205,200,0.18)` / `0 0 40px rgba(212,168,67,0.14)`): Exclusivo para logos e imágenes flotantes. Nunca en botones ni cards de contenido.

### Named Rules
**La Regla del Reposo Plano.** Las superficies no tienen sombra en reposo. La sombra es respuesta a la interacción del usuario, no decoración del estado neutro. Una tarjeta con sombra en reposo está mal.

## 5. Components

### Buttons
- **Forma:** 3px de radio. No redondeado, no cuadrado: forjado.
- **Primary (teal):** `background: #4ECDC8; color: #040d12; padding: 0.8rem 1.8rem`. Barlow Condensed 700, uppercase, letter-spacing 0.14em. Hover: `#3aafab` + `translateY(-2px)`.
- **Gold:** `background: #D4A843; color: #040d12`. Mismo shape. Para CTA de formulario y acciones de alta prioridad en secciones de acento dorado.
- **Ghost:** `border: 1.5px solid rgba(78,205,200,0.35); color: var(--text)`. Hover: borde a 100% opacity, texto vira a teal.
- **Focus:** `outline: 2px solid #4ECDC8; outline-offset: 2px` en `:focus-visible`. Nunca `outline: none` sin reemplazo.

### Cards / Containers
- **Radio:** 6-8px para cards de jugador/perk; 10px para form-card.
- **Fondo:** surf (#0d2030) a 90% opacidad.
- **Borde:** 1px solid rgba(teal, 0.12) en reposo; rgba(teal, 0.38) en hover.
- **Sombra:** solo en hover (ver Elevation).
- **Padding interno:** 1.6rem.
- **Cards de Defensa:** misma forma, borde y acento en dorado en lugar de teal.

### Inputs / Fields
- **Estilo:** `background: rgba(6,20,28,0.70); border: 1px solid rgba(78,205,200,0.20); border-radius: 4px`.
- **Focus:** borde vira a teal + `outline: 2px solid #4ECDC8; outline-offset: 2px`. Sin glow difuso.
- **Placeholder:** rgba(100,150,170,0.45). Nunca del mismo color que el texto real.

### Navigation
- **Estilo:** Barlow Condensed 700, 0.78rem, uppercase, letter-spacing 0.14em. Color: dim en reposo, teal en hover.
- **Mobile:** hamburger con área táctil mínima de 44px. `aria-expanded` togglable con `aria-controls`. Nav en overlay con backdrop-filter blur.
- **Scrolled:** header con `background: rgba(4,13,18,0.96)` + blur(20px) al superar 50px de scroll.

### Sec-Label (componente firma)
Etiqueta de apertura de sección: Barlow Condensed 700, 0.7rem, uppercase, letter-spacing 0.24em, en dorado. Precedida por línea de 30px del mismo color. Introduce cada sección como si fuera un capítulo. Nunca en teal; su rol es del dorado.

### Roster Cards (componente firma)
Tarjetas del roster divididas por unidad táctica. Ataque: acento teal. Defensa: acento dorado. El número del jugador aparece en Anton de 4.5rem en la esquina superior derecha a 9% de opacidad: pura textura, no contenido legible. Las unidades se separan con roster-group-labels centrados entre líneas horizontales.

## 6. Do's and Don'ts

### Do:
- **Do** usar Anton exclusivamente para display y headlines. Su autoridad depende de su escasez en la página.
- **Do** mantener la Regla del Tridente: teal o dorado por sección, nunca compitiendo en el mismo componente.
- **Do** añadir `loading="lazy"` a todas las imágenes fuera del viewport inicial.
- **Do** respetar `prefers-reduced-motion`: todas las animaciones son mejora progresiva.
- **Do** usar `focus-visible` con outline teal de 2px y offset de 2px. El foco de teclado es visible, no opcional.
- **Do** tiñar todos los neutrales hacia el azul marino. `#040d12` no `#000`; `#EEF4F6` no `#fff`.
- **Do** diseñar cada sección en 390px primero. Si no funciona en móvil, no funciona.
- **Do** usar Barlow Condensed uppercase con letter-spacing mínimo de 0.14em en labels.
- **Do** agrupar las tarjetas del roster por unidad táctica con separadores visuales.

### Don't:
- **Don't** usar estéticas de equipos amateurs españoles: sin plantillas WordPress genéricas, sin colores eléctricos sin sistema, sin tipografía sin criterio. Este es el anti-reference explícito.
- **Don't** usar `outline: none` sin un reemplazo visual equivalente. Nunca.
- **Don't** usar `border-left` mayor de 1px como acento de color en tarjetas o listas. Reescribir con fondo tintado o borde completo.
- **Don't** usar `background-clip: text` con gradiente. El texto lleva color sólido.
- **Don't** mezclar teal y dorado en el mismo componente interactivo.
- **Don't** usar Anton en botones, labels o cuerpo de texto.
- **Don't** añadir sombras en estado de reposo. Las sombras son respuesta, no decoración.
- **Don't** usar glassmorphism como patrón por defecto. El backdrop-filter solo existe donde hay vídeo debajo que justifica la capa de legibilidad.
- **Don't** crear cuadrículas de tarjetas idénticas sin diferenciación visual entre grupos.
- **Don't** poner `color: #fff` o `color: #000`. Siempre desde token: `var(--text)` o `var(--ink)`.
