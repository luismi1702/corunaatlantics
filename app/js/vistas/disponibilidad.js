// Disponibilidad — quién puede jugar.
//
// Cruza lesiones y licencia, que es lo que hoy
// está repartido en tres pantallas distintas. El dinero no entra aquí: quién
// juega y quién debe la cuota son dos conversaciones separadas.

import * as db from '../db.js';
import { html, $, nombreCompleto, hoja, avisar, cargando, vacio } from '../ui.js';

const GRUPOS = [
  { clave: 'si',   titulo: 'Puede jugar',  clase: 'ok'   },
  { clave: 'pega', titulo: 'Con pegas',    clase: 'warn' },
  { clave: 'no',   titulo: 'No puede',     clase: 'bad'  }
];

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, apt] = await Promise.all([
    db.roster(),
    db.aptitud(ctx.temporada.id)
  ]);

  const porId = new Map(apt.map(a => [a.jugador_id, a]));
  const filas = plantilla
    .filter(p => p.estado !== 'baja')
    .map(p => {
      const a = porId.get(p.id);
      return {
        jugador: p,
        apto: a?.apto ?? 'no',
        motivos: a?.motivos ?? ['Sin ficha de documentación']
      };
    });

  const de = (clave) => filas.filter(f => f.apto === clave);

  cont.innerHTML = html`
    <div class="cifras">
      ${GRUPOS.map(g => html`
        <div class="cifra ${g.clase === 'warn' ? 'gold' : g.clase}">
          <div class="n">${de(g.clave).length}</div>
          <div class="l">${g.titulo}</div>
        </div>`)}
    </div>

    <div id="grupos"></div>

    <button class="btn oro ancho" id="convocar" style="margin-top:1.2rem">
      Preparar convocatoria
    </button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Con los que pueden jugar, para copiar y pegar donde haga falta.
    </p>
  `;

  $('#grupos').innerHTML = GRUPOS.map(g => {
    const items = de(g.clave);
    if (!items.length && g.clave !== 'si') return '';
    return html`
      <p class="eyebrow">${g.titulo}</p>
      <div class="lista">
        ${items.length ? items.map(f => html`
          <div class="fila">
            <div class="dorsal ${f.jugador.dorsal == null ? 'sin' : ''}">${f.jugador.dorsal ?? '—'}</div>
            <div class="info">
              <div class="nom">${nombreCompleto(f.jugador)}</div>
              <div class="meta">
                ${f.motivos.length ? f.motivos.join(' · ') : f.jugador.posiciones.join(' · ') || 'Sin posición'}
              </div>
            </div>
            <div class="dcha"><span class="tag ${g.clase}">${g.titulo}</span></div>
          </div>`)
          : vacio('Nadie está listo para jugar todavía. Revisa las licencias en Documentos.')}
      </div>`;
  }).join('');

  $('#convocar').addEventListener('click', async () => {
    const listos = de('si');
    if (!listos.length) { avisar('No hay nadie disponible'); return; }

    const texto = 'Convocatoria — ' + ctx.temporada.nombre + '\n' +
      listos
        .slice()
        .sort((a, b) => (a.jugador.dorsal ?? 999) - (b.jugador.dorsal ?? 999))
        .map(f => (f.jugador.dorsal != null ? f.jugador.dorsal + ' · ' : '') + nombreCompleto(f.jugador))
        .join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      avisar('Convocatoria copiada');
    } catch {
      hoja('Convocatoria', html`<textarea style="width:100%;min-height:260px">${texto}</textarea>`);
    }
  });
}
