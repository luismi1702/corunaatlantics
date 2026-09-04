// Documentación — licencia, seguro, reconocimiento médico y DNI de la plantilla.
//
// Se ordena por lo que falta, no alfabéticamente: la lista se abre para saber
// a quién hay que perseguir, no para consultar a alguien concreto.

import * as db from '../db.js';
import { DIAS_AVISO_CADUCIDAD } from '../config.js';
import {
  html, crudo, $, $$, fecha, diasHasta, nombreCompleto, tag, TAG_DOC,
  hoja, avisar, fallo, cargando, vacio
} from '../ui.js';

let filtro = 'falta';

const DOCS = [
  { clave: 'licencia',       etiqueta: 'Licencia' },
  { clave: 'seguro',         etiqueta: 'Seguro' },
  { clave: 'reconocimiento', etiqueta: 'Reconocimiento médico' }
];

// Un documento cuenta como resuelto solo si está validado y no caduca ya.
function estadoReal(doc, clave) {
  const estado = doc[clave + '_estado'];
  const dias = diasHasta(doc[clave + '_caduca_en']);
  if (dias !== null && dias < 0) return 'caducado';
  return estado;
}

const claseSemaforo = (estado, dias) =>
  estado === 'caducado' || estado === 'pendiente' ? 'bad'
  : estado === 'entregado' ? 'warn'
  : (dias !== null && dias <= DIAS_AVISO_CADUCIDAD) ? 'warn'
  : 'ok';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, docs] = await Promise.all([
    db.roster(),
    db.documentacionDe(ctx.temporada.id)
  ]);

  const porId = new Map(plantilla.map(p => [p.id, p]));
  const filas = docs
    .filter(d => porId.get(d.jugador_id) && porId.get(d.jugador_id).estado !== 'baja')
    .map(d => {
      const pendientes = DOCS.filter(x => estadoReal(d, x.clave) !== 'validado').length
        + (d.dni_entregado ? 0 : 1);
      return { doc: d, jugador: porId.get(d.jugador_id), pendientes };
    });

  const FILTROS = {
    falta:    f => f.pendientes > 0,
    completos:f => f.pendientes === 0,
    caducan:  f => DOCS.some(x => {
      const dias = diasHasta(f.doc[x.clave + '_caduca_en']);
      return dias !== null && dias <= DIAS_AVISO_CADUCIDAD;
    }),
    todos:    () => true
  };

  cont.innerHTML = html`
    <div class="cifras">
      <div class="cifra ok"><div class="n">${filas.filter(f => f.pendientes === 0).length}</div><div class="l">Completos</div></div>
      <div class="cifra bad"><div class="n">${filas.filter(f => f.pendientes > 0).length}</div><div class="l">Les falta algo</div></div>
      <div class="cifra gold"><div class="n">${filas.filter(FILTROS.caducan).length}</div><div class="l">Caducan</div></div>
    </div>

    <div class="filtros" id="filtros" style="margin-top:1rem">
      <button data-f="falta"     aria-pressed="${filtro === 'falta'}">Falta algo</button>
      <button data-f="caducan"   aria-pressed="${filtro === 'caducan'}">Caducan pronto</button>
      <button data-f="completos" aria-pressed="${filtro === 'completos'}">Completos</button>
      <button data-f="todos"     aria-pressed="${filtro === 'todos'}">Todos</button>
    </div>

    <div id="lista" class="lista"></div>

    <button class="btn ancho" id="csv" style="margin-top:1rem">Exportar a CSV</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem">
      Abre en Excel. Es el formato que suele pedir la federación.
    </p>
  `;

  function pintar() {
    const lista = filas.filter(FILTROS[filtro]).sort((a, b) => b.pendientes - a.pendientes);

    $('#lista').innerHTML = lista.length ? lista.map(f => html`
      <button class="fila" data-id="${f.doc.id}">
        <div class="dorsal ${f.jugador.dorsal == null ? 'sin' : ''}">${f.jugador.dorsal ?? '—'}</div>
        <div class="info">
          <div class="nom">${nombreCompleto(f.jugador)}</div>
          <div class="meta">${f.pendientes === 0 ? 'Todo en regla'
            : DOCS.filter(x => estadoReal(f.doc, x.clave) !== 'validado').map(x => x.etiqueta).join(', ')
              + (f.doc.dni_entregado ? '' : (f.pendientes > 1 ? ', DNI' : 'DNI'))}</div>
        </div>
        <div class="dcha">
          <div class="puntos">
            ${DOCS.map(x => {
              const e = estadoReal(f.doc, x.clave);
              return html`<span class="punto ${claseSemaforo(e, diasHasta(f.doc[x.clave + '_caduca_en']))}"
                title="${x.etiqueta}"></span>`;
            })}
            <span class="punto ${f.doc.dni_entregado ? 'ok' : 'bad'}" title="DNI"></span>
          </div>
        </div>
      </button>`).join('') : vacio(
        filtro === 'falta' ? 'Nadie tiene papeleo pendiente.' : 'No hay nadie en este filtro.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', () => {
      const f = filas.find(x => x.doc.id === b.dataset.id);
      abrirDoc(f, () => render(ctx, cont));
    }));
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $('#csv').addEventListener('click', () => exportarCSV(ctx, filas));

  pintar();
}

// --- Ficha de documentación -----------------------------------------------

async function abrirDoc(f, alGuardar) {
  const d = f.doc;

  const panel = hoja(nombreCompleto(f.jugador), html`
    <form id="doc">
      ${DOCS.map(x => html`
        <p class="eyebrow">${x.etiqueta}</p>
        <div class="dos">
          <div class="campo"><label>Estado</label>
            <select name="${x.clave}_estado">
              ${['pendiente','entregado','validado','caducado'].map(e => html`
                <option value="${e}" ${d[x.clave + '_estado'] === e ? crudo('selected') : ''}>${TAG_DOC[e].txt}</option>`)}
            </select></div>
          <div class="campo"><label>Caduca</label>
            <input type="date" name="${x.clave}_caduca_en" value="${d[x.clave + '_caduca_en'] ?? ''}"></div>
        </div>`)}

      <p class="eyebrow">Entregado al club</p>
      <div class="check">
        <input type="checkbox" id="dni" name="dni_entregado" ${d.dni_entregado ? crudo('checked') : ''}>
        <label for="dni" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">Copia del DNI</label>
      </div>
      <div class="check">
        <input type="checkbox" id="foto" name="foto_entregada" ${d.foto_entregada ? crudo('checked') : ''}>
        <label for="foto" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">Foto de carnet</label>
      </div>

      <div class="campo" style="margin-top:1rem"><label>Notas</label>
        <textarea name="notas_staff">${d.notas_staff ?? ''}</textarea></div>

      <button class="btn primario ancho" type="submit">Guardar</button>
      <p class="ayuda" style="margin-top:.8rem">Última modificación: ${fecha(d.actualizado_en?.slice(0, 10))}</p>
    </form>`);

  $('#doc', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const cambios = { dni_entregado: fd.get('dni_entregado') === 'on',
                      foto_entregada: fd.get('foto_entregada') === 'on',
                      notas_staff: fd.get('notas_staff') || null };
    for (const x of DOCS) {
      cambios[x.clave + '_estado'] = fd.get(x.clave + '_estado');
      cambios[x.clave + '_caduca_en'] = fd.get(x.clave + '_caduca_en') || null;
    }
    try {
      await db.guardarDocumentacion(d.id, cambios);
      avisar('Documentación actualizada');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Exportación ----------------------------------------------------------

function exportarCSV(ctx, filas) {
  const cabecera = ['Dorsal','Nombre','Apellidos','DNI','Fecha nacimiento','Email','Teléfono',
                    'Licencia','Licencia caduca','Seguro','Seguro caduca',
                    'Reconocimiento','Reconocimiento caduca','DNI entregado','Foto entregada'];

  const celda = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const lineas = filas.map(f => [
    f.jugador.dorsal, f.jugador.nombre, f.jugador.apellidos, f.jugador.dni,
    f.jugador.fecha_nacimiento, f.jugador.email, f.jugador.telefono,
    f.doc.licencia_estado, f.doc.licencia_caduca_en,
    f.doc.seguro_estado, f.doc.seguro_caduca_en,
    f.doc.reconocimiento_estado, f.doc.reconocimiento_caduca_en,
    f.doc.dni_entregado ? 'Sí' : 'No', f.doc.foto_entregada ? 'Sí' : 'No'
  ].map(celda).join(';'));

  // Punto y coma y BOM: es lo que abre bien en el Excel en español sin tener
  // que pelearse con el asistente de importación.
  const csv = '﻿' + [cabecera.join(';'), ...lineas].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `atlantics-documentacion-${ctx.temporada.nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  avisar('CSV descargado');
}
