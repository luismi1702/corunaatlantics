// Avisos — el tablón, desde el lado del jugador.
//
// Solo se lee. Lo que no ha leído aparece marcado y se marca solo al abrirlo,
// sin pedirle que confirme nada: si hubiera que darle a un botón para decir que
// lo ha leído, el dato dejaría de ser fiable en una semana.

import * as db from '../db.js';
import {
  html, crudo, $, $$, fecha, NOMBRE_UNIDAD, esDeUnidad, cargando, vacio, fallo
} from '../ui.js';

const cuandoTexto = (iso) => {
  const dias = Math.round((Date.now() - new Date(iso)) / 864e5);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return 'Hace ' + dias + ' días';
  return fecha(iso.slice(0, 10));
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const yo = ctx.perfil;
  const [todos, lecturas] = await Promise.all([
    db.avisos(ctx.temporada.id),
    db.misLecturas(yo.id)
  ]);

  // Un aviso dirigido a la defensa no es asunto de un receptor.
  const lista = todos.filter(a => esDeUnidad(yo.posiciones, a.destinatarios));
  const leidos = new Set(lecturas.map(l => l.aviso_id));

  cont.innerHTML = html`
    <div id="lista" class="lista"></div>
  `;

  function pintar() {
    $('#lista').innerHTML = lista.length ? lista.map(a => html`
      <button class="fila aviso-fila ${a.prioridad === 'urgente' ? 'urgente' : ''} ${leidos.has(a.id) ? '' : 'sinleer'}"
              data-id="${a.id}" style="display:block;text-align:left">
        <div style="display:flex;align-items:baseline;gap:.6rem">
          <div class="nom" style="flex:1">
            ${a.fijado ? crudo('<span class="chincha">📌</span> ') : ''}${a.titulo}
          </div>
          ${leidos.has(a.id) ? '' : crudo('<span class="punto-nuevo"></span>')}
        </div>
        <div class="meta" style="margin-top:.2rem">
          ${cuandoTexto(a.creado_en)}
          ${a.destinatarios !== 'todos' ? ' · ' + NOMBRE_UNIDAD[a.destinatarios] : ''}
          ${a.prioridad === 'urgente' ? ' · urgente' : ''}
        </div>
        ${a.cuerpo ? crudo(html`<p class="aviso-cuerpo">${a.cuerpo}</p>`) : ''}
      </button>`).join('') : vacio('No hay ningún aviso del club por ahora.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.id;
      b.classList.toggle('abierto');
      if (leidos.has(id)) return;
      leidos.add(id);
      b.classList.remove('sinleer');
      b.querySelector('.punto-nuevo')?.remove();
      try { await db.marcarLeido(id, yo.id); } catch (e) { fallo(e); }
    }));
  }

  pintar();
}
