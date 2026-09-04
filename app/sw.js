// Service worker.
//
// Cachea únicamente el armazón de la app (HTML, CSS, JS, iconos), nunca los
// datos: una lista de cuotas guardada de la semana pasada sería peor que no
// tener nada, porque parecería actual. Sin conexión, la app abre y avisa.

const VERSION = 'atlantics-gestion-v3';

const ARMAZON = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/ui.js',
  './js/cerrojo.js',
  './js/db.js',
  './js/config.js',
  './js/vistas/menu.js',
  './js/vistas/alta.js',
  './js/vistas/solicitudes.js',
  './js/vistas/avisos.js',
  './js/vistas/material.js',
  './js/vistas/calendario.js',
  './js/vistas/lista.js',
  './js/vistas/disponibilidad.js',
  './js/vistas/panel.js',
  './js/vistas/roster.js',
  './js/vistas/cuotas.js',
  './js/vistas/tesoreria.js',
  './js/vistas/documentacion.js',
  './js/vistas/ajustes.js',
  './js/vistas/jug-hoy.js',
  './js/vistas/jug-avisos.js',
  './js/vistas/jug-agenda.js',
  './js/vistas/jug-equipo.js',
  './js/vistas/jug-ficha.js',
  './manifest.webmanifest',
  './img/logo-principal.webp',
  './img/tridente.webp',
  './icons/icono-192.png',
  './icons/icono-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ARMAZON))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Todo lo que sea datos o autenticación va siempre a la red, sin caché.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Red primero, caché como red de seguridad: así una versión nueva de la app
  // se aplica al recargar, sin quedarse pegada a la anterior.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
