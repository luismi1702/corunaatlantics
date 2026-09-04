// Calendario — entrenos y partidos.
//
// Los entrenos salen del horario semanal (Ajustes) y encima se pueden añadir o
// cancelar sesiones sueltas. Tocar un evento lleva a pasar lista.

import * as db from '../db.js';
import {
  html, crudo, $, $$, cuando, fecha, hora, hoyISO, diasHasta,
  hoja, avisar, fallo, cargando, vacio
} from '../ui.js';

let filtro = 'proximos';

const ETIQUETA_TIPO = { entreno: 'Entreno', partido: 'Partido', evento: 'Evento' };
const ETIQUETA_UNIDAD = { todos: '', ataque: 'Ataque', defensa: 'Defensa', especiales: 'Equipos especiales' };

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [lista, todasAsistencias] = await Promise.all([
    db.eventos(ctx.temporada.id),
    db.resumenAsistencia(ctx.temporada.id)
  ]);

  const hoy = hoyISO();
  const proximos = lista.filter(e => e.fecha >= hoy);
  const pasados = lista.filter(e => e.fecha < hoy).reverse();
  const partidos = lista.filter(e => e.tipo === 'partido');

  const FILTROS = { proximos, pasados, partidos };
  const marcados = new Set(todasAsistencias.map(a => a.jugador_id));

  cont.innerHTML = html`
    <div class="filtros" id="filtros">
      <button data-f="proximos" aria-pressed="${filtro === 'proximos'}">Próximos</button>
      <button data-f="pasados"  aria-pressed="${filtro === 'pasados'}">Pasados</button>
      <button data-f="partidos" aria-pressed="${filtro === 'partidos'}">Partidos</button>
    </div>

    <div id="lista" class="lista"></div>

    <div style="display:flex;gap:.6rem;margin-top:1rem">
      <button class="btn primario" id="nuevo-entreno" style="flex:1">+ Entreno</button>
      <button class="btn oro" id="nuevo-partido" style="flex:1">+ Partido</button>
    </div>

    ${lista.length === 0 ? crudo(html`
      <div class="card" style="margin-top:1rem">
        <p style="margin:0 0 .8rem;line-height:1.6" class="muted">
          El calendario está vacío. Si entrenáis siempre los mismos días, define el
          horario en Ajustes y la app crea los entrenos sola.
        </p>
        ${ctx.esStaff ? crudo(html`<a class="btn ancho" href="#/ajustes">Definir el horario</a>`) : ''}
      </div>`) : ''}
  `;

  function pintar() {
    const items = FILTROS[filtro];
    $('#lista').innerHTML = items.length ? items.map(e => {
      const dias = diasHasta(e.fecha);
      return html`
        <a class="fila" href="${ctx.enlace('lista')}/${e.id}" style="text-decoration:none;color:inherit">
          <div class="dorsal ${e.tipo === 'partido' ? 'partido' : ''}" style="flex-basis:52px">
            <span style="font-size:.72rem;line-height:1.1;text-align:center">
              ${cuando(e.fecha).slice(0, 3).toUpperCase()}<br>${e.fecha.slice(8)}
            </span>
          </div>
          <div class="info">
            <div class="nom">
              ${e.tipo === 'partido' ? (e.rival ? (e.es_local ? 'vs ' : 'en ') + e.rival : 'Partido') : ETIQUETA_TIPO[e.tipo]}
              ${e.unidad !== 'todos' ? ' · ' + ETIQUETA_UNIDAD[e.unidad] : ''}
            </div>
            <div class="meta">
              ${cuando(e.fecha)}${e.hora ? ' · ' + hora(e.hora) : ''}${e.lugar ? ' · ' + e.lugar : ''}
            </div>
          </div>
          <div class="dcha">
            ${e.cancelado ? crudo('<span class="tag bad">Cancelado</span>')
              : marcados.size && dias <= 0 && e.tipo === 'entreno'
                ? crudo('<span class="tag n">Lista</span>')
                : ''}
          </div>
        </a>`;
    }).join('') : vacio(
      filtro === 'proximos' ? 'No hay nada programado por delante.'
      : filtro === 'partidos' ? 'Todavía no hay partidos en el calendario.'
      : 'No hay eventos pasados.');
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $('#nuevo-entreno').addEventListener('click', () =>
    abrirEvento(ctx, { tipo: 'entreno' }, () => render(ctx, cont)));
  $('#nuevo-partido').addEventListener('click', () =>
    abrirEvento(ctx, { tipo: 'partido' }, () => render(ctx, cont)));

  pintar();
}

// --- Alta y edición de un evento ------------------------------------------

export async function abrirEvento(ctx, e, alGuardar) {
  const esNuevo = !e.id;
  const tipo = e.tipo;
  const comps = tipo === 'partido'
    ? await db.competiciones(ctx.temporada.id).catch(() => [])
    : [];

  const panel = hoja(
    esNuevo ? (tipo === 'partido' ? 'Nuevo partido' : 'Nuevo entreno') : 'Editar',
    html`
    <form id="ev">
      <div class="dos">
        <div class="campo"><label>Fecha</label>
          <input type="date" name="fecha" value="${e.fecha ?? hoyISO()}" required></div>
        <div class="campo"><label>Hora</label>
          <input type="time" name="hora" value="${e.hora ? hora(e.hora) : '20:30'}"></div>
      </div>

      ${tipo === 'partido' ? crudo(html`
        <div class="campo"><label>Rival</label>
          <input name="rival" value="${e.rival ?? ''}" placeholder="Nombre del equipo"></div>
        ${comps.length ? crudo(html`
          <div class="campo"><label>Competición</label>
            <select name="competicion_id">
              <option value="">Sin competición</option>
              ${comps.map(c => html`
                <option value="${c.id}" ${e.competicion_id === c.id ? crudo('selected') : ''}>${c.nombre}</option>`)}
            </select></div>`) : ''}

        <div class="campo"><label>Dónde</label>
          <select name="es_local">
            <option value="true" ${e.es_local !== false ? crudo('selected') : ''}>En casa</option>
            <option value="false" ${e.es_local === false ? crudo('selected') : ''}>Fuera</option>
          </select></div>`) : ''}

      <div class="campo"><label>Lugar</label>
        <input name="lugar" value="${e.lugar ?? ''}" placeholder="Campo de…"></div>

      <div class="campo"><label>Unidad convocada</label>
        <select name="unidad">
          ${['todos','ataque','defensa','especiales'].map(u => html`
            <option value="${u}" ${(e.unidad ?? 'todos') === u ? crudo('selected') : ''}>
              ${u === 'todos' ? 'Todo el equipo' : ETIQUETA_UNIDAD[u]}</option>`)}
        </select></div>

      <div class="campo"><label>Notas</label>
        <textarea name="notas">${e.notas ?? ''}</textarea></div>

      ${!esNuevo ? crudo(html`
        <div class="check">
          <input type="checkbox" id="cancelado" name="cancelado" ${e.cancelado ? crudo('checked') : ''}>
          <label for="cancelado" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
            Cancelado</label>
        </div>
        <p class="ayuda">Cancelar no borra la sesión ni la asistencia ya apuntada,
           y deja de contar para los porcentajes.</p>`) : ''}

      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        ${!esNuevo ? crudo(html`<button type="button" class="btn peligro" id="borrar">Borrar</button>`) : ''}
        <button type="submit" class="btn primario" style="flex:1">Guardar</button>
      </div>
    </form>`);

  $('#ev', panel).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const datos = {
      temporada_id: ctx.temporada.id,
      tipo,
      fecha: f.get('fecha'),
      hora: f.get('hora') || null,
      lugar: f.get('lugar') || null,
      unidad: f.get('unidad'),
      notas: f.get('notas') || null,
      cancelado: f.get('cancelado') === 'on'
    };
    if (tipo === 'partido') {
      datos.rival = f.get('rival') || null;
      datos.es_local = f.get('es_local') === 'true';
      datos.competicion_id = f.get('competicion_id') || null;
    }
    try {
      if (esNuevo) await db.crearEvento({ ...datos, creado_por: ctx.perfil.id });
      else await db.guardarEvento(e.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#borrar', panel)?.addEventListener('click', async () => {
    try {
      await db.borrarEvento(e.id);
      avisar('Evento borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
