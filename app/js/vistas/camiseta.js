// La camiseta: el dorsal de fondo y el nombre encima.
//
// Vive aparte porque la usan dos pantallas — el roster del club y la plantilla
// que ven los jugadores— y tienen que ser idénticas. Si cada una tuviera la
// suya acabarían separándose al primer retoque y dejarían de parecer el mismo
// equipo.
//
// La del club se toca y abre la ficha; la del jugador no lleva a ningún sitio,
// así que ni siquiera es un botón. Y la chapa de abajo la pone quien llama:
// el club enseña la cuota, el jugador solo si alguien está de baja, porque el
// dinero de los demás no es cosa suya.

import { html, crudo } from '../ui.js';

export const camiseta = (p, { id = null, chapa = '' } = {}) => {
  // Quien tiene nombre de camiseta lleva ese y nada mas: si le llaman Luismi,
  // poner encima "Luis Miguel Pérez Olivares" es justo lo que no queria. Al que
  // no lo tiene se le pone el apellido grande y el nombre encima, que es como
  // se distingue a dos hermanos.
  const grande  = p.apodo || p.apellidos || p.nombre;
  const pequeno = p.apodo ? '' : p.nombre;

  const dentro = html`
    <span class="num ${p.dorsal == null ? 'sin' : 'd' + String(p.dorsal).length}"
          aria-hidden="true">${p.dorsal ?? '—'}</span>
    ${p.es_capitan ? crudo('<span class="galon" title="Capitán">C</span>') : ''}
    <span class="quien">
      <span class="pila">${pequeno && pequeno !== grande ? pequeno : ''}</span>
      <span class="ape">${grande}</span>
    </span>
    <span class="pie">
      <span class="pos">${p.posiciones.join(' · ') || 'Sin posición'}</span>
      ${chapa}
    </span>`;

  return id
    ? html`<button class="camiseta" data-id="${id}">${dentro}</button>`
    : html`<div class="camiseta">${dentro}</div>`;
};
