// Las estadísticas de un partido, jugador a jugador.
//
// Vive aparte porque se abre desde dos sitios: desde la pantalla del partido,
// cuando se está en el campo, y desde la Liga, justo después de apuntar el
// resultado. Es el mismo gesto y tiene que ser la misma pantalla.

import * as db from '../db.js';
import {
  html, crudo, $, $$, nombreCompleto, ESTADISTICAS, hoja, avisar, fallo
} from '../ui.js';

export async function abrirEstadisticas(ev, plantilla) {
  const filas = await db.estadisticasDe(ev.id);

  // De filas sueltas a { jugadorId: { clave: valor } }
  const porJugador = {};
  for (const f of filas) {
    (porJugador[f.jugador_id] ??= {})[f.clave] = f.valor;
  }

  const resumen = (id) => ESTADISTICAS
    .filter(e => (porJugador[id]?.[e.clave] ?? 0) > 0)
    .map(e => porJugador[id][e.clave] + ' ' + e.corto)
    .join(' · ');

  const panel = hoja('Estadísticas', html`
    <p class="ayuda" style="margin:0 0 1rem;line-height:1.6">
      Toca un jugador y apunta lo suyo. Lo que quede a cero no se guarda.
    </p>
    <div class="lista" id="jugadores">
      ${plantilla.map(p => html`
        <button class="fila" data-id="${p.id}">
          <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
          <div class="info">
            <div class="nom">${nombreCompleto(p)}</div>
            <div class="meta">${resumen(p.id) || 'Sin apuntar'}</div>
          </div>
          <div class="dcha">${resumen(p.id) ? crudo('<span class="tag ok">✓</span>') : ''}</div>
        </button>`)}
    </div>`);

  $$('#jugadores .fila', panel).forEach(b => b.addEventListener('click', () => {
    const jugador = plantilla.find(p => p.id === b.dataset.id);
    abrirJugador(ev, jugador, porJugador[jugador.id] ?? {}, () => {
      panel.cerrar();
      abrirEstadisticas(ev, plantilla);
    });
  }));
}

function abrirJugador(ev, jugador, valores, alGuardar) {
  const panel = hoja(nombreCompleto(jugador), html`
    <form id="stats-jugador">
      ${['ataque', 'defensa'].map(area => html`
        <p class="eyebrow">${area === 'ataque' ? 'Ataque' : 'Defensa'}</p>
        <div class="rejilla-stats">
          ${ESTADISTICAS.filter(e => e.area === area).map(e => html`
            <div class="campo" style="margin:0">
              <label>${e.nombre}</label>
              <input name="${e.clave}" type="number" min="0" inputmode="numeric"
                     value="${valores[e.clave] ?? ''}" placeholder="0">
            </div>`)}
        </div>`)}

      <button class="btn primario ancho" type="submit" style="margin-top:1.2rem">Guardar</button>
    </form>`);

  $('#stats-jugador', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = Object.fromEntries(ESTADISTICAS.map(x => [x.clave, Number(f.get(x.clave)) || 0]));
    try {
      await db.guardarEstadisticas(ev.id, jugador.id, datos);
      avisar('Apuntado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
