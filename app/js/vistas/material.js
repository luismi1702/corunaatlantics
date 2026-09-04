// Material — el inventario del club y quién tiene cada cosa.
//
// La lista se abre para dos preguntas: "¿queda algún casco libre?" y "¿quién
// tiene el 14?". Todo lo demás es secundario.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, nombreCompleto,
  hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

let filtro = 'todo';

const TIPOS = {
  casco:      'Cascos',
  hombreras:  'Hombreras',
  jersey:     'Jerseys',
  pantalon:   'Pantalones',
  balon:      'Balones',
  otro:       'Otros'
};

const ESTADOS = { nuevo: 'Nuevo', bueno: 'Bueno', usado: 'Usado', retirado: 'Retirado' };

const CLASE_ESTADO = { nuevo: 'ok', bueno: 'ok', usado: 'warn', retirado: 'n' };

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [piezas, plantilla] = await Promise.all([db.material(), db.roster()]);
  const porId = new Map(plantilla.map(p => [p.id, p]));

  const prestadas = piezas.filter(m => m.jugador_id);
  const perdidas = prestadas.filter(m => porId.get(m.jugador_id)?.estado === 'baja');
  const valor = piezas.reduce((s, m) => s + Number(m.coste || 0), 0);

  const FILTROS = {
    todo:     () => true,
    libre:    m => !m.jugador_id && m.estado !== 'retirado',
    prestado: m => !!m.jugador_id
  };

  cont.innerHTML = html`
    <div class="cifras">
      <div class="cifra"><div class="n">${piezas.length}</div><div class="l">Piezas</div></div>
      <div class="cifra gold"><div class="n">${prestadas.length}</div><div class="l">Prestadas</div></div>
      <div class="cifra ${perdidas.length ? 'bad' : ''}"><div class="n">${perdidas.length}</div><div class="l">En bajas</div></div>
    </div>

    ${perdidas.length ? crudo(html`
      <p class="otra-unidad" style="margin:1rem 0 0">
        ${perdidas.length === 1 ? 'Una pieza está' : perdidas.length + ' piezas están'}
        en manos de gente que ya no está en el equipo. Es lo primero que hay que reclamar.
      </p>`) : ''}

    <div class="filtros" id="filtros" style="margin-top:1rem">
      <button data-f="todo"     aria-pressed="${filtro === 'todo'}">Todo</button>
      <button data-f="libre"    aria-pressed="${filtro === 'libre'}">Libre</button>
      <button data-f="prestado" aria-pressed="${filtro === 'prestado'}">Prestado</button>
    </div>

    <div id="lista"></div>

    <button class="btn primario ancho" id="nueva" style="margin-top:1rem">+ Añadir material</button>
    ${valor ? crudo(html`<p class="ayuda" style="text-align:center;margin-top:.6rem">
      Valor de compra del inventario: ${euros(valor)}</p>`) : ''}
  `;

  function pintar() {
    const items = piezas.filter(FILTROS[filtro]);

    $('#lista').innerHTML = items.length ? Object.keys(TIPOS).map(tipo => {
      const grupo = items.filter(m => m.tipo === tipo);
      if (!grupo.length) return '';
      return html`
        <p class="eyebrow">${TIPOS[tipo]}<span class="cuenta">${grupo.length}</span></p>
        <div class="lista">
          ${grupo.map(m => {
            const quien = m.jugador_id ? porId.get(m.jugador_id) : null;
            const enBaja = quien && quien.estado === 'baja';
            return html`
              <button class="fila" data-id="${m.id}">
                <div class="info">
                  <div class="nom">${m.identificador}${m.talla ? ' · ' + m.talla : ''}</div>
                  <div class="meta">
                    ${quien ? (enBaja ? '⚠ ' : '') + nombreCompleto(quien) : 'Libre'}
                    ${m.entregado_en ? ' · desde ' + fecha(m.entregado_en) : ''}
                  </div>
                </div>
                <div class="dcha">
                  ${enBaja ? crudo('<span class="tag bad">Reclamar</span>')
                    : quien ? crudo('<span class="tag warn">Prestado</span>')
                    : crudo(html`<span class="tag ${CLASE_ESTADO[m.estado]}">${ESTADOS[m.estado]}</span>`)}
                </div>
              </button>`;
          })}
        </div>`;
    }).join('') : vacio(filtro === 'libre' ? 'No queda nada libre.' : 'No hay material apuntado todavía.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
      abrirPieza(ctx, piezas.find(m => m.id === b.dataset.id), plantilla, () => render(ctx, cont))));
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $('#nueva').addEventListener('click', () => editarPieza(ctx, {}, () => render(ctx, cont)));

  pintar();
}

// --- Una pieza ------------------------------------------------------------

function abrirPieza(ctx, m, plantilla, alGuardar) {
  const quien = m.jugador_id ? plantilla.find(p => p.id === m.jugador_id) : null;
  const disponibles = plantilla.filter(p => p.estado !== 'baja');

  const panel = hoja(m.identificador, html`
    <div class="lista">
      <div class="fila">
        <div class="info">
          <div class="meta">Estado</div>
          <div class="nom">${ESTADOS[m.estado]}${m.talla ? ' · talla ' + m.talla : ''}</div>
        </div>
      </div>
      <div class="fila">
        <div class="info">
          <div class="meta">Ahora lo tiene</div>
          <div class="nom">${quien ? nombreCompleto(quien) : 'Nadie, está libre'}</div>
        </div>
      </div>
      ${m.coste ? crudo(html`
        <div class="fila">
          <div class="info">
            <div class="meta">Costó</div>
            <div class="nom">${euros(m.coste)}${m.fecha_compra ? ' · ' + fecha(m.fecha_compra) : ''}</div>
          </div>
        </div>`) : ''}
    </div>

    ${quien ? crudo(html`
      <p class="eyebrow">Devolución</p>
      <form id="devolver">
        <div class="campo"><label>¿Cómo vuelve?</label>
          <select name="estado_devolucion">
            ${Object.entries(ESTADOS).map(([v, t]) => html`
              <option value="${v}" ${m.estado === v ? crudo('selected') : ''}>${t}</option>`)}
          </select></div>
        <button class="btn primario ancho" type="submit">Marcar como devuelto</button>
      </form>`) : crudo(html`
      <p class="eyebrow">Entregar</p>
      <form id="entregar">
        <div class="campo"><label>¿A quién?</label>
          <select name="jugador_id" required>
            <option value="">Elige un jugador</option>
            ${disponibles.map(p => html`
              <option value="${p.id}">${p.dorsal != null ? p.dorsal + ' · ' : ''}${nombreCompleto(p)}</option>`)}
          </select></div>
        <div class="campo"><label>Fianza</label>
          <input type="number" name="fianza" step="0.01" min="0" placeholder="Opcional"></div>
        <button class="btn primario ancho" type="submit">Entregar</button>
      </form>`)}

    <div style="display:flex;gap:.6rem;margin-top:1.4rem">
      <button class="btn peligro" id="borrar">Borrar</button>
      <button class="btn" style="flex:1" id="editar">Editar</button>
    </div>`);

  $('#entregar', panel)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await db.entregarMaterial({
        material_id: m.id,
        jugador_id: f.get('jugador_id'),
        estado_entrega: m.estado,
        fianza: f.get('fianza') ? Number(f.get('fianza')) : null,
        registrado_por: ctx.perfil.id
      });
      avisar('Entregado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#devolver', panel)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const estado = new FormData(e.target).get('estado_devolucion');
    try {
      await db.devolverMaterial(m.prestamo_id, { estado_devolucion: estado });
      await db.guardarMaterial(m.id, { estado });
      avisar('Devuelto');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#editar', panel).addEventListener('click', () => {
    panel.cerrar();
    editarPieza(ctx, m, alGuardar);
  });

  $('#borrar', panel).addEventListener('click', async () => {
    if (!await confirmar('Borrar la pieza',
      'Desaparece del inventario junto con su historial de préstamos.', 'Borrar')) return;
    try {
      await db.borrarMaterial(m.id);
      avisar('Borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Alta y edición -------------------------------------------------------

function editarPieza(ctx, m, alGuardar) {
  const esNuevo = !m.id;

  const panel = hoja(esNuevo ? 'Nuevo material' : 'Editar', html`
    <form id="pieza">
      <div class="dos">
        <div class="campo"><label>Tipo</label>
          <select name="tipo">
            ${Object.entries(TIPOS).map(([v, t]) => html`
              <option value="${v}" ${m.tipo === v ? crudo('selected') : ''}>${t}</option>`)}
          </select></div>
        <div class="campo"><label>Talla</label>
          <input name="talla" value="${m.talla ?? ''}" placeholder="M, L…"></div>
      </div>

      <div class="campo"><label>Identificador</label>
        <input name="identificador" required value="${m.identificador ?? ''}"
               placeholder="Casco 14">
        <p class="ayuda">Como esté marcado en la pieza, para reconocerla sin dudar.</p></div>

      <div class="campo"><label>Estado</label>
        <select name="estado">
          ${Object.entries(ESTADOS).map(([v, t]) => html`
            <option value="${v}" ${(m.estado ?? 'bueno') === v ? crudo('selected') : ''}>${t}</option>`)}
        </select></div>

      <div class="dos">
        <div class="campo"><label>Costó</label>
          <input type="number" name="coste" step="0.01" min="0" value="${m.coste ?? ''}"></div>
        <div class="campo"><label>Comprado el</label>
          <input type="date" name="fecha_compra" value="${m.fecha_compra ?? ''}"></div>
      </div>

      <div class="campo"><label>Notas</label>
        <textarea name="notas">${m.notas ?? ''}</textarea></div>

      <button class="btn primario ancho" type="submit">Guardar</button>
    </form>`);

  $('#pieza', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      tipo: f.get('tipo'),
      identificador: f.get('identificador'),
      talla: f.get('talla') || null,
      estado: f.get('estado'),
      coste: f.get('coste') ? Number(f.get('coste')) : null,
      fecha_compra: f.get('fecha_compra') || null,
      notas: f.get('notas') || null
    };
    try {
      if (esNuevo) await db.crearMaterial(datos);
      else await db.guardarMaterial(m.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
