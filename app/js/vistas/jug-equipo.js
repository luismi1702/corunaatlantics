// Equipo — todo lo colectivo, desde el lado del jugador.
//
// Tres cosas en una pestaña, porque las tres responden a "¿cómo va el equipo?":
// quién está en la plantilla, cómo va la liga y quién lleva los números. Una
// pestaña para cada una habría dejado seis abajo, que no caben.
//
// De los compañeros solo se ve lo que ya se ve en una camiseta: nombre, dorsal
// y posición. Eso lo impone la vista `companeros` de la base de datos, no esta
// pantalla.

import * as db from '../db.js';
import {
  html, crudo, $, $$, nombreCompleto, tag, TAG_JUGADOR,
  ESTADISTICAS, ESTADISTICA, conRespaldo, cargando, vacio
} from '../ui.js';

let vista = 'plantilla';
let orden = 'td';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [equipo, ligas, numeros] = await Promise.all([
    db.companeros(),
    conRespaldo(db.competiciones(ctx.temporada.id), []),
    conRespaldo(db.estadisticasTemporada(ctx.temporada.id), [])
  ]);

  const liga = ligas.find(l => l.activa) ?? ligas[0] ?? null;
  const tabla = liga ? await conRespaldo(db.clasificacion(liga.id), []) : [];
  const porId = new Map(equipo.map(p => [p.id, p]));

  cont.innerHTML = html`
    <div class="filtros" id="vistas">
      <button data-v="plantilla"     aria-pressed="${vista === 'plantilla'}">Plantilla</button>
      <button data-v="clasificacion" aria-pressed="${vista === 'clasificacion'}">Clasificación</button>
      <button data-v="numeros"       aria-pressed="${vista === 'numeros'}">Estadísticas</button>
    </div>
    <div id="cuerpo"></div>
  `;

  // Una sola plantilla, sin repartir por unidades: en flag la misma gente juega
  // en los dos lados, asi que la division pintaba una frontera que en el campo
  // no existe. Va por dorsal, como el roster del club.
  const plantilla = () => html`
    <p class="ayuda" style="text-align:center;margin:0 0 1rem">
      ${equipo.length} ${equipo.length === 1 ? 'jugador en la plantilla' : 'jugadores en la plantilla'}
    </p>
    ${equipo.length ? crudo(html`
      <div class="lista">
        ${equipo.map(p => html`
          <div class="fila">
            <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">
              ${p.dorsal ?? '—'}
              ${p.es_capitan ? crudo('<span class="galon" title="Capitán">C</span>') : ''}
            </div>
            <div class="info">
              <div class="nom">${p.apodo || nombreCompleto(p)}</div>
              <div class="meta">${p.posiciones.join(' · ') || 'Sin posición'}</div>
            </div>
            <div class="dcha">${p.estado !== 'activo' ? tag(TAG_JUGADOR, p.estado) : ''}</div>
          </div>`)}
      </div>`) : vacio('Todavía no hay nadie en la plantilla.')}`;

  const clasificacion = () => !liga
    ? vacio('El club no ha añadido ninguna competición todavía.')
    : html`
      <p class="eyebrow">${liga.nombre}</p>
      ${tabla.length ? crudo(html`
        <div class="tabla-clas">
          ${tabla.map((f, i) => html`
            <div class="fila-clas ${f.es_nuestro ? 'nuestro' : ''}">
              <span class="pos">${i + 1}</span>
              <span class="equipo">${f.equipo}</span>
              <span class="dato">${f.jugados}</span>
              <span class="dato">${f.ganados}</span>
              <span class="dato">${f.perdidos}</span>
              <span class="dato fuerte">${f.puntos}</span>
            </div>`)}
        </div>
        <p class="leyenda-clas"><span>Pos</span><span>Equipo</span><span>J</span><span>G</span><span>P</span><span>Pts</span></p>`)
        : vacio('Todavía no hay resultados en esta competición.')}`;

  // De filas sueltas a una por jugador, con todos sus conceptos juntos.
  const agrupados = (() => {
    const mapa = new Map();
    for (const f of numeros) {
      const jugador = porId.get(f.jugador_id);
      if (!jugador) continue;
      const fila = mapa.get(f.jugador_id) ?? { jugador };
      fila[f.clave] = (fila[f.clave] ?? 0) + f.total;
      mapa.set(f.jugador_id, fila);
    }
    return [...mapa.values()];
  })();

  const numerosVista = () => {
    const filas = agrupados
      .filter(f => (f[orden] ?? 0) > 0)
      .sort((a, b) => (b[orden] ?? 0) - (a[orden] ?? 0));

    return html`
      <p class="eyebrow">Ordenar por</p>
      <div class="filtros" id="orden" style="flex-wrap:wrap;overflow:visible">
        ${ESTADISTICAS.map(e => html`
          <button data-o="${e.clave}" aria-pressed="${orden === e.clave}">${e.nombre}</button>`)}
      </div>

      <div style="margin-top:.9rem">
        ${filas.length ? crudo(html`
          <div class="lista">
            ${filas.map((f, i) => html`
              <div class="fila">
                <div class="puesto">${i + 1}</div>
                <div class="dorsal ${f.jugador.dorsal == null ? 'sin' : ''}">${f.jugador.dorsal ?? '—'}</div>
                <div class="info">
                  <div class="nom">${f.jugador.apodo || nombreCompleto(f.jugador)}</div>
                  <div class="meta">
                    ${ESTADISTICAS.filter(e => (f[e.clave] ?? 0) > 0)
                       .map(e => f[e.clave] + ' ' + e.corto).join(' · ')}
                  </div>
                </div>
                <div class="dcha">
                  <div class="cifra-stat">${f[orden] ?? 0}</div>
                  <div class="et-stat">${ESTADISTICA[orden].corto}</div>
                </div>
              </div>`)}
          </div>`) : vacio('Nadie tiene ' + ESTADISTICA[orden].nombre.toLowerCase() + ' todavía.')}
      </div>`;
  };

  function pintar() {
    $('#cuerpo').innerHTML = vista === 'plantilla' ? plantilla()
      : vista === 'clasificacion' ? clasificacion()
      : numerosVista();

    $$('#orden button').forEach(b => b.addEventListener('click', () => {
      orden = b.dataset.o;
      pintar();
    }));
  }

  $$('#vistas button').forEach(b => b.addEventListener('click', () => {
    vista = b.dataset.v;
    $$('#vistas button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  pintar();
}
