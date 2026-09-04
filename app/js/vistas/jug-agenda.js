// Agenda — el calendario tal como lo ve un jugador.
//
// Puede confirmar en cualquier evento por venir, y ver en los pasados si al
// final fue. No puede crear ni cambiar nada del calendario.

import * as db from '../db.js';
import {
  html, crudo, $, $$, cuando, hora, hoyISO, esDeUnidad, NOMBRE_UNIDAD,
  OPCIONES_ASISTENCIA as OPCIONES, avisar, fallo, cargando, vacio
} from '../ui.js';

let filtro = 'proximos';

const FUE = {
  presente:    { txt: 'Fuiste',      clase: 'ok' },
  ausente:     { txt: 'No fuiste',   clase: 'bad' },
  justificado: { txt: 'Justificado', clase: 'warn' }
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const yo = ctx.perfil;
  const [agenda, mias] = await Promise.all([
    db.eventos(ctx.temporada.id),
    db.misAsistencias(yo.id)
  ]);

  const hoy = hoyISO();
  const porEvento = new Map(mias.map(a => [a.evento_id, a]));
  const proximos = agenda.filter(e => e.fecha >= hoy);
  const pasados = agenda.filter(e => e.fecha < hoy).reverse();

  const titulo = (e) => e.tipo === 'partido'
    ? (e.rival ? (e.es_local ? 'vs ' : 'en ') + e.rival : 'Partido')
    : 'Entreno';

  cont.innerHTML = html`
    <div class="filtros" id="filtros">
      <button data-f="proximos" aria-pressed="${filtro === 'proximos'}">Próximos</button>
      <button data-f="pasados"  aria-pressed="${filtro === 'pasados'}">Pasados</button>
    </div>
    <div id="lista"></div>
  `;

  function pintar() {
    const items = filtro === 'proximos' ? proximos : pasados;

    $('#lista').innerHTML = items.length ? html`<div class="lista">${items.map(e => {
      const mia = porEvento.get(e.id);
      const futuro = e.fecha >= hoy;
      return html`
        <div class="card evento-jug">
          <div style="display:flex;align-items:flex-start;gap:.8rem">
            <div class="info">
              <div class="nom" style="font-size:1.1rem">${titulo(e)}</div>
              <div class="meta">
                ${cuando(e.fecha)}${e.hora ? ' · ' + hora(e.hora) : ''}${e.lugar ? ' · ' + e.lugar : ''}
              </div>
              ${e.unidad !== 'todos' ? crudo(html`
                <div class="meta" style="color:${esDeUnidad(yo.posiciones, e.unidad) ? 'var(--teal)' : 'var(--goldf)'}">
                  ${NOMBRE_UNIDAD[e.unidad]}${esDeUnidad(yo.posiciones, e.unidad) ? '' : ' · no es tu unidad'}
                </div>`) : ''}
            </div>
            ${e.cancelado ? crudo('<span class="tag bad">Cancelado</span>')
              : !futuro && mia?.estado ? crudo(html`<span class="tag ${FUE[mia.estado].clase}">${FUE[mia.estado].txt}</span>`)
              : ''}
          </div>

          ${futuro && !e.cancelado ? crudo(html`
            <div class="respuesta" data-evento="${e.id}">
              ${OPCIONES.map(o => html`
                <button class="opcion ${o.clase}" data-v="${o.valor}"
                  aria-pressed="${mia?.confirmacion === o.valor}">
                  <svg viewBox="0 0 24 24" aria-hidden="true">${crudo(o.icono)}</svg>
                  <span>${o.txt}</span>
                </button>`)}
            </div>`) : ''}
        </div>`;
    })}</div>` : vacio(filtro === 'proximos'
      ? 'No hay nada programado por delante.'
      : 'Todavía no hay entrenos pasados.');

    $$('#lista .respuesta').forEach(grupo => {
      $$('.opcion', grupo).forEach(b => b.addEventListener('click', async () => {
        $$('.opcion', grupo).forEach(o => o.setAttribute('aria-pressed', o === b));
        try {
          await db.confirmarAsistencia(grupo.dataset.evento, yo.id, b.dataset.v);
          avisar('Anotado');
        } catch (err) { fallo(err); }
      }));
    });
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  pintar();
}
