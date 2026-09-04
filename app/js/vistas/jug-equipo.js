// Equipo — los compañeros, con lo que ya se ve en una camiseta.
//
// Nombre, dorsal y posición. Ni teléfonos, ni papeleo, ni cuotas: eso lo
// impide la vista `companeros` de la base de datos, no esta pantalla.

import * as db from '../db.js';
import {
  html, nombreCompleto, tag, TAG_JUGADOR, unidadDe, NOMBRE_UNIDAD, cargando, vacio
} from '../ui.js';

const GRUPOS = ['ataque', 'defensa', 'especiales', null];

export async function render(ctx, cont) {
  cont.innerHTML = cargando();
  const equipo = await db.companeros();

  const de = (unidad) => equipo.filter(p => unidadDe(p.posiciones) === unidad);

  cont.innerHTML = html`
    <p class="ayuda" style="text-align:center;margin:0 0 1rem">
      ${equipo.length} ${equipo.length === 1 ? 'jugador en la plantilla' : 'jugadores en la plantilla'}
    </p>

    ${equipo.length ? GRUPOS.map(unidad => {
      const items = de(unidad);
      if (!items.length) return '';
      return html`
        <p class="eyebrow">
          ${unidad ? NOMBRE_UNIDAD[unidad] : 'Sin posición asignada'}
          <span class="cuenta">${items.length}</span>
        </p>
        <div class="lista">
          ${items.map(p => html`
            <div class="fila">
              <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
              <div class="info">
                <div class="nom">${p.apodo || nombreCompleto(p)}</div>
                <div class="meta">${p.posiciones.join(' · ') || 'Sin posición'}</div>
              </div>
              <div class="dcha">${p.estado !== 'activo' ? tag(TAG_JUGADOR, p.estado) : ''}</div>
            </div>`)}
        </div>`;
    }) : vacio('Todavía no hay nadie en la plantilla.')}
  `;
}
