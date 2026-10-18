// Playbook — las jugadas del club, dentro de Equipo.
//
// Los dibujos y los textos salen de playbook/generar.py, el mismo script que
// hace el PDF, así que la app y el papel no pueden decir cosas distintas. El
// módulo de datos va con el resto de la app en el service worker: en el campo
// no siempre hay cobertura y es justo donde más se mira.
//
// Una formación cada vez, en el mismo orden que el capítulo 5 del playbook.

import { html, crudo, $$ } from '../ui.js';

let formacion = 0;

export async function pintarPlaybook(cont) {
  const { PLAYBOOK } = await import('../playbook-datos.js');

  // Las flechas de los dibujos son marcadores SVG compartidos: se definen una
  // vez por página y cada jugada los usa por su id.
  if (!document.getElementById('pb-defs')) {
    const defs = document.createElement('div');
    defs.id = 'pb-defs';
    defs.innerHTML = PLAYBOOK.defs;
    document.body.appendChild(defs);
  }

  const forms = PLAYBOOK.formaciones;
  if (formacion >= forms.length) formacion = 0;

  function pintar() {
    const f = forms[formacion];
    const n = f.jugadas.length;
    cont.innerHTML = html`
      <div class="filtros" id="pb-formas">
        ${forms.map((x, i) => html`
          <button data-i="${i}" aria-pressed="${i === formacion}">${x.nombre} · ${x.jugadas.length}</button>`)}
      </div>

      <section class="pb-forma">
        <div class="pb-forma-txt">
          <span>Formación</span>
          <h2>${f.nombre}</h2>
          <b>${n} ${n === 1 ? 'jugada' : 'jugadas'}</b>
        </div>
        <div class="pb-campo">${crudo(f.fig)}</div>
      </section>

      ${f.jugadas.map(j => html`
        <article class="card pb-jugada">
          <header>
            <h3>${j.nombre}</h3>
            <span>${f.nombre} ${j.lado}</span>
          </header>
          <div class="pb-campo">${crudo(j.svg)}</div>
          <ul class="pb-rutas">
            ${j.rutas.map(([k, color, texto]) => html`
              <li><i style="background:${color}"></i><b>${k}</b><span>${texto}</span></li>`)}
          </ul>
          <p>${j.texto}</p>
        </article>`)}

      <a class="btn fantasma ancho pb-pdf" href="../playbook/playbook.pdf" target="_blank" rel="noopener">
        Abrir el playbook completo en PDF
      </a>`;

    $$('#pb-formas button', cont).forEach(b => b.addEventListener('click', () => {
      formacion = Number(b.dataset.i);
      pintar();
      window.scrollTo(0, 0);
    }));
  }

  pintar();
}
