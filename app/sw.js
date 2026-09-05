// Service worker.
//
// Cachea únicamente el armazón de la app (HTML, CSS, JS, iconos), nunca los
// datos: una lista de cuotas guardada de la semana pasada sería peor que no
// tener nada, porque parecería actual. Sin conexión, la app abre y avisa.

const VERSION = 'atlantics-gestion-v36';

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
  './js/vistas/dinero.js',
  './js/vistas/liga.js',
  './js/vistas/personas.js',
  './js/vistas/alta.js',
  './js/vistas/solicitudes.js',
  './js/vistas/avisos.js',
  './js/vistas/material.js',
  './js/vistas/tienda.js',
  './js/vistas/competiciones.js',
  './js/vistas/estadisticas.js',
  './js/vistas/calendario.js',
  './js/vistas/lista.js',
  './js/vistas/stats-partido.js',
  './js/vistas/disponibilidad.js',
  './js/vistas/camiseta.js',
  './js/vistas/roster.js',
  './js/vistas/cuotas.js',
  './js/vistas/tesoreria.js',
  './js/vistas/documentacion.js',
  './js/vistas/ajustes.js',
  './js/vistas/jug-hoy.js',
  './js/vistas/jug-avisos.js',
  './js/vistas/jug-tienda.js',
  './js/vistas/jug-agenda.js',
  './js/vistas/jug-equipo.js',
  './js/vistas/jug-ficha.js',
  './manifest.webmanifest',
  './img/logo-principal.webp',
  './img/tridente.webp',
  './icons/icono-192.png',
  './icons/icono-512.png'
];

// Uno a uno y no con addAll: addAll es todo o nada, asi que un solo fichero
// que falle —una publicacion a medias, un corte de red— dejaba la instalacion
// sin hacer y la cache vacia. Mejor guardar lo que se pueda.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(ARMAZON.map(u =>
        c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
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
  //
  // cache:'reload' es lo que hace que eso sea verdad. GitHub Pages sirve los
  // archivos con max-age=600, así que sin esto el navegador respondía con su
  // copia de hace diez minutos sin llegar a preguntar, y una corrección recién
  // publicada no se veía. Aquí siempre se pregunta al servidor; si no hay red,
  // sigue estando la caché de abajo.
  e.respondWith(
    fetch(new Request(e.request.url, { cache: 'reload', credentials: 'same-origin' }))
      .then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => {
        if (r) return r;
        // Sin red y sin copia: solo tiene sentido devolver la app cuando lo que
        // se pedia era una pantalla. A una imagen o a una hoja de estilo hay
        // que decirle que no hay nada; devolverle el index.html es lo que
        // pintaba el logotipo roto en vez de dejar el hueco.
        return e.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error();
      }))
  );
});
