// Pasar lista — la pantalla que se usa de pie en el campo.
//
// Un toque en la fila cicla el estado y guarda al momento. Sin menús, sin
// botones pequeños y sin un "guardar" final que se olvide: se maneja con una
// mano mientras la gente calienta.

import * as db from '../db.js';
import {
  html, crudo, $, $$, cuando, hora, nombreCompleto,
  avisar, fallo, cargando, vacio
} from '../ui.js';
import { abrirEvento } from './calendario.js';

const CICLO = { null: 'presente', presente: 'ausente', ausente: 'justificado', justificado: null };

const PINTA = {
  presente:    { clase: 'ok',   txt: 'Presente' },
  ausente:     { clase: 'bad',  txt: 'Falta' },
  justificado: { clase: 'warn', txt: 'Justificado' }
};

const ETIQUETA_UNIDAD = { todos: 'Todo el equipo', ataque: 'Ataque', defensa: 'Defensa', especiales: 'Equipos especiales' };

export async function render(ctx, cont, eventoId) {
  if (!eventoId) { location.hash = '#/calendario'; return; }
  cont.innerHTML = cargando();

  const [ev, plantilla, asistencias] = await Promise.all([
    db.evento(eventoId),
    db.roster(),
    db.asistenciasDe(eventoId)
  ]);

  const convocados = plantilla.filter(p => p.estado !== 'baja');
  const estado = new Map(asistencias.map(a => [a.jugador_id, a.estado]));

  const titulo = ev.tipo === 'partido'
    ? (ev.rival ? (ev.es_local ? 'vs ' : 'en ') + ev.rival : 'Partido')
    : 'Entreno';

  cont.innerHTML = html`
    <div class="card" style="margin-bottom:.9rem">
      <div style="display:flex;align-items:flex-start;gap:.8rem">
        <div>
          <h2 style="font-size:1.4rem">${titulo}</h2>
          <p class="muted" style="margin:.35rem 0 0;font-size:.92rem">
            ${cuando(ev.fecha)}${ev.hora ? ' · ' + hora(ev.hora) : ''}${ev.lugar ? ' · ' + ev.lugar : ''}
          </p>
          <p class="muted" style="margin:.2rem 0 0;font-size:.86rem">${ETIQUETA_UNIDAD[ev.unidad]}</p>
        </div>
        <button class="btn-icono" id="editar" aria-label="Editar" style="margin-left:auto">
          <svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z" stroke-linejoin="round"/><path d="M14 6l4 4" stroke-linecap="round"/></svg>
        </button>
      </div>
      ${ev.cancelado ? crudo('<p style="margin:.8rem 0 0"><span class="tag bad">Cancelado</span></p>') : ''}
      ${ev.notas ? crudo(html`<p class="muted" style="margin:.7rem 0 0;line-height:1.5">${ev.notas}</p>`) : ''}
    </div>

    <div class="cifras" id="marcador"></div>

    <p class="eyebrow">Lista</p>
    <div id="lista" class="lista"></div>

    <button class="btn ancho" id="todos-presentes" style="margin-top:1rem">
      Marcar presentes a los que faltan por marcar
    </button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Toca una fila para cambiar entre presente, falta y justificado.
      Cada toque se guarda solo.
    </p>
  `;

  function marcador() {
    const n = (e) => convocados.filter(p => estado.get(p.id) === e).length;
    const sinMarcar = convocados.filter(p => !estado.get(p.id)).length;
    $('#marcador').innerHTML = html`
      <div class="cifra ok"><div class="n">${n('presente')}</div><div class="l">Presentes</div></div>
      <div class="cifra bad"><div class="n">${n('ausente')}</div><div class="l">Faltas</div></div>
      <div class="cifra"><div class="n">${sinMarcar}</div><div class="l">Sin marcar</div></div>`;
  }

  function pintar() {
    $('#lista').innerHTML = convocados.length ? convocados.map(p => {
      const e = estado.get(p.id) ?? null;
      const v = e ? PINTA[e] : null;
      return html`
        <button class="fila" data-id="${p.id}">
          <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
          <div class="info">
            <div class="nom">${nombreCompleto(p)}</div>
            <div class="meta">${p.posiciones.join(' · ') || 'Sin posición'}</div>
          </div>
          <div class="dcha">
            ${v ? crudo(html`<span class="tag ${v.clase}">${v.txt}</span>`)
                : crudo('<span class="tag n">Sin marcar</span>')}
          </div>
        </button>`;
    }).join('') : vacio('No hay jugadores en la plantilla todavía.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', () => ciclar(b.dataset.id)));
  }

  async function ciclar(jugadorId) {
    const actual = estado.get(jugadorId) ?? null;
    const siguiente = CICLO[actual];

    // Se pinta antes de que responda el servidor: en el campo la app tiene que
    // ir al ritmo del dedo. Si falla, se revierte y se avisa.
    if (siguiente) estado.set(jugadorId, siguiente); else estado.delete(jugadorId);
    pintar();
    marcador();

    try {
      if (siguiente) await db.marcarAsistencia(eventoId, jugadorId, siguiente, ctx.perfil.id);
      else await db.quitarAsistencia(eventoId, jugadorId);
    } catch (err) {
      if (actual) estado.set(jugadorId, actual); else estado.delete(jugadorId);
      pintar();
      marcador();
      fallo(err);
    }
  }

  $('#todos-presentes').addEventListener('click', async () => {
    const pendientes = convocados.filter(p => !estado.get(p.id));
    if (!pendientes.length) { avisar('Ya están todos marcados'); return; }
    for (const p of pendientes) estado.set(p.id, 'presente');
    pintar();
    marcador();
    try {
      for (const p of pendientes) {
        await db.marcarAsistencia(eventoId, p.id, 'presente', ctx.perfil.id);
      }
      avisar(pendientes.length + (pendientes.length === 1 ? ' marcado' : ' marcados'));
    } catch (err) { fallo(err); render(ctx, cont, eventoId); }
  });

  $('#editar').addEventListener('click', () =>
    abrirEvento(ctx, ev, () => render(ctx, cont, eventoId)));

  pintar();
  marcador();
}
