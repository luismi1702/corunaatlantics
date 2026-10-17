// Pasar lista — la pantalla que se usa de pie en el campo.
//
// Un toque en la fila cicla el estado y guarda al momento. Sin menús, sin
// botones pequeños y sin un "guardar" final que se olvide: se maneja con una
// mano mientras la gente calienta.

import * as db from '../db.js';
import {
  html, crudo, $, $$, cuando, hora, hoyISO, nombreCompleto, esDeUnidad,
  hoja, confirmar, avisar, contarEnvio, fallo, cargando, vacio, TIPOS_EVENTO, claseEvento
} from '../ui.js';
import { abrirEvento } from './calendario.js';
import { render as renderDisponibilidad } from './disponibilidad.js';
import { abrirEstadisticas } from './stats-partido.js';

const CICLO = { null: 'presente', presente: 'ausente', ausente: 'justificado', justificado: null };

const PINTA = {
  presente:    { clase: 'ok',   txt: 'Presente' },
  ausente:     { clase: 'bad',  txt: 'Falta' },
  justificado: { clase: 'warn', txt: 'Justificado' }
};

// Lo que ha contestado cada jugador en su agenda. No es la lista: la lista la
// pasa el staff en el campo; esto es lo que dijeron antes.
const RESPUESTA = {
  voy:    { clase: 'ok',   txt: 'Va',     grupo: 'Van' },
  duda:   { clase: 'warn', txt: 'Duda',   grupo: 'En duda' },
  no_voy: { clase: 'bad',  txt: 'No va',  grupo: 'No van' }
};

const corto = (p) => p.apodo || [p.nombre, p.apellidos?.[0] && p.apellidos[0] + '.'].filter(Boolean).join(' ');

const ETIQUETA_UNIDAD = { todos: 'Todo el equipo', ataque: 'Ataque', defensa: 'Defensa', especiales: 'Equipos especiales' };

export async function render(ctx, cont, eventoId) {
  if (!eventoId) { location.hash = ctx.enlace('calendario'); return; }
  cont.innerHTML = cargando();

  let ev, plantilla, asistencias;
  try {
    [ev, plantilla, asistencias] = await Promise.all([
      db.evento(eventoId),
      db.plantillaClub(),
      db.asistenciasDe(eventoId)
    ]);
  } catch (err) {
    // El evento puede no estar: lo acabas de borrar, o lo borro otro mientras
    // tenias la pantalla abierta. Sin esto la consulta lanza y el "cargando" se
    // queda para siempre, porque aqui no llega el try del enrutador.
    console.error(err);
    avisar('Ese evento ya no existe.', 'error');
    location.hash = ctx.enlace('calendario');
    return;
  }

  const convocados = plantilla.filter(p => p.estado !== 'baja');
  const estado = new Map(asistencias.map(a => [a.jugador_id, a.estado]));

  // Lo que ha contestado cada uno, de los llamados a esta sesion.
  const respuesta = new Map(asistencias.filter(a => a.confirmacion).map(a => [a.jugador_id, a.confirmacion]));
  const llamados = convocados.filter(p => esDeUnidad(p.posiciones, ev.unidad));
  const grupos = {
    voy:    llamados.filter(p => respuesta.get(p.id) === 'voy'),
    duda:   llamados.filter(p => respuesta.get(p.id) === 'duda'),
    no_voy: llamados.filter(p => respuesta.get(p.id) === 'no_voy'),
    nada:   llamados.filter(p => !respuesta.has(p.id))
  };

  // Reclamar respuesta solo tiene sentido antes de que pase y si sigue en pie.
  const sinResponder = !ev.cancelado && ev.fecha >= hoyISO() ? grupos.nada : [];

  const titulo = ev.tipo === 'partido'
    ? (ev.rival ? (ev.es_local ? 'vs ' : 'en ') + ev.rival : 'Partido')
    : TIPOS_EVENTO[claseEvento(ev)].etiqueta;

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

    ${ev.tipo === 'partido' ? crudo(html`
      <form class="card marcador-form" id="resultado">
        <div class="campo" style="margin:0">
          <label>Nosotros</label>
          <input name="puntos_favor" type="number" min="0" inputmode="numeric"
                 value="${ev.puntos_favor ?? ''}" placeholder="—">
        </div>
        <span class="guion">–</span>
        <div class="campo" style="margin:0">
          <label>${ev.rival || 'Rival'}</label>
          <input name="puntos_contra" type="number" min="0" inputmode="numeric"
                 value="${ev.puntos_contra ?? ''}" placeholder="—">
        </div>
        <button class="btn primario" type="submit">Guardar</button>
      </form>
      <div style="display:flex;gap:.6rem;margin-top:.7rem">
        <button class="btn" style="flex:1" id="quien-juega">¿Quién puede jugar?</button>
        <button class="btn" style="flex:1" id="stats">Estadísticas</button>
      </div>`) : ''}

    ${sinResponder.length ? crudo(html`
      <button class="btn oro ancho" id="reclamar-respuesta" style="margin-bottom:.9rem">
        Avisar a ${sinResponder.length === 1 ? 'quien no ha' : 'los ' + sinResponder.length + ' que no han'} respondido
      </button>`) : ''}

    ${llamados.length ? crudo(html`
      <p class="eyebrow" style="margin-top:.4rem">Quién viene</p>
      <div class="cifras cuatro">
        <div class="cifra ok"><div class="n">${grupos.voy.length}</div><div class="l">Van</div></div>
        <div class="cifra gold"><div class="n">${grupos.duda.length}</div><div class="l">Duda</div></div>
        <div class="cifra bad"><div class="n">${grupos.no_voy.length}</div><div class="l">No van</div></div>
        <div class="cifra"><div class="n">${grupos.nada.length}</div><div class="l">Sin responder</div></div>
      </div>
      <div class="card quien-viene">
        ${[['voy', RESPUESTA.voy.grupo, 'ok'], ['duda', RESPUESTA.duda.grupo, 'warn'],
           ['no_voy', RESPUESTA.no_voy.grupo, 'bad'], ['nada', 'Sin responder', 'n']]
          .filter(([k]) => grupos[k].length)
          .map(([k, titulo, clase]) => html`
            <p><span class="tag ${clase}">${titulo}</span> ${grupos[k].map(corto).join(', ')}</p>`)}
      </div>`) : ''}

    <p class="eyebrow">Lista</p>
    <div class="cifras" id="marcador"></div>
    <div id="lista" class="lista" style="margin-top:.7rem"></div>

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
      const r = RESPUESTA[respuesta.get(p.id)];
      return html`
        <button class="fila" data-id="${p.id}">
          <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
          <div class="info">
            <div class="nom">${nombreCompleto(p)}</div>
            <div class="meta">${p.posiciones.join(' · ') || 'Sin posición'}
              · ${r ? crudo(html`<span class="dijo ${r.clase}">${r.txt}</span>`) : 'Sin responder'}</div>
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
    abrirEvento(ctx, ev,
      () => render(ctx, cont, eventoId),
      () => { location.hash = ctx.enlace('calendario'); }));

  $('#resultado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const num = (k) => f.get(k) === '' ? null : Number(f.get(k));
    try {
      const guardado = await db.guardarEvento(eventoId,
        { puntos_favor: num('puntos_favor'), puntos_contra: num('puntos_contra') });
      // Si el partido es de una competición, el resultado también es de la tabla.
      await db.sincronizarPartidoDeEvento(guardado);
      avisar('Resultado guardado');
      render(ctx, cont, eventoId);
    } catch (err) { fallo(err); }
  });

  $('#reclamar-respuesta')?.addEventListener('click', async () => {
    if (!await confirmar('Avisar al móvil',
      'Le suena solo a ' + sinResponder.length +
      (sinResponder.length === 1 ? ' persona' : ' personas') +
      ': las convocadas que todavía no han dicho si vienen.', 'Avisar')) return;
    try {
      const r = await db.avisarAlMovil(
        '¿Vienes? · ' + titulo,
        [cuando(ev.fecha), hora(ev.hora), ev.lugar].filter(Boolean).join(' · ') +
          '. Dinos si vas en la app.',
        '/app/#/agenda',
        sinResponder.map(p => p.id));
      contarEnvio(r, sinResponder.length);
    } catch (err) { fallo(err); }
  });

  $('#stats')?.addEventListener('click', () => abrirEstadisticas(ev, convocados));

  // La pregunta "¿quien puede jugar?" surge mirando un partido, no navegando
  // por un menu: su sitio es este.
  $('#quien-juega')?.addEventListener('click', () => {
    const panel = hoja('¿Quién puede jugar?', '<div id="apto"></div>');
    renderDisponibilidad(ctx, $('#apto', panel));
  });

  pintar();
  marcador();
}
