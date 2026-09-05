// Roster — la plantilla y la ficha de cada jugador.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, nombreCompleto, tag, TAG_JUGADOR, TAG_CUOTA,
  POSICIONES, UNIDADES, SECCIONES, SECCION, hoyISO, hoja, confirmar, avisar, fallo,
  conRespaldo, cargando, vacio, enlaceLlamada, enlaceWhatsApp
} from '../ui.js';

let filtro = 'activo';
let busqueda = '';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, cuotas] = await Promise.all([
    db.roster(),
    db.cuotasDe(ctx.temporada.id)
  ]);
  const cuotaDe = new Map(cuotas.map(c => [c.jugador_id, c]));

  cont.innerHTML = html`
    <div class="buscador">
      <input type="search" id="buscar" placeholder="Buscar por nombre, dorsal o posición" value="${busqueda}">
    </div>
    <div class="filtros" id="filtros">
      <button data-f="activo"    aria-pressed="${filtro === 'activo'}">Activos</button>
      <button data-f="todos"     aria-pressed="${filtro === 'todos'}">Todos</button>
      <button data-f="lesionado" aria-pressed="${filtro === 'lesionado'}">Lesionados</button>
      <button data-f="ataque"    aria-pressed="${filtro === 'ataque'}">Ataque</button>
      <button data-f="defensa"   aria-pressed="${filtro === 'defensa'}">Defensa</button>
      <button data-f="baja"      aria-pressed="${filtro === 'baja'}">Bajas</button>
    </div>
    <div id="resumen"></div>
    <div id="lista"></div>
    <button class="btn primario ancho" id="nuevo" style="margin-top:1rem">+ Añadir jugador</button>
  `;

  const { ataque: ATAQUE, defensa: DEFENSA } = UNIDADES;

  // Salvo el filtro de bajas, ninguno muestra a quien ya dejó el equipo.
  const FILTROS = {
    activo:    p => p.estado === 'activo',
    lesionado: p => p.estado === 'lesionado',
    baja:      p => p.estado === 'baja',
    todos:     p => p.estado !== 'baja',
    ataque:    p => p.estado !== 'baja' && p.posiciones.some(x => ATAQUE.includes(x)),
    defensa:   p => p.estado !== 'baja' && p.posiciones.some(x => DEFENSA.includes(x))
  };

  function pintar() {
    const q = busqueda.trim().toLowerCase();
    const filtrados = plantilla.filter(p => {
      if (!FILTROS[filtro](p)) return false;
      if (!q) return true;
      return (nombreCompleto(p) + ' ' + (p.apodo ?? '') + ' ' + (p.dorsal ?? '') + ' ' + p.posiciones.join(' '))
        .toLowerCase().includes(q);
    });

    // La chapa de la derecha: lo que hay que saber de un vistazo. La cuota manda
    // sobre el estado porque en un activo es lo que suele estar pendiente.
    const chapa = (p) => {
      const c = cuotaDe.get(p.id);
      return p.acceso === 'rechazado' ? crudo('<span class="tag n">Sin acceso</span>')
        : p.estado === 'activo' && c ? tag(TAG_CUOTA, c.estado)
        : tag(TAG_JUGADOR, p.estado);
    };

    const camiseta = (p) => html`
      <button class="camiseta" data-id="${p.id}">
        <span class="num ${p.dorsal == null ? 'sin' : 'd' + String(p.dorsal).length}"
              aria-hidden="true">${p.dorsal ?? '—'}</span>
        ${p.es_capitan ? crudo('<span class="galon" title="Capitán">C</span>') : ''}
        <span class="quien">
          <span class="pila">${p.nombre}</span>
          <span class="ape">${p.apellidos ?? ''}</span>
        </span>
        <span class="pie">
          <span class="pos">${p.posiciones.join(' · ') || 'Sin posición'}</span>
          ${chapa(p)}
        </span>
      </button>`;

    const vacia = vacio(q ? 'Ningún jugador coincide con la búsqueda.'
                          : 'No hay jugadores en este filtro todavía.');

    // "1 lesionados" canta. Se dice en singular cuando toca o no se dice.
    const cuantos = (estado, uno, varios) => {
      const n = plantilla.filter(p => p.estado === estado).length;
      return n ? crudo(html`<span><strong>${n}</strong> ${n === 1 ? uno : varios}</span>`) : '';
    };

    $('#resumen').innerHTML = filtrados.length ? html`
      <div class="tira-plantilla">
        ${cuantos('activo', 'activo', 'activos')}
        ${cuantos('lesionado', 'lesionado', 'lesionados')}
        ${cuantos('baja', 'baja', 'bajas')}
      </div>` : '';

    // Una sola plantilla, sin repartir por unidades: en flag la gente juega en
    // los dos lados y separarlos daba una division que no existe en el campo.
    $('#lista').innerHTML = filtrados.length
      ? html`<div class="muro">${filtrados.map(camiseta)}</div>`
      : vacia;

    $$('#lista [data-id]').forEach(b =>
      b.addEventListener('click', () => abrirFicha(ctx, b.dataset.id, () => render(ctx, cont))));
  }

  $('#buscar').addEventListener('input', (e) => { busqueda = e.target.value; pintar(); });
  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));
  $('#nuevo').addEventListener('click', () => abrirFicha(ctx, null, () => render(ctx, cont)));

  pintar();
}

// --- Ficha del jugador ----------------------------------------------------

async function abrirFicha(ctx, id, alGuardar) {
  const p = id ? await db.jugador(id) : {
    nombre: '', apellidos: '', apodo: '', dorsal: null, posiciones: [],
    email: '', telefono: '', fecha_nacimiento: null, dni: '', talla_equipacion: '',
    estado: 'activo', notas_staff: ''
  };

  const cuota = id ? await db.cuotaDe(id, ctx.temporada.id) : null;

  // Solo el admin reparte llaves, asi que solo el admin necesita saber cuales
  // tiene esta persona.
  const llaves = new Set(id && ctx.esStaff ? await conRespaldo(db.permisosDe(id), []) : []);
  const asistencia = id
    ? (await db.resumenAsistencia(ctx.temporada.id)).find(a => a.jugador_id === id)
    : null;

  const tel = p.telefono;

  const panel = hoja(id ? nombreCompleto(p) : 'Nuevo jugador', html`
    ${id && tel ? crudo(html`
      <div class="contacto">
        ${enlaceLlamada(tel) ? crudo(html`
          <a class="btn" href="${enlaceLlamada(tel)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 4h3.5l1.6 4-2 1.4a12 12 0 006.5 6.5l1.4-2 4 1.6V19a1.6 1.6 0 01-1.8 1.6C10.2 20 4 13.8 3.4 5.8A1.6 1.6 0 015 4z" stroke-linejoin="round"/>
            </svg>Llamar</a>`) : ''}
        ${enlaceWhatsApp(tel) ? crudo(html`
          <a class="btn" href="${enlaceWhatsApp(tel)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 3a9 9 0 00-7.7 13.6L3.2 21l4.5-1.1A9 9 0 1012 3z" stroke-linejoin="round"/>
            </svg>WhatsApp</a>`) : ''}
      </div>`) : ''}

    ${asistencia ? crudo(html`
      <div class="card" style="margin-bottom:1rem;display:flex;align-items:center;gap:.9rem">
        <div style="font-family:'Anton',sans-serif;font-size:1.8rem;line-height:1;color:${
          asistencia.porcentaje >= 70 ? 'var(--ok)' : asistencia.porcentaje >= 40 ? 'var(--warn)' : 'var(--bad)'}">
          ${asistencia.porcentaje ?? 0}%
        </div>
        <div class="muted" style="font-size:.88rem;line-height:1.4">
          Asistencia a entrenos<br>
          ${asistencia.presentes} de ${asistencia.computables}${asistencia.justificados ? ' · ' + asistencia.justificados + ' justificadas' : ''}
        </div>
      </div>`) : ''}

    <form id="ficha">
      <div class="dos">
        <div class="campo"><label>Nombre</label>
          <input name="nombre" required value="${p.nombre ?? ''}"></div>
        <div class="campo"><label>Apellidos</label>
          <input name="apellidos" value="${p.apellidos ?? ''}"></div>
      </div>
      <div class="dos">
        <div class="campo"><label>Apodo</label>
          <input name="apodo" value="${p.apodo ?? ''}"></div>
        <div class="campo"><label>Dorsal</label>
          <input name="dorsal" type="number" min="0" max="99" inputmode="numeric" value="${p.dorsal ?? ''}"></div>
      </div>

      <div class="campo">
        <label>Posiciones</label>
        <div class="filtros" id="pos" style="flex-wrap:wrap;overflow:visible">
          ${POSICIONES.map(x => html`
            <button type="button" data-pos="${x}" aria-pressed="${p.posiciones.includes(x)}">${x}</button>`)}
        </div>
      </div>

      <div class="dos">
        <div class="campo"><label>Email</label>
          <input name="email" type="email" value="${p.email ?? ''}">
          <p class="ayuda">Con este email enlazará su ficha cuando entre en la app.</p></div>
        <div class="campo"><label>Teléfono</label>
          <input name="telefono" type="tel" value="${p.telefono ?? ''}"></div>
      </div>

      <div class="dos">
        <div class="campo"><label>Fecha de nacimiento</label>
          <input name="fecha_nacimiento" type="date" value="${p.fecha_nacimiento ?? ''}"></div>
        <div class="campo"><label>Talla</label>
          <input name="talla_equipacion" value="${p.talla_equipacion ?? ''}" placeholder="M, L, XL…"></div>
      </div>

      <div class="campo"><label>DNI</label>
        <input name="dni" value="${p.dni ?? ''}">
        <p class="ayuda">Solo mientras la federación lo exija. Se borra al cerrar la temporada.</p></div>

      <div class="campo"><label>Estado</label>
        <select name="estado">
          ${['activo','lesionado','baja_temporal','baja'].map(e => html`
            <option value="${e}" ${p.estado === e ? crudo('selected') : ''}>${TAG_JUGADOR[e].txt}</option>`)}
        </select></div>

      <div class="check">
        <input type="checkbox" id="capitan" name="es_capitan" ${p.es_capitan ? crudo('checked') : ''}>
        <label for="capitan" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Capitán</label>
      </div>
      <p class="ayuda" style="margin:-.2rem 0 .9rem;line-height:1.6">
        Sale con una C en el roster y en la plantilla. No le da acceso a nada:
        para eso están las secciones de más abajo.
      </p>

      <div class="campo"><label>Notas del club</label>
        <textarea name="notas_staff" placeholder="Solo lo ve el staff">${p.notas_staff ?? ''}</textarea></div>

      ${cuota ? crudo(html`
        <p class="eyebrow">Cuota ${ctx.temporada.nombre}</p>
        <div class="card" style="display:flex;align-items:center;gap:.8rem">
          <div>
            <div style="font-family:'Anton',sans-serif;font-size:1.3rem">${euros(cuota.importe_pagado)}
              <span class="muted" style="font-family:'Barlow',sans-serif;font-size:.9rem">de ${euros(cuota.importe_total)}</span></div>
            <div style="margin-top:.3rem">${tag(TAG_CUOTA, cuota.estado)}</div>
          </div>
          ${ctx.puede('tesoreria') ? crudo(html`<a class="btn fantasma" href="${ctx.enlace('dinero')}" style="margin-left:auto">Gestionar</a>`) : ''}
        </div>`) : ''}

      <button type="submit" class="btn primario ancho" style="margin-top:1.2rem">Guardar</button>
      ${id ? crudo(html`<p class="ayuda" style="margin-top:.8rem">Alta el ${fecha(p.alta_en)}.</p>`) : ''}
    </form>

    ${id && ctx.esStaff && p.rol !== 'admin' ? crudo(html`
      <p class="eyebrow">Secciones que lleva<span class="cuenta">${llaves.size}</span></p>
      <p class="ayuda" style="margin:0 0 .7rem;line-height:1.6">
        Lo que le des aquí le aparece dentro de su app, en Mi ficha. Lo demás
        sigue sin verlo, y no porque se le escondan los botones: no puede.
      </p>
      <div class="lista" id="llaves">
        ${SECCIONES.map(sec => html`
          <button class="fila" data-llave="${sec.clave}" aria-pressed="${llaves.has(sec.clave)}">
            <div class="info">
              <div class="nom">${sec.nombre}</div>
              <div class="meta">${sec.pie}</div>
            </div>
            <div class="dcha">
              ${llaves.has(sec.clave) ? crudo('<span class="tag ok">Sí</span>')
                                      : crudo('<span class="tag n">No</span>')}
            </div>
          </button>`)}
      </div>`) : ''}

    ${id ? crudo(html`
      <p class="eyebrow">Acceso a la app</p>
      <div class="card">
        <p style="margin:0 0 .9rem;line-height:1.6" class="muted">
          ${p.acceso === 'rechazado'
            ? 'No puede entrar en la app. Su ficha y su histórico siguen intactos.'
            : p.user_id
              ? 'Entra en la app con su email.'
              : 'Todavía no ha entrado nunca. Entrará en cuanto use su email.'}
        </p>
        <button class="btn ${p.acceso === 'rechazado' ? '' : 'peligro'} ancho" id="acceso">
          ${p.acceso === 'rechazado' ? 'Devolverle el acceso' : 'Quitarle el acceso'}
        </button>
      </div>

      <p class="eyebrow">Zona sin vuelta atrás</p>
      <div class="card">
        <p style="margin:0 0 .9rem;line-height:1.6" class="muted">
          Para que deje el equipo, ponlo en estado <em>Baja</em>: sale del roster,
          libera su dorsal y conserva su histórico. Borrar es otra cosa: se lleva
          por delante sus pagos, su asistencia y su documentación, y descuadra la
          tesorería de la temporada.
        </p>
        <button class="btn peligro ancho" id="borrar">Borrar la ficha entera</button>
      </div>`) : ''}`);

  // Las llaves, como las posiciones: un toque y guardado, sin boton aparte.
  $$('#llaves .fila', panel).forEach(b => b.addEventListener('click', async () => {
    const clave = b.dataset.llave;
    const dar = !llaves.has(clave);
    b.disabled = true;
    try {
      if (dar) await db.darPermiso(id, clave); else await db.quitarPermiso(id, clave);
      dar ? llaves.add(clave) : llaves.delete(clave);
      b.setAttribute('aria-pressed', dar);
      b.querySelector('.dcha').innerHTML = dar
        ? '<span class="tag ok">Sí</span>' : '<span class="tag n">No</span>';
      avisar(dar ? SECCION[clave].nombre + ' concedida' : SECCION[clave].nombre + ' retirada');
    } catch (err) { fallo(err); }
    b.disabled = false;
  }));

  // Posiciones como interruptores
  const posiciones = new Set(p.posiciones);
  $$('#pos button', panel).forEach(b => b.addEventListener('click', () => {
    const x = b.dataset.pos;
    posiciones.has(x) ? posiciones.delete(x) : posiciones.add(x);
    b.setAttribute('aria-pressed', posiciones.has(x));
  }));

  $('#ficha', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = Object.fromEntries(f.entries());
    datos.dorsal = datos.dorsal === '' ? null : Number(datos.dorsal);
    datos.fecha_nacimiento = datos.fecha_nacimiento || null;
    datos.posiciones = [...posiciones];
    datos.es_capitan = f.get('es_capitan') === 'on';
    for (const k of ['apodo','email','telefono','dni','talla_equipacion',
                     'apellidos','notas_staff']) {
      if (datos[k] === '') datos[k] = null;
    }
    if (datos.estado === 'baja' && p.estado !== 'baja') datos.baja_en = hoyISO();
    if (datos.estado !== 'baja') datos.baja_en = null;

    try {
      if (id) {
        await db.guardarJugador(id, datos);
      } else {
        const nuevo = await db.crearJugador(datos);
        // El disparador de la base de datos crea la cuota; si la temporada se
        // abrió después del alta, esto la garantiza igual.
        await db.asegurarCuota(nuevo.id, ctx.temporada);
        await db.asegurarDocumentacion(nuevo.id, ctx.temporada.id);
      }
      avisar('Ficha guardada');
      panel.cerrar();
      alGuardar();
    } catch (err) {
      if (String(err.message).includes('perfiles_dorsal_activo')) {
        fallo(new Error('Ese dorsal ya lo lleva otro jugador en activo.'));
      } else if (String(err.message).includes('perfiles_email_unico')) {
        fallo(new Error('Ya hay una ficha con ese email.'));
      } else {
        fallo(err);
      }
    }
  });

  $('#acceso', panel)?.addEventListener('click', async () => {
    const quitando = p.acceso !== 'rechazado';
    if (quitando && !await confirmar('Quitarle el acceso',
      'Dejará de poder entrar en la app. No se borra nada suyo: ni pagos, ni ' +
      'asistencia, ni documentación. Puedes devolvérselo cuando quieras.',
      'Quitar acceso')) return;
    try {
      await db.cambiarAcceso(id, quitando ? 'rechazado' : 'aprobado');
      avisar(quitando ? 'Acceso retirado' : 'Acceso devuelto');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#borrar', panel)?.addEventListener('click', async () => {
    const ok = await confirmar(
      'Borrar la ficha',
      'Se borra el jugador y con él sus pagos, su asistencia y su documentación, ' +
      'sin vuelta atrás. Su cuenta de acceso NO se borra: eso se hace desde el ' +
      'panel de Supabase. Si solo quieres que no entre, quítale el acceso.',
      'Borrar del todo');
    if (!ok) return;
    try {
      await db.borrarJugador(id);
      avisar('Ficha borrada');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
