// Playbook — las jugadas del club, dentro de Equipo.
//
// Los dibujos y los textos salen de playbook/generar.py, el mismo script que
// hace el PDF, así que la app y el papel no pueden decir cosas distintas. El
// módulo de datos va con el resto de la app en el service worker: en el campo
// no siempre hay cobertura y es justo donde más se mira.
//
// Ataque: una formación cada vez, en el orden del capítulo 5.
// Defensa: alineaciones, coberturas de zona y de hombre, como el capítulo 6.

import { html, crudo, $$ } from '../ui.js';

let lado = 'ataque';
let formacion = 0;
let grupo = 0;

export async function pintarPlaybook(cont) {
  const { PLAYBOOK } = await import('../playbook-datos.js');

  // Las flechas de los dibujos son marcadores SVG compartidos: se definen una
  // vez por página y cada jugada los usa por su id. Se reemplazan siempre por
  // si una versión anterior de la app los dejó puestos sin los de defensa.
  let defs = document.getElementById('pb-defs');
  if (!defs) {
    defs = document.createElement('div');
    defs.id = 'pb-defs';
    document.body.appendChild(defs);
  }
  defs.innerHTML = PLAYBOOK.defs;

  const forms = PLAYBOOK.formaciones;
  const grupos = PLAYBOOK.defensa.grupos;
  if (formacion >= forms.length) formacion = 0;
  if (grupo >= grupos.length) grupo = 0;

  const lista = (filas) => html`
    <ul class="pb-rutas">
      ${filas.map(([k, color, texto]) => html`
        <li><i style="background:${color}"></i><b>${k}</b><span>${texto}</span></li>`)}
    </ul>`;

  function ataque() {
    const f = forms[formacion];
    const n = f.jugadas.length;
    return html`
      <div class="filtros" id="pb-tabs">
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
          ${lista(j.rutas)}
          <p>${j.texto}</p>
        </article>`)}`;
  }

  function defensa() {
    const g = grupos[grupo];
    const n = g.fichas.length;
    const alineaciones = grupo === 0;
    return html`
      <div class="filtros" id="pb-tabs">
        ${grupos.map((x, i) => html`
          <button data-i="${i}" aria-pressed="${i === grupo}">${x.nombre} · ${x.fichas.length}</button>`)}
      </div>

      <section class="pb-forma pb-solo">
        <div class="pb-forma-txt">
          <span>${g.tipo}</span>
          <h2>${g.nombre}</h2>
          <b>${n} ${alineaciones ? 'alineaciones' : 'coberturas'}</b>
        </div>
      </section>

      ${alineaciones ? html`
        <article class="card pb-jugada pb-def">
          <header><h3>Posiciones</h3></header>
          <ul class="pb-rutas">
            ${PLAYBOOK.defensa.posiciones.map(([k, color, nombre, texto]) => html`
              <li><i style="background:${color}"></i><b>${k}</b><span><strong>${nombre}.</strong> ${texto}</span></li>`)}
          </ul>
          <p>Tres colocaciones antes del snap: zona, hombre a hombre y bunch. En zona hay varias, según la cobertura.</p>
        </article>` : html`
        <p class="pb-aviso"><b>Punto débil.</b> Todas las coberturas tienen uno y es normal: saber dónde está,
          estar atentos y adaptarse si el call no era el bueno. Las zonas sombreadas son la responsabilidad de cada defensor.</p>`}

      ${g.fichas.map(f => html`
        <article class="card pb-jugada pb-def">
          <header>
            <h3>${f.nombre}</h3>
            ${f.call ? html`<em class="pb-call">Call ${f.call}</em>` : ''}
            <span>${f.sub}</span>
          </header>
          <div class="pb-campo">${crudo(f.svg)}</div>
          ${lista(f.lineas)}
          ${f.notas ? html`<div class="pb-notas">${crudo(f.notas)}</div>` : ''}
        </article>`)}`;
  }

  function pintar() {
    cont.innerHTML = html`
      <div class="pb-lado" role="group" aria-label="Ataque o defensa">
        <button data-l="ataque" aria-pressed="${lado === 'ataque'}">Ataque</button>
        <button data-l="defensa" aria-pressed="${lado === 'defensa'}">Defensa</button>
      </div>

      ${lado === 'ataque' ? ataque() : defensa()}

      <a class="btn fantasma ancho pb-pdf" href="../playbook/playbook.pdf" target="_blank" rel="noopener">
        Abrir el playbook completo en PDF
      </a>`;

    $$('.pb-lado button', cont).forEach(b => b.addEventListener('click', () => {
      if (lado === b.dataset.l) return;
      lado = b.dataset.l;
      pintar();
      window.scrollTo(0, 0);
    }));

    $$('#pb-tabs button', cont).forEach(b => b.addEventListener('click', () => {
      if (lado === 'ataque') formacion = Number(b.dataset.i);
      else grupo = Number(b.dataset.i);
      pintar();
      window.scrollTo(0, 0);
    }));
  }

  pintar();
}
