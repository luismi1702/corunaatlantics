// Personas — la plantilla y quien quiere entrar.
//
// Solicitudes era una pantalla propia, pero es gente igual que el roster, y en
// cuanto pase el arranque estará vacía casi siempre. Como vista dentro del
// roster estorba menos y se mira igual.

import * as db from '../db.js';
import { html, crudo, $, $$, conRespaldo } from '../ui.js';
import { render as renderRoster } from './roster.js';
import { render as renderSolicitudes } from './solicitudes.js';

let vista = 'plantilla';

export async function render(ctx, cont) {
  const pendientes = await conRespaldo(db.solicitudes(), []);

  cont.innerHTML = html`
    <div class="filtros" id="vistas">
      <button data-v="plantilla"   aria-pressed="${vista === 'plantilla'}">Plantilla</button>
      <button data-v="solicitudes" aria-pressed="${vista === 'solicitudes'}">
        Solicitudes${pendientes.length ? crudo(html` <span class="cuenta-chip">${pendientes.length}</span>`) : ''}
      </button>
    </div>
    <div id="cuerpo"></div>`;

  const pintar = () => (vista === 'plantilla' ? renderRoster : renderSolicitudes)(ctx, $('#cuerpo'));

  $$('#vistas button').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.v;
    $$('#vistas button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  await pintar();
}
