// Documentación — la licencia, el documento de identidad y la foto de cada uno.
//
// Se ordena por lo que falta, no alfabéticamente: la lista se abre para saber
// a quién hay que perseguir, no para consultar a alguien concreto.
//
// El documento y la foto los sube cada jugador desde su ficha. Cuentan como
// entregados si están subidos o si alguien marcó que llegaron por otro lado.
// Desde aquí se bajan todos en un ZIP para la federación y se borran después.

import * as db from '../db.js';
import { DIAS_AVISO_CADUCIDAD } from '../config.js';
import { crearZip } from '../zip.js';
import {
  ARCHIVOS, TIPOS_DOCUMENTO, rutaDe, subidosPorJugador, documentoCompleto,
  llevaDorso, pintarSubidas
} from './identidad.js';
import {
  html, crudo, $, $$, fecha, diasHasta, nombreCompleto, TAG_DOC,
  hoja, confirmar, avisar, fallo, cargando, vacio, descargarCSV
} from '../ui.js';

let filtro = 'falta';

// El club no pide seguro ni reconocimiento medico, asi que no estan: eran dos
// casillas que nadie iba a rellenar y que salian en pendiente para todo el
// mundo. Un semaforo que siempre esta en rojo deja de mirarse.
const DOCS = [
  { clave: 'licencia', etiqueta: 'Licencia' }
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

  const [plantilla, docs, subidos] = await Promise.all([
    db.roster(),
    db.documentacionDe(ctx.temporada.id),
    subidosPorJugador()
  ]);

  const porId = new Map(plantilla.map(p => [p.id, p]));
  const filas = docs
    .filter(d => porId.get(d.jugador_id) && porId.get(d.jugador_id).estado !== 'baja')
    .map(d => {
      const jugador = porId.get(d.jugador_id);
      const suyos = subidos.get(d.jugador_id) ?? new Set();
      const identidad = d.dni_entregado || documentoCompleto(jugador.documento_tipo, suyos);
      const foto = d.foto_entregada || suyos.has('foto');
      const faltan = [
        ...DOCS.filter(x => estadoReal(d, x.clave) !== 'validado').map(x => x.etiqueta),
        ...(identidad ? [] : ['Documento']),
        ...(foto ? [] : ['Foto'])
      ];
      return { doc: d, jugador, suyos, identidad, foto, faltan, pendientes: faltan.length };
    });
  const conArchivos = filas.filter(f => f.suyos.size);

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

    <p class="eyebrow">Documentos subidos</p>
    <button class="btn primario ancho" id="zip" ${conArchivos.length ? '' : crudo('disabled')}>
      Descargar todo en un ZIP (${conArchivos.length} ${conArchivos.length === 1 ? 'persona' : 'personas'})</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem">
      Cada archivo lleva el dorsal y el nombre. Va con una lista en CSV.
    </p>
    <button class="btn fantasma ancho" id="borrar-todo" style="margin-top:.8rem"
            ${conArchivos.length ? '' : crudo('disabled')}>Borrar todos los documentos subidos</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem">
      Cuando la federación ya los tenga. Son datos personales: mejor no guardarlos
      más de lo necesario.
    </p>
  `;

  function pintar() {
    const lista = filas.filter(FILTROS[filtro]).sort((a, b) => b.pendientes - a.pendientes);

    $('#lista').innerHTML = lista.length ? lista.map(f => html`
      <button class="fila" data-id="${f.doc.id}">
        <div class="dorsal ${f.jugador.dorsal == null ? 'sin' : ''}">${f.jugador.dorsal ?? '—'}</div>
        <div class="info">
          <div class="nom">${nombreCompleto(f.jugador)}</div>
          <div class="meta">${f.pendientes === 0 ? 'Todo en regla' : 'Falta: ' + f.faltan.join(', ')}</div>
        </div>
        <div class="dcha">
          <div class="puntos">
            ${DOCS.map(x => {
              const e = estadoReal(f.doc, x.clave);
              return html`<span class="punto ${claseSemaforo(e, diasHasta(f.doc[x.clave + '_caduca_en']))}"
                title="${x.etiqueta}"></span>`;
            })}
            <span class="punto ${f.identidad ? 'ok' : 'bad'}" title="Documento"></span>
            <span class="punto ${f.foto ? 'ok' : 'bad'}" title="Foto"></span>
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
  $('#zip').addEventListener('click', (e) => descargarZip(ctx, conArchivos, e.currentTarget));
  $('#borrar-todo').addEventListener('click', async () => {
    const rutas = conArchivos.flatMap(f => [...f.suyos].map(c => rutaDe(f.jugador.id, c)));
    if (!await confirmar('Borrar los documentos',
      'Se borran ' + rutas.length + ' imágenes de ' + conArchivos.length +
      ' personas. Descárgalas antes si aún no lo has hecho. No se pueden recuperar.',
      'Borrar')) return;
    try {
      await db.borrarIdentidad(rutas);
      avisar('Documentos borrados');
      render(ctx, cont);
    } catch (err) { fallo(err); }
  });

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

      <p class="eyebrow">Documento de identidad</p>
      <p class="muted" style="margin:0 0 .6rem">
        ${TIPOS_DOCUMENTO[f.jugador.documento_tipo] ?? 'Documento'} ·
        ${f.jugador.dni ?? 'sin número'}</p>
      <div id="subidas-staff"></div>
      <p class="ayuda" style="margin:.5rem 0 1rem">Toca una casilla para subirla o cambiarla
        si te la han mandado por otro lado.</p>

      <p class="eyebrow">Entregado aparte</p>
      <div class="check">
        <input type="checkbox" id="dni" name="dni_entregado" ${d.dni_entregado ? crudo('checked') : ''}>
        <label for="dni" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">Copia del documento, en papel</label>
      </div>
      <div class="check">
        <input type="checkbox" id="foto" name="foto_entregada" ${d.foto_entregada ? crudo('checked') : ''}>
        <label for="foto" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">Foto de carnet, en papel</label>
      </div>

      <div class="campo" style="margin-top:1rem"><label>Notas</label>
        <textarea name="notas_staff">${d.notas_staff ?? ''}</textarea></div>

      <button class="btn primario ancho" type="submit">Guardar</button>
      <p class="ayuda" style="margin-top:.8rem">Última modificación: ${fecha(d.actualizado_en?.slice(0, 10))}</p>
    </form>`, { alCerrar: () => { if (cambiado) alGuardar(); } });

  // Lo que se sube desde aquí se ve en la lista al cerrar la hoja.
  let cambiado = false;
  pintarSubidas($('#subidas-staff', panel), {
    jugadorId: f.jugador.id, tipo: f.jugador.documento_tipo ?? 'dni',
    alCambiar: () => { cambiado = true; }
  });

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
      cambiado = false;
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Exportación ----------------------------------------------------------

const CABECERA_CSV = ['Dorsal','Nombre','Apellidos','Documento','Número','Fecha nacimiento',
  'Email','Teléfono','Licencia','Licencia caduca','Documento entregado','Foto entregada'];

const filaCSV = (f) => [
  f.jugador.dorsal, f.jugador.nombre, f.jugador.apellidos,
  TIPOS_DOCUMENTO[f.jugador.documento_tipo] ?? '', f.jugador.dni,
  f.jugador.fecha_nacimiento, f.jugador.email, f.jugador.telefono,
  f.doc.licencia_estado, f.doc.licencia_caduca_en,
  f.identidad ? 'Sí' : 'No', f.foto ? 'Sí' : 'No'
];

function exportarCSV(ctx, filas) {
  descargarCSV('atlantics-documentacion-' + ctx.temporada.nombre,
    [CABECERA_CSV, ...filas.map(filaCSV)]);
}

// Sin tildes ni espacios: el nombre tiene que sobrevivir a cualquier correo,
// portal o Windows por el que pase.
const limpio = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function descargarZip(ctx, filas, boton) {
  const texto = boton.textContent;
  boton.disabled = true;
  try {
    const archivos = [];
    let hechos = 0;
    for (const f of filas) {
      const base = [f.jugador.dorsal ?? 'sd', limpio(f.jugador.apellidos), limpio(f.jugador.nombre)]
        .filter(Boolean).join('_');
      for (const a of ARCHIVOS) {
        if (!f.suyos.has(a.clave)) continue;
        if (a.clave === 'documento_dorso' && !llevaDorso(f.jugador.documento_tipo)) continue;
        boton.textContent = 'Bajando ' + (++hechos) + '…';
        archivos.push({ nombre: `${base}_${a.corto}.jpg`,
                        datos: await db.bajarIdentidad(rutaDe(f.jugador.id, a.clave)) });
      }
    }

    const celda = (v) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    archivos.push({ nombre: 'jugadores.csv', datos: '﻿' +
      [CABECERA_CSV, ...filas.map(filaCSV)].map(r => r.map(celda).join(';')).join('\r\n') });

    const zip = await crearZip(archivos);
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlantics-documentos-' + limpio(ctx.temporada.nombre) + '.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    avisar('ZIP descargado');
  } catch (err) {
    fallo(err);
  } finally {
    boton.textContent = texto;
    boton.disabled = false;
  }
}
