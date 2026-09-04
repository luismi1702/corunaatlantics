// Dinero — las cuotas y la tesorería, juntas.
//
// Estaban en dos pantallas distintas, y no tenía sentido: las cuotas son el
// ingreso principal del club y se miraban lejos del saldo. Cada mitad sigue
// siendo su propia vista; esto solo las pone bajo el mismo techo.

import { html, $, $$ } from '../ui.js';
import { render as renderCuotas } from './cuotas.js';
import { render as renderTesoreria } from './tesoreria.js';

let vista = 'cuotas';

export async function render(ctx, cont) {
  cont.innerHTML = html`
    <div class="filtros" id="vistas">
      <button data-v="cuotas"    aria-pressed="${vista === 'cuotas'}">Cuotas</button>
      <button data-v="tesoreria" aria-pressed="${vista === 'tesoreria'}">Tesorería</button>
    </div>
    <div id="cuerpo"></div>`;

  const pintar = () => (vista === 'cuotas' ? renderCuotas : renderTesoreria)(ctx, $('#cuerpo'));

  $$('#vistas button').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.v;
    $$('#vistas button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  await pintar();
}
