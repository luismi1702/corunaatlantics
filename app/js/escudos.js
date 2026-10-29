// Escudos de los equipos de la liga.
//
// Van como ficheros en img/equipos/ y se buscan por el nombre del equipo, así
// que no hace falta ninguna columna en la base de datos: con escribir el
// nombre igual que aquí, sale el escudo. El que no está en la lista sale con
// sus iniciales, para que la fila no cojee mientras no tengamos su escudo.

import { html } from './ui.js';

const ARCHIVOS = {
  'coruna atlantics':  './img/cabeza.webp',
  'cambre towers':     './img/equipos/cambre-towers.webp',
  'santiago ravens':   './img/equipos/santiago-ravens.webp',
  'santiago black ravens': './img/equipos/santiago-ravens.webp',
  'gijon nortenos':    './img/equipos/gijon-nortenos.webp',
  'gijon mariners':    './img/equipos/gijon-mariners.webp',
  'gijon mariners m':  './img/equipos/gijon-mariners.webp',
  'gijon mariners f':  './img/equipos/gijon-mariners.webp',
  'oviedo madbulls':   './img/equipos/oviedo-madbulls.webp',
  'oviedo phoenix':    './img/equipos/oviedo-phoenix.webp',
  'cantabria bisons':  './img/equipos/cantabria-bisons.webp',
  'bierzo pumas':      './img/equipos/bierzo-pumas.webp'
};

const clave = (nombre) => String(nombre ?? '')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const iniciales = (nombre) => String(nombre ?? '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// El escudo como html, listo para meter en una plantilla.
export const escudo = (nombre) => {
  const src = ARCHIVOS[clave(nombre)];
  return src
    ? html`<img class="escudo" src="${src}" alt="" loading="lazy">`
    : html`<span class="escudo sin" aria-hidden="true">${iniciales(nombre)}</span>`;
};
