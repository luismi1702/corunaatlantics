// Liga — la competición, sus equipos, sus partidos y la tabla.
//
// La clasificación no se teclea: se calcula. Metiendo todos los partidos de la
// jornada —los nuestros y los de los demás entre ellos— la tabla sale sola y no
// puede quedarse vieja ni contradecir a los resultados.
//
// Y nuestros partidos no se escriben dos veces: al apuntar uno en el que
// jugamos, se crea solo en el calendario. Ahí es donde se pasa lista y se meten
// las estadísticas de cada jugador.

import * as db from '../db.js';
import {
  html, crudo, $, $$, cuando, hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';
import { abrirEstadisticas } from './stats-partido.js';

const TIPOS = { liga: 'Liga', torneo: 'Torneo', amistoso: 'Amistosos' };

export async function render(ctx, cont) {
  cont.innerHTML = cargando();
  const lista = await db.competiciones(ctx.temporada.id);

  cont.innerHTML = html`
    <div id="lista" class="lista"></div>
    <button class="btn primario ancho" id="nueva" style="margin-top:1rem">+ Añadir competición</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Metes los equipos y luego los partidos. La clasificación la calcula la app.
    </p>
  `;

  $('#lista').innerHTML = lista.length ? lista.map(c => html`
    <button class="fila" data-id="${c.id}">
      <div class="info">
        <div class="nom">${c.nombre}</div>
        <div class="meta">${TIPOS[c.tipo]}${c.activa ? '' : ' · terminada'}</div>
      </div>
      <div class="dcha">${c.activa ? crudo('<span class="tag ok">En curso</span>') : ''}</div>
    </button>`).join('') : vacio('Todavía no has añadido ninguna competición.');

  $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
    abrirCompeticion(ctx, lista.find(c => c.id === b.dataset.id), () => render(ctx, cont))));

  $('#nueva').addEventListener('click', () => editarCompeticion(ctx, {}, () => render(ctx, cont)));
}

// --- Una competición ------------------------------------------------------

async function abrirCompeticion(ctx, comp, alGuardar) {
  const [equipos, partidos, tabla] = await Promise.all([
    db.equiposDe(comp.id),
    db.partidosDe(comp.id),
    db.clasificacion(comp.id)
  ]);

  const nombreDe = (id) => {
    const e = equipos.find(x => x.id === id);
    return e ? e.nombre : '—';
  };
  const nuestro = equipos.find(e => e.es_nuestro);
  const esNuestro = (p) => !!nuestro &&
    (p.local_id === nuestro.id || p.visitante_id === nuestro.id);
  const jugado = (p) => p.puntos_local != null && p.puntos_visitante != null;

  const nuestraFila = tabla.find(f => f.es_nuestro);

  // Sin equipos no hay nada que hacer: ni partidos ni tabla. Así que la
  // pantalla empieza pidiendo justo eso y no enseña cajas vacías.
  const arrancando = equipos.length < 2;

  const panel = hoja(comp.nombre, html`
    ${nuestraFila && nuestraFila.jugados ? crudo(html`
      <div class="cifras">
        <div class="cifra ok"><div class="n">${nuestraFila.ganados}</div><div class="l">Ganados</div></div>
        <div class="cifra bad"><div class="n">${nuestraFila.perdidos}</div><div class="l">Perdidos</div></div>
        <div class="cifra"><div class="n">${nuestraFila.puntos_favor}-${nuestraFila.puntos_contra}</div><div class="l">Puntos</div></div>
      </div>`) : ''}

    <p class="eyebrow">Equipos<span class="cuenta">${equipos.length}</span></p>
    <div class="lista">
      ${equipos.length ? equipos.map(e => html`
        <button class="fila" data-equipo="${e.id}">
          <div class="info">
            <div class="nom">${e.nombre}</div>
            ${e.es_nuestro ? crudo('<div class="meta">Nosotros</div>') : ''}
          </div>
          <div class="dcha">${e.es_nuestro ? crudo('<span class="tag ok">Atlantics</span>') : ''}</div>
        </button>`) : vacio('Empieza metiendo los equipos que juegan la competición.')}
    </div>
    <button class="btn ancho" id="anadir-equipo" style="margin-top:.8rem">+ Añadir equipo</button>

    ${arrancando ? '' : crudo(html`
      <p class="eyebrow">Partidos<span class="cuenta">${partidos.length}</span></p>
      <div class="lista">
        ${partidos.length ? partidos.map(p => html`
          <button class="fila ${esNuestro(p) ? 'destacada' : ''}" data-partido="${p.id}">
            <div class="info">
              <div class="nom">${nombreDe(p.local_id)} — ${nombreDe(p.visitante_id)}</div>
              <div class="meta">
                ${p.jornada ? 'J' + p.jornada + ' · ' : ''}${p.fecha ? cuando(p.fecha) : 'Sin fecha'}
              </div>
            </div>
            <div class="dcha">
              ${jugado(p)
                ? crudo(html`<span class="marcador">${p.puntos_local}-${p.puntos_visitante}</span>`)
                : crudo('<span class="tag n">Sin jugar</span>')}
            </div>
          </button>`) : vacio('Ningún partido apuntado todavía.')}
      </div>
      <button class="btn ancho" id="anadir-partido" style="margin-top:.8rem">+ Añadir partido</button>

      <p class="eyebrow">Clasificación</p>
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
        : vacio('La tabla saldrá sola en cuanto apuntes algún resultado.')}`)}

    ${nuestro ? crudo(html`
      <p class="ayuda" style="margin-top:.9rem;line-height:1.6">
        Vuestros partidos aparecen solos en el calendario. Desde ahí se pasa
        lista y se meten las estadísticas de cada jugador.
      </p>`) : ''}

    <div style="display:flex;gap:.6rem;margin-top:1.4rem">
      <button class="btn peligro" id="borrar">Borrar</button>
      <button class="btn primario" style="flex:1" id="editar">Editar</button>
    </div>`);

  const recargar = () => abrirCompeticion(ctx, comp, alGuardar);

  $$('[data-equipo]', panel).forEach(b => b.addEventListener('click', () => {
    panel.cerrar();
    editarEquipo(comp, equipos.find(e => e.id === b.dataset.equipo), equipos, recargar);
  }));

  $('#anadir-equipo', panel).addEventListener('click', () => {
    panel.cerrar();
    editarEquipo(comp, {}, equipos, recargar);
  });

  $$('[data-partido]', panel).forEach(b => b.addEventListener('click', () => {
    panel.cerrar();
    editarPartido(ctx, comp, partidos.find(p => p.id === b.dataset.partido), equipos, recargar);
  }));

  $('#anadir-partido', panel)?.addEventListener('click', () => {
    panel.cerrar();
    editarPartido(ctx, comp, {}, equipos, recargar);
  });

  $('#editar', panel).addEventListener('click', () => {
    panel.cerrar();
    editarCompeticion(ctx, comp, alGuardar);
  });

  $('#borrar', panel).addEventListener('click', async () => {
    if (!await confirmar('Borrar la competición',
      'Se borra con sus equipos y sus partidos. Los partidos que ya estén en el calendario se quedan, con su asistencia y sus estadísticas.',
      'Borrar')) return;
    try {
      await db.borrarCompeticion(comp.id);
      avisar('Borrada');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Un equipo -------------------------------------------------------------

function editarEquipo(comp, equipo, equipos, alGuardar) {
  const esNuevo = !equipo.id;
  // Solo puede haber unos Atlantics: si ya está marcado otro, no se ofrece.
  const otroNuestro = equipos.find(e => e.es_nuestro && e.id !== equipo.id);

  const panel = hoja(esNuevo ? 'Añadir equipo' : equipo.nombre, html`
    <form id="equipo">
      <div class="campo"><label>Nombre</label>
        <input name="nombre" required value="${equipo.nombre ?? ''}"
               placeholder="Vigo Marines"></div>

      ${otroNuestro ? crudo(html`
        <p class="ayuda" style="margin:0 0 1rem;line-height:1.6">
          En esta competición ya sois <strong>${otroNuestro.nombre}</strong>.
        </p>`) : crudo(html`
        <div class="check">
          <input type="checkbox" id="nuestro" name="es_nuestro" ${equipo.es_nuestro ? crudo('checked') : ''}>
          <label for="nuestro" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
            Somos nosotros</label>
        </div>`)}

      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        ${!esNuevo ? crudo(html`<button type="button" class="btn peligro" id="borrar-equipo">Quitar</button>`) : ''}
        <button type="submit" class="btn primario" style="flex:1">Guardar</button>
      </div>
    </form>`);

  $('#equipo', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      competicion_id: comp.id,
      nombre: f.get('nombre').trim(),
      es_nuestro: otroNuestro ? false : f.get('es_nuestro') === 'on'
    };
    try {
      if (esNuevo) await db.crearEquipoCompeticion(datos);
      else await db.guardarEquipoCompeticion(equipo.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#borrar-equipo', panel)?.addEventListener('click', async () => {
    if (!await confirmar('Quitar el equipo',
      'Se van con él sus partidos de esta competición.', 'Quitar')) return;
    try {
      await db.borrarEquipoCompeticion(equipo.id);
      avisar('Quitado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Un partido ------------------------------------------------------------

function editarPartido(ctx, comp, partido, equipos, alGuardar) {
  const esNuevo = !partido.id;
  const nuestro = equipos.find(e => e.es_nuestro);

  const opciones = (sel) => equipos.map(e => html`
    <option value="${e.id}" ${sel === e.id ? crudo('selected') : ''}>${e.nombre}</option>`);

  const panel = hoja(esNuevo ? 'Añadir partido' : 'Partido', html`
    <form id="partido">
      <div class="campo"><label>Local</label>
        <select name="local_id" required>
          <option value="">Elegir…</option>
          ${opciones(partido.local_id ?? (nuestro ? nuestro.id : ''))}
        </select></div>

      <div class="campo"><label>Visitante</label>
        <select name="visitante_id" required>
          <option value="">Elegir…</option>
          ${opciones(partido.visitante_id)}
        </select></div>

      <div class="campo"><label>Fecha</label>
        <input name="fecha" type="date" required value="${partido.fecha ?? ''}"></div>

      <div class="dos">
        <div class="campo"><label>Hora</label>
          <input name="hora" type="time" value="${(partido.hora ?? '').slice(0, 5)}"></div>
        <div class="campo"><label>Jornada</label>
          <input name="jornada" type="number" min="1" inputmode="numeric" value="${partido.jornada ?? ''}"></div>
      </div>

      <div class="campo"><label>Campo</label>
        <input name="lugar" value="${partido.lugar ?? ''}" placeholder="Elviña"></div>

      <p class="eyebrow">Resultado</p>
      <p class="ayuda" style="margin:0 0 .7rem;line-height:1.6">
        Déjalo en blanco si aún no se ha jugado. En cuanto lo pongas, cuenta
        para la clasificación.
      </p>
      <div class="dos">
        <div class="campo"><label>Local</label>
          <input name="puntos_local" type="number" min="0" inputmode="numeric"
                 value="${partido.puntos_local ?? ''}"></div>
        <div class="campo"><label>Visitante</label>
          <input name="puntos_visitante" type="number" min="0" inputmode="numeric"
                 value="${partido.puntos_visitante ?? ''}"></div>
      </div>

      ${partido.evento_id ? crudo(html`
        <button type="button" class="btn ancho" id="stats" style="margin-top:.4rem">
          Estadísticas de los jugadores
        </button>`) : ''}

      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        ${!esNuevo ? crudo(html`<button type="button" class="btn peligro" id="borrar-partido">Borrar</button>`) : ''}
        <button type="submit" class="btn primario" style="flex:1">Guardar</button>
      </div>
    </form>`);

  $('#stats', panel)?.addEventListener('click', () => numerosDelPartido(partido.evento_id));

  $('#partido', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const cifra = (k) => f.get(k) === '' ? null : Number(f.get(k));

    if (f.get('local_id') === f.get('visitante_id')) {
      return fallo('Un equipo no puede jugar contra sí mismo.');
    }

    const datos = {
      competicion_id: comp.id,
      local_id: f.get('local_id'),
      visitante_id: f.get('visitante_id'),
      fecha: f.get('fecha'),
      hora: f.get('hora') || null,
      jornada: cifra('jornada'),
      lugar: f.get('lugar') || null,
      puntos_local: cifra('puntos_local'),
      puntos_visitante: cifra('puntos_visitante')
    };

    try {
      const guardado = esNuevo
        ? await db.crearPartidoCompeticion(datos)
        : await db.guardarPartidoCompeticion(partido.id, datos);

      // Si jugamos nosotros, el partido baja al calendario con su marcador.
      const eventoId = await db.sincronizarEventoDePartido(guardado,
        { temporadaId: ctx.temporada.id, equipos });

      avisar(eventoId && esNuevo ? 'Guardado y añadido al calendario' : 'Guardado');
      panel.cerrar();
      alGuardar();

      // Apuntar el resultado y apuntar quién lo hizo es el mismo gesto: si el
      // partido es nuestro y acaba de tener marcador, se abren los números sin
      // pasar por el calendario. Si ya los tenía, no se estorba.
      if (eventoId && datos.puntos_local != null && datos.puntos_visitante != null) {
        const yaHay = await db.estadisticasDe(eventoId);
        if (!yaHay.length) await numerosDelPartido(eventoId);
      }
    } catch (err) { fallo(err); }
  });

  $('#borrar-partido', panel)?.addEventListener('click', async () => {
    const conEvento = !!partido.evento_id;
    if (!await confirmar('Borrar el partido',
      conEvento ? 'Se borra también del calendario, con su lista y sus estadísticas.'
                : 'Deja de contar para la clasificación.', 'Borrar')) return;
    try {
      await db.borrarPartidoCompeticion(partido.id);
      if (conEvento) await db.borrarEvento(partido.evento_id);
      avisar('Borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// Los numeros del partido: la plantilla, sin las bajas, sobre su evento.
async function numerosDelPartido(eventoId) {
  try {
    const [ev, plantilla] = await Promise.all([db.evento(eventoId), db.roster()]);
    await abrirEstadisticas(ev, plantilla.filter(p => p.estado !== 'baja'));
  } catch (err) { fallo(err); }
}

// --- Alta y edición de la competición --------------------------------------

function editarCompeticion(ctx, comp, alGuardar) {
  const esNueva = !comp.id;

  const panel = hoja(esNueva ? 'Nueva competición' : 'Editar', html`
    <form id="comp">
      <div class="campo"><label>Nombre</label>
        <input name="nombre" required value="${comp.nombre ?? ''}"
               placeholder="Liga Gallega Flag 2026-27"></div>

      <div class="campo"><label>Tipo</label>
        <select name="tipo">
          ${Object.entries(TIPOS).map(([v, t]) => html`
            <option value="${v}" ${(comp.tipo ?? 'liga') === v ? crudo('selected') : ''}>${t}</option>`)}
        </select></div>

      <div class="dos">
        <div class="campo"><label>Puntos por victoria</label>
          <input name="puntos_victoria" type="number" min="0" inputmode="numeric"
                 value="${comp.puntos_victoria ?? 3}"></div>
        <div class="campo"><label>Por empate</label>
          <input name="puntos_empate" type="number" min="0" inputmode="numeric"
                 value="${comp.puntos_empate ?? 1}"></div>
      </div>

      <div class="campo"><label>Notas</label>
        <textarea name="notas">${comp.notas ?? ''}</textarea></div>

      <div class="check">
        <input type="checkbox" id="activa" name="activa" ${comp.activa !== false ? crudo('checked') : ''}>
        <label for="activa" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          En curso</label>
      </div>

      <button class="btn primario ancho" type="submit" style="margin-top:1rem">Guardar</button>
    </form>`);

  $('#comp', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      temporada_id: ctx.temporada.id,
      nombre: f.get('nombre'),
      tipo: f.get('tipo'),
      puntos_victoria: Number(f.get('puntos_victoria')) || 0,
      puntos_empate: Number(f.get('puntos_empate')) || 0,
      notas: f.get('notas') || null,
      activa: f.get('activa') === 'on'
    };
    try {
      if (esNueva) await db.crearCompeticion(datos);
      else await db.guardarCompeticion(comp.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
