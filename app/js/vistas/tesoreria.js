// Tesorería — ingresos, gastos y saldo de la temporada.
//
// Las cuotas cobradas entran solas desde la pantalla de Cuotas y no se pueden
// apuntar aquí a mano: si se pudiera, el mismo dinero acabaría contado dos
// veces y el saldo dejaría de servir para nada.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, hoyISO,
  hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

let filtro = 'todos';

// Categorías sugeridas. Es texto libre en la base de datos: si el club necesita
// una nueva, se escribe y ya, sin migración.
const CATEGORIAS = {
  gasto: ['arbitrajes', 'campo', 'material', 'equipacion', 'federacion',
          'seguros', 'desplazamientos', 'medico', 'gestoria', 'otros'],
  ingreso: ['patrocinio', 'subvencion', 'merchandising', 'taquilla',
            'evento', 'donacion', 'otros']
};

const ETIQUETAS = {
  arbitrajes: 'Arbitrajes', campo: 'Campo', material: 'Material',
  equipacion: 'Equipación', federacion: 'Federación', seguros: 'Seguros',
  desplazamientos: 'Desplazamientos', medico: 'Médico', gestoria: 'Gestoría',
  patrocinio: 'Patrocinio', subvencion: 'Subvención', merchandising: 'Merchandising',
  taquilla: 'Taquilla', evento: 'Evento', donacion: 'Donación', otros: 'Otros'
};

const etiqueta = (c) => ETIQUETAS[c] ?? c;

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [resumen, movimientos] = await Promise.all([
    db.resumenTesoreria(ctx.temporada.id),
    db.movimientosDe(ctx.temporada.id)
  ]);

  const saldo = Number(resumen?.saldo ?? 0);

  // Desglose de gastos por categoría, de mayor a menor: es la lectura que
  // contesta "¿en qué se nos va el dinero?".
  const porCategoria = {};
  for (const m of movimientos) {
    const clave = m.tipo + '|' + m.categoria;
    porCategoria[clave] = (porCategoria[clave] ?? 0) + Number(m.importe);
  }
  const gastos = Object.entries(porCategoria)
    .filter(([k]) => k.startsWith('gasto|'))
    .map(([k, v]) => ({ categoria: k.split('|')[1], total: v }))
    .sort((a, b) => b.total - a.total);
  const mayorGasto = gastos[0]?.total ?? 0;

  const FILTROS = {
    todos:    () => true,
    ingresos: m => m.tipo === 'ingreso',
    gastos:   m => m.tipo === 'gasto'
  };

  cont.innerHTML = html`
    <div class="card" style="text-align:center">
      <div style="font-family:'Anton',sans-serif;font-size:2.4rem;line-height:1;color:${
        saldo < 0 ? 'var(--bad)' : 'var(--ok)'}">${euros(saldo)}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem;color:var(--muted);margin-top:.4rem">
        Saldo · ${ctx.temporada.nombre}
      </div>
      ${saldo < 0 ? crudo(html`<p style="margin:.8rem 0 0;color:var(--bad);font-size:.9rem">
        El club está gastando más de lo que ingresa esta temporada.</p>`) : ''}
    </div>

    <div class="cifras" style="margin-top:.7rem">
      <div class="cifra ok"><div class="n">${euros(resumen?.ingresos_total)}</div><div class="l">Ingresos</div></div>
      <div class="cifra bad"><div class="n">${euros(resumen?.gastos_total)}</div><div class="l">Gastos</div></div>
      <div class="cifra"><div class="n">${movimientos.length}</div><div class="l">Movimientos</div></div>
    </div>

    <p class="eyebrow">De dónde viene el dinero</p>
    <div class="lista">
      <div class="fila">
        <div class="info">
          <div class="nom">Cuotas de jugadores</div>
          <div class="meta">Se calcula solo desde los pagos registrados</div>
        </div>
        <div class="dcha"><div class="importe" style="color:var(--ok)">${euros(resumen?.ingresos_cuotas)}</div></div>
      </div>
      <div class="fila">
        <div class="info">
          <div class="nom">Otros ingresos</div>
          <div class="meta">Patrocinios, subvenciones, eventos…</div>
        </div>
        <div class="dcha"><div class="importe" style="color:var(--ok)">${euros(resumen?.ingresos_otros)}</div></div>
      </div>
    </div>

    ${gastos.length ? crudo(html`
      <p class="eyebrow">En qué se va</p>
      <div class="lista">
        ${gastos.map(g => html`
          <div class="fila" style="display:block">
            <div style="display:flex;align-items:baseline;gap:.8rem">
              <div class="nom" style="font-family:'Barlow Condensed',sans-serif;font-weight:600">${etiqueta(g.categoria)}</div>
              <div class="importe" style="margin-left:auto">${euros(g.total)}</div>
            </div>
            <div style="height:6px;border-radius:3px;background:var(--line);margin-top:.5rem;overflow:hidden">
              <div style="height:100%;width:${Math.round(g.total / mayorGasto * 100)}%;background:var(--gold)"></div>
            </div>
          </div>`)}
      </div>`) : ''}

    <p class="eyebrow">Movimientos</p>
    <div class="filtros" id="filtros">
      <button data-f="todos"    aria-pressed="${filtro === 'todos'}">Todos</button>
      <button data-f="ingresos" aria-pressed="${filtro === 'ingresos'}">Ingresos</button>
      <button data-f="gastos"   aria-pressed="${filtro === 'gastos'}">Gastos</button>
    </div>
    <div id="lista" class="lista"></div>

    <div style="display:flex;gap:.6rem;margin-top:1rem">
      <button class="btn primario" id="nuevo-ingreso" style="flex:1">+ Ingreso</button>
      <button class="btn oro" id="nuevo-gasto" style="flex:1">+ Gasto</button>
    </div>
    <button class="btn ancho" id="csv" style="margin-top:.6rem">Exportar a CSV</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Las cuotas no se apuntan aquí: entran solas desde la pantalla de Cuotas.
      Apuntarlas otra vez contaría el mismo dinero dos veces.
    </p>
  `;

  function pintar() {
    const lista = movimientos.filter(FILTROS[filtro]);
    $('#lista').innerHTML = lista.length ? lista.map(m => html`
      <button class="fila" data-id="${m.id}">
        <div class="info">
          <div class="nom">${m.concepto}</div>
          <div class="meta">${fecha(m.fecha)} · ${etiqueta(m.categoria)}${m.metodo ? ' · ' + m.metodo : ''}</div>
        </div>
        <div class="dcha">
          <div class="importe" style="color:${m.tipo === 'ingreso' ? 'var(--ok)' : 'var(--bad)'}">
            ${m.tipo === 'ingreso' ? '+' : '−'}${euros(m.importe)}
          </div>
        </div>
      </button>`).join('') : vacio('No hay movimientos apuntados todavía.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
      abrirMovimiento(ctx, movimientos.find(m => m.id === b.dataset.id), () => render(ctx, cont))));
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $('#nuevo-ingreso').addEventListener('click', () =>
    abrirMovimiento(ctx, { tipo: 'ingreso' }, () => render(ctx, cont)));
  $('#nuevo-gasto').addEventListener('click', () =>
    abrirMovimiento(ctx, { tipo: 'gasto' }, () => render(ctx, cont)));
  $('#csv').addEventListener('click', () => exportarCSV(ctx, movimientos, resumen));

  pintar();
}

// --- Ficha del movimiento -------------------------------------------------

function abrirMovimiento(ctx, m, alGuardar) {
  const esNuevo = !m.id;
  const tipo = m.tipo;

  const panel = hoja(
    esNuevo ? (tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto') : m.concepto,
    html`
    <form id="mov">
      <div class="campo"><label>Concepto</label>
        <input name="concepto" required value="${m.concepto ?? ''}"
               placeholder="${tipo === 'ingreso' ? 'Patrocinio bar X' : 'Arbitrajes jornada 3'}"></div>

      <div class="dos">
        <div class="campo"><label>Importe</label>
          <input name="importe" type="number" step="0.01" min="0.01" inputmode="decimal"
                 value="${m.importe ?? ''}" required></div>
        <div class="campo"><label>Fecha</label>
          <input name="fecha" type="date" value="${m.fecha ?? hoyISO()}" required></div>
      </div>

      <div class="dos">
        <div class="campo"><label>Categoría</label>
          <select name="categoria">
            ${CATEGORIAS[tipo].map(c => html`
              <option value="${c}" ${m.categoria === c ? crudo('selected') : ''}>${etiqueta(c)}</option>`)}
          </select></div>
        <div class="campo"><label>Método</label>
          <select name="metodo">
            <option value="">Sin especificar</option>
            ${['bizum','transferencia','efectivo','otro'].map(x => html`
              <option value="${x}" ${m.metodo === x ? crudo('selected') : ''}>${x}</option>`)}
          </select></div>
      </div>

      <div class="campo"><label>Justificante</label>
        <input name="justificante_url" type="url" value="${m.justificante_url ?? ''}"
               placeholder="https://…">
        <p class="ayuda">Enlace a la factura o el recibo, si lo tienes guardado en algún sitio.</p></div>

      <div class="campo"><label>Nota</label>
        <textarea name="nota">${m.nota ?? ''}</textarea></div>

      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        ${!esNuevo ? crudo(html`<button type="button" class="btn peligro" id="borrar">Borrar</button>`) : ''}
        <button type="submit" class="btn primario" style="flex:1">Guardar</button>
      </div>
    </form>`);

  $('#mov', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      temporada_id: ctx.temporada.id,
      tipo,
      concepto: f.get('concepto'),
      categoria: f.get('categoria'),
      importe: Number(f.get('importe')),
      fecha: f.get('fecha'),
      metodo: f.get('metodo') || null,
      justificante_url: f.get('justificante_url') || null,
      nota: f.get('nota') || null
    };
    try {
      if (esNuevo) {
        await db.registrarMovimiento({ ...datos, registrado_por: ctx.perfil.id });
      } else {
        await db.guardarMovimiento(m.id, datos);
      }
      avisar('Movimiento guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#borrar', panel)?.addEventListener('click', async () => {
    if (!await confirmar('Borrar el movimiento', 'Se descuenta del saldo y no se puede deshacer.', 'Borrar')) return;
    try {
      await db.borrarMovimiento(m.id);
      avisar('Movimiento borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Exportación ----------------------------------------------------------

function exportarCSV(ctx, movimientos, resumen) {
  const celda = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const filas = [
    ['Fecha','Tipo','Categoría','Concepto','Importe','Método','Justificante','Nota'].join(';'),
    ...movimientos.map(m => [
      m.fecha, m.tipo, etiqueta(m.categoria), m.concepto,
      String(m.importe).replace('.', ','), m.metodo, m.justificante_url, m.nota
    ].map(celda).join(';')),
    '',
    ['', '', '', 'Cuotas cobradas', String(resumen?.ingresos_cuotas ?? 0).replace('.', ',')].join(';'),
    ['', '', '', 'Otros ingresos',  String(resumen?.ingresos_otros ?? 0).replace('.', ',')].join(';'),
    ['', '', '', 'Gastos',          String(resumen?.gastos_total ?? 0).replace('.', ',')].join(';'),
    ['', '', '', 'Saldo',           String(resumen?.saldo ?? 0).replace('.', ',')].join(';')
  ];

  const csv = '﻿' + filas.join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `atlantics-tesoreria-${ctx.temporada.nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  avisar('CSV descargado');
}
