# Coruña Atlantics — Web

Web estática del equipo de fútbol americano de A Coruña. Refundación 2026.

## Hosting
GitHub Pages (repo luismi1702/corunaatlantics, rama master) con dominio propio
corunaatlantics.com via el archivo CNAME. El certificado SSL lo emite GitHub y ya ha
fallado al renovarse una vez; si la web da ERR_CERT_COMMON_NAME_INVALID el arreglo esta
en docs/decisiones.md (no es un fallo del codigo ni del DNS).

## Stack
HTML5 + CSS3 + Vanilla JS · Sin frameworks · 100% estático

## Regla de imágenes
Usar SIEMPRE las versiones sin fondo (transparentes) para logos y mascotas en la web.
Las versiones FONDO.png / CON FONDO.png son solo para uso fuera de la web.

## Identidad visual (rebranding mayo 2026)
Colores: Teal #4ECDC4 · Gold #D4A843 · Ink #040d12
Tipografía: Anton (titulares) · Barlow Condensed (UI) · Barlow (cuerpo)
Hashtag: #WeAreAtlantics · Mascota: Poseidón (teal, tridente dorado)

## Archivos web
- index.html — landing principal
- patrocinio.html — dossier patrocinio (pendiente actualizar branding)
- app/ — app del equipo (consola de gestión + app del jugador), ver app/README.md
- docs/app-plan.md — plan del proyecto de la app
- docs/legal-reactivacion.md — checklist legal refundación
- docs/decisiones.md — registro de decisiones técnicas
- docs/contacto-esn-coruna.md — textos de contacto con ESN y universidades
- videos/GUION_REEL_HYPE.md — guión y flujo de montaje de Reels

## Vídeos de fondo
- storm.mp4 — fondo principal (autoplay)
- waves.mp4 — crossfade cada 20s vía JS

## Logos archivados
logos-antiguos/ — branding anterior al rebranding de mayo 2026

## Regla de comunicación externa
En textos dirigidos fuera del club (correos, redes, patrocinadores) NO mencionar la
refundación ni que entrenar sea gratuito. Hablar de "nueva temporada". Motivo en
docs/decisiones.md.

## App del equipo
PWA estática en app/, servida en corunaatlantics.com/app/ con Supabase (plan free)
como base de datos. Dos caras según el rol: consola de gestión para el staff y app
para el jugador. El SQL va en app/db/ y se ejecuta en orden. Puesta en marcha y
decisiones de diseño en app/README.md y docs/app-plan.md.

Regla: los datos económicos y la documentación ajena los protege Postgres con Row
Level Security, nunca la interfaz. Si una pantalla necesita esconder algo, el
permiso va en app/db/02_rls.sql.
