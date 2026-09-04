// Estadísticas — los números de la temporada y el acumulado de siempre.
//
// Se meten partido a partido desde la pantalla del propio partido. Aquí solo
// se leen, ordenadas por el concepto que se elija.

import * as db from '../db.js';
import {
  html, $, $$, nombreCompleto, ESTADISTICAS, ESTADISTICA,
  cargando, vacio
} from '../ui.js';

let orden = 'td';
let ambito = 'temporada';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, deTemporada, historico] = await Promise.all([
    db.roster(),
    db.estadisticasTemporada(ctx.temporada.id),
    db.estadisticasHistorico()
  ]);

  const porId = new Map(plantilla.map(p => [p.id, p]));

  // De filas sueltas a un objeto por jugador: { jugador, td: 3, int: 1, ... }
  const agrupar = (filas) => {
    const mapa = new Map();
    for (const f of filas) {
      const jugador = porId.get(f.jugador_id);
      if (!jugador) continue;
      const fila = mapa.get(f.jugador_id) ?? { jugador, partidos: 0 };
      fila[f.clave] = (fila[f.clave] ?? 0) + f.total;
      fila.partidos = Math.max(fila.partidos, f.partidos);
      mapa.set(f.jugador_id, fila);
    }
    return [...mapa.values()];
  };

  const datos = { temporada: agrupar(deTemporada), historico: agrupar(historico) };

  cont.innerHTML = html`
    <div class="filtros" id="ambito">
      <button data-a="temporada" aria-pressed="${ambito === 'temporada'}">${ctx.temporada.nombre}</button>
      <button data-a="historico" aria-pressed="${ambito === 'historico'}">Histórico</button>
    </div>

    <p class="eyebrow">Ordenar por</p>
    <div class="filtros" id="orden" style="flex-wrap:wrap;overflow:visible">
      ${ESTADISTICAS.map(e => html`
        <button data-o="${e.clave}" aria-pressed="${orden === e.clave}">${e.nombre}</button>`)}
    </div>

    <div id="tabla" style="margin-top:.9rem"></div>

    <p class="ayuda" style="text-align:center;margin-top:1rem;line-height:1.6">
      Los números se meten en cada partido, desde el calendario.
    </p>
  `;

  function pintar() {
    const filas = datos[ambito]
      .filter(f => (f[orden] ?? 0) > 0)
      .sort((a, b) => (b[orden] ?? 0) - (a[orden] ?? 0));

    $('#tabla').innerHTML = filas.length ? html`
      <div class="lista">
        ${filas.map((f, i) => html`
          <div class="fila">
            <div class="puesto">${i + 1}</div>
            <div class="dorsal ${f.jugador.dorsal == null ? 'sin' : ''}">${f.jugador.dorsal ?? '—'}</div>
            <div class="info">
              <div class="nom">${nombreCompleto(f.jugador)}</div>
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
      </div>` : vacio('Nadie tiene ' + ESTADISTICA[orden].nombre.toLowerCase() + ' todavía.');
  }

  $$('#ambito button').forEach(b => b.addEventListener('click', () => {
    ambito = b.dataset.a;
    $$('#ambito button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $$('#orden button').forEach(b => b.addEventListener('click', () => {
    orden = b.dataset.o;
    $$('#orden button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  pintar();
}
