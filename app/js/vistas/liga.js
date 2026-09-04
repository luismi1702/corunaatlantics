// Liga — la competición y las estadísticas, juntas.
//
// Las dos responden a "cómo va la temporada", y en el lado del jugador ya
// estaban en la misma pantalla. Aquí igual.

import { html, $, $$ } from '../ui.js';
import { render as renderCompeticiones } from './competiciones.js';
import { render as renderEstadisticas } from './estadisticas.js';

let vista = 'competiciones';

export async function render(ctx, cont) {
  cont.innerHTML = html`
    <div class="filtros" id="vistas">
      <button data-v="competiciones" aria-pressed="${vista === 'competiciones'}">Competición</button>
      <button data-v="estadisticas"  aria-pressed="${vista === 'estadisticas'}">Estadísticas</button>
    </div>
    <div id="cuerpo"></div>`;

  const pintar = () => (vista === 'competiciones' ? renderCompeticiones : renderEstadisticas)(ctx, $('#cuerpo'));

  $$('#vistas button').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.v;
    $$('#vistas button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  await pintar();
}
