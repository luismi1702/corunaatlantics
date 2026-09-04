// Competiciones — la liga o el torneo que jugamos, y su clasificación.
//
// La clasificación se teclea. La app solo conoce nuestros partidos, así que no
// puede calcular una tabla de liga: no sabe cómo han quedado los demás equipos
// entre ellos. Lo que sí calcula es nuestro balance, a partir de los
// resultados que hayamos apuntado.

import * as db from '../db.js';
import {
  html, crudo, $, $$, fecha, hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

const TIPOS = { liga: 'Liga', torneo: 'Torneo', amistoso: 'Amistosos' };

export async function render(ctx, cont) {
  cont.innerHTML = cargando();
  const lista = await db.competiciones(ctx.temporada.id);

  cont.innerHTML = html`
    <div id="lista" class="lista"></div>
    <button class="btn primario ancho" id="nueva" style="margin-top:1rem">+ Añadir competición</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      La clasificación se copia de la federación. Vuestro balance lo calcula la
      app con los resultados que apuntes en cada partido.
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
  const [tabla, balance, agenda] = await Promise.all([
    db.clasificacion(comp.id),
    db.balanceCompeticion(comp.id),
    db.eventos(ctx.temporada.id)
  ]);

  const partidos = agenda.filter(e => e.tipo === 'partido' && e.competicion_id === comp.id);

  const panel = hoja(comp.nombre, html`
    ${balance ? crudo(html`
      <p class="eyebrow">Vuestro balance</p>
      <div class="cifras">
        <div class="cifra ok"><div class="n">${balance.ganados}</div><div class="l">Ganados</div></div>
        <div class="cifra bad"><div class="n">${balance.perdidos}</div><div class="l">Perdidos</div></div>
        <div class="cifra"><div class="n">${balance.puntos_favor}-${balance.puntos_contra}</div><div class="l">Puntos</div></div>
      </div>`) : crudo(html`
      <p class="ayuda" style="margin:0 0 1rem;line-height:1.6">
        Cuando apuntes el resultado de algún partido de esta competición, aquí
        aparecerá vuestro balance.
      </p>`)}

    <p class="eyebrow">Clasificación<span class="cuenta">${tabla.length}</span></p>
    <div class="tabla-clas">
      ${tabla.length ? tabla.map((f, i) => html`
        <button class="fila-clas ${f.es_nuestro ? 'nuestro' : ''}" data-fila="${f.id}">
          <span class="pos">${f.posicion ?? i + 1}</span>
          <span class="equipo">${f.equipo}</span>
          <span class="dato">${f.jugados}</span>
          <span class="dato">${f.ganados}</span>
          <span class="dato">${f.perdidos}</span>
          <span class="dato fuerte">${f.puntos}</span>
        </button>`) : vacio('Sin clasificación todavía. Cópiala de la federación.')}
    </div>
    ${tabla.length ? crudo(html`
      <p class="leyenda-clas"><span>Pos</span><span>Equipo</span><span>J</span><span>G</span><span>P</span><span>Pts</span></p>`) : ''}

    <button class="btn ancho" id="anadir-equipo" style="margin-top:.8rem">+ Añadir equipo a la tabla</button>

    <p class="eyebrow">Partidos${partidos.length ? crudo(html`<span class="cuenta">${partidos.length}</span>`) : ''}</p>
    <div class="lista">
      ${partidos.length ? partidos.map(e => html`
        <a class="fila" href="#/lista/${e.id}" style="text-decoration:none;color:inherit">
          <div class="info">
            <div class="nom">${e.rival ? (e.es_local ? 'vs ' : 'en ') + e.rival : 'Partido'}</div>
            <div class="meta">${fecha(e.fecha)}</div>
          </div>
          <div class="dcha">
            ${e.puntos_favor != null
              ? crudo(html`<span class="marcador ${e.puntos_favor > e.puntos_contra ? 'gana'
                  : e.puntos_favor < e.puntos_contra ? 'pierde' : ''}">${e.puntos_favor}-${e.puntos_contra}</span>`)
              : crudo('<span class="tag n">Sin jugar</span>')}
          </div>
        </a>`) : vacio('Ningún partido asignado a esta competición todavía.')}
    </div>
    <p class="ayuda" style="margin-top:.6rem;line-height:1.6">
      Los partidos se asignan a la competición desde el calendario, al crearlos
      o editarlos.
    </p>

    <div style="display:flex;gap:.6rem;margin-top:1.4rem">
      <button class="btn peligro" id="borrar">Borrar</button>
      <button class="btn primario" style="flex:1" id="editar">Editar</button>
    </div>`);

  $$('[data-fila]', panel).forEach(b => b.addEventListener('click', () => {
    panel.cerrar();
    editarFila(comp, tabla.find(f => f.id === b.dataset.fila), () => abrirCompeticion(ctx, comp, alGuardar));
  }));

  $('#anadir-equipo', panel).addEventListener('click', () => {
    panel.cerrar();
    editarFila(comp, {}, () => abrirCompeticion(ctx, comp, alGuardar));
  });

  $('#editar', panel).addEventListener('click', () => {
    panel.cerrar();
    editarCompeticion(ctx, comp, alGuardar);
  });

  $('#borrar', panel).addEventListener('click', async () => {
    if (!await confirmar('Borrar la competición',
      'Se borra con su clasificación. Los partidos se quedan, solo dejan de estar asignados.',
      'Borrar')) return;
    try {
      await db.borrarCompeticion(comp.id);
      avisar('Borrada');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Una fila de la clasificación ------------------------------------------

function editarFila(comp, fila, alGuardar) {
  const esNueva = !fila.id;

  const panel = hoja(esNueva ? 'Añadir equipo' : fila.equipo, html`
    <form id="fila">
      <div class="dos">
        <div class="campo"><label>Puesto</label>
          <input name="posicion" type="number" min="1" inputmode="numeric" value="${fila.posicion ?? ''}"></div>
        <div class="campo"><label>Equipo</label>
          <input name="equipo" required value="${fila.equipo ?? ''}"></div>
      </div>

      <div class="dos">
        <div class="campo"><label>Jugados</label>
          <input name="jugados" type="number" min="0" inputmode="numeric" value="${fila.jugados ?? 0}"></div>
        <div class="campo"><label>Puntos</label>
          <input name="puntos" type="number" min="0" inputmode="numeric" value="${fila.puntos ?? 0}"></div>
      </div>

      <div class="tres">
        <div class="campo"><label>Ganados</label>
          <input name="ganados" type="number" min="0" inputmode="numeric" value="${fila.ganados ?? 0}"></div>
        <div class="campo"><label>Empat.</label>
          <input name="empatados" type="number" min="0" inputmode="numeric" value="${fila.empatados ?? 0}"></div>
        <div class="campo"><label>Perdidos</label>
          <input name="perdidos" type="number" min="0" inputmode="numeric" value="${fila.perdidos ?? 0}"></div>
      </div>

      <div class="dos">
        <div class="campo"><label>Puntos a favor</label>
          <input name="puntos_favor" type="number" min="0" inputmode="numeric" value="${fila.puntos_favor ?? 0}"></div>
        <div class="campo"><label>En contra</label>
          <input name="puntos_contra" type="number" min="0" inputmode="numeric" value="${fila.puntos_contra ?? 0}"></div>
      </div>

      <div class="check">
        <input type="checkbox" id="nuestro" name="es_nuestro" ${fila.es_nuestro ? crudo('checked') : ''}>
        <label for="nuestro" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Somos nosotros</label>
      </div>

      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        ${!esNueva ? crudo(html`<button type="button" class="btn peligro" id="borrar-fila">Quitar</button>`) : ''}
        <button type="submit" class="btn primario" style="flex:1">Guardar</button>
      </div>
    </form>`);

  $('#fila', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const num = (k) => Number(f.get(k)) || 0;
    const datos = {
      competicion_id: comp.id,
      posicion: f.get('posicion') ? Number(f.get('posicion')) : null,
      equipo: f.get('equipo'),
      jugados: num('jugados'), ganados: num('ganados'),
      empatados: num('empatados'), perdidos: num('perdidos'),
      puntos_favor: num('puntos_favor'), puntos_contra: num('puntos_contra'),
      puntos: num('puntos'),
      es_nuestro: f.get('es_nuestro') === 'on'
    };
    try {
      if (esNueva) await db.crearFilaClasificacion(datos);
      else await db.guardarFilaClasificacion(fila.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#borrar-fila', panel)?.addEventListener('click', async () => {
    try {
      await db.borrarFilaClasificacion(fila.id);
      avisar('Quitado de la tabla');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
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
