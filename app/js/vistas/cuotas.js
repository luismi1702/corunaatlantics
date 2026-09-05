// Cuotas — quién ha pagado, quién no, y registrar cobros.
//
// La app registra pagos, no los procesa: la gente sigue pagando por Bizum o
// transferencia. El objetivo aquí es que apuntar un pago cueste dos toques,
// porque si cuesta más se abandona y los números dejan de ser fiables.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, hoyISO, nombreCompleto, tag, TAG_CUOTA,
  hoja, confirmar, avisar, fallo, cargando, vacio, enlaceWhatsApp
} from '../ui.js';

let filtro = 'pendientes';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, cuotas] = await Promise.all([
    db.roster(),
    db.cuotasDe(ctx.temporada.id)
  ]);

  const porId = new Map(plantilla.map(p => [p.id, p]));
  const vivas = cuotas
    .filter(c => porId.get(c.jugador_id) && porId.get(c.jugador_id).estado !== 'baja')
    .map(c => ({ ...c, jugador: porId.get(c.jugador_id) }));

  const cobrado   = vivas.reduce((s, c) => s + Number(c.importe_pagado), 0);
  const pendiente = vivas.filter(c => !c.exento)
    .reduce((s, c) => s + Math.max(0, Number(c.importe_pendiente)), 0);
  const morosos   = vivas.filter(c => !c.exento && Number(c.importe_pendiente) > 0);

  // Cuantas cuotas estan sin abrir o a cero. Es lo que arregla el boton de
  // aplicar el importe, y sin este numero el boton parece que sobra siempre.
  const aFalta = plantilla.filter(p => p.estado !== 'baja').length -
    vivas.filter(c => c.exento || Number(c.importe_total) > 0).length;

  const FILTROS = {
    pendientes: c => !c.exento && Number(c.importe_pendiente) > 0,
    al_dia:     c => c.estado === 'al_dia',
    exentos:    c => c.exento,
    todos:      () => true
  };

  cont.innerHTML = html`
    <div class="cifras">
      <div class="cifra ok"><div class="n">${euros(cobrado)}</div><div class="l">Cobrado</div></div>
      <div class="cifra gold"><div class="n">${euros(pendiente)}</div><div class="l">Pendiente</div></div>
      <div class="cifra ${morosos.length ? 'bad' : ''}"><div class="n">${morosos.length}</div><div class="l">Sin pagar</div></div>
    </div>

    <div class="filtros" id="filtros" style="margin-top:1rem">
      <button data-f="pendientes" aria-pressed="${filtro === 'pendientes'}">Pendientes</button>
      <button data-f="al_dia"     aria-pressed="${filtro === 'al_dia'}">Al día</button>
      <button data-f="exentos"    aria-pressed="${filtro === 'exentos'}">Exentos</button>
      <button data-f="todos"      aria-pressed="${filtro === 'todos'}">Todos</button>
    </div>

    <div id="lista" class="lista"></div>

    ${aFalta ? crudo(html`
      <div class="card" style="margin-top:1rem">
        <p style="margin:0 0 .8rem;line-height:1.6" class="muted">
          ${aFalta === 1 ? 'Hay una persona sin cuota abierta' : 'Hay ' + aFalta + ' personas sin cuota abierta'}
          o con la suya a cero. Ponerlas a
          <strong>${euros(ctx.temporada.importe_cuota)}</strong>, que es el importe
          de la temporada, no toca las que ya tienen pagos, un importe propio o exención.
        </p>
        <button class="btn ancho" id="aplicar">Aplicar el importe a la plantilla</button>
      </div>`) : ''}

    ${morosos.length ? crudo(html`
      <button class="btn oro ancho" id="reclamar" style="margin-top:1rem">
        Copiar lista para reclamar
      </button>
      <p class="ayuda" style="text-align:center;margin-top:.5rem">
        Copia los nombres y lo que debe cada uno, listo para pegar en WhatsApp.
      </p>`) : ''}
  `;

  $('#aplicar')?.addEventListener('click', async () => {
    if (!await confirmar('Aplicar el importe',
      'Se abre la cuota a quien no la tenga y se pone al importe actual a quien la ' +
      'tenga a cero. Las que ya tienen pagos, un importe distinto o exención se ' +
      'quedan como están.', 'Aplicar')) return;
    try {
      await db.abrirTemporada(ctx.temporada.id);
      const n = await db.aplicarImporteCuota(ctx.temporada.id);
      avisar(n ? n + (n === 1 ? ' cuota actualizada' : ' cuotas actualizadas')
               : 'Cuotas al día');
      render(ctx, cont);
    } catch (err) { fallo(err); }
  });

  function pintar() {
    const lista = vivas.filter(FILTROS[filtro])
      .sort((a, b) => Number(b.importe_pendiente) - Number(a.importe_pendiente));

    $('#lista').innerHTML = lista.length ? lista.map(c => html`
      <button class="fila" data-id="${c.jugador_id}">
        <div class="dorsal ${c.jugador.dorsal == null ? 'sin' : ''}">${c.jugador.dorsal ?? '—'}</div>
        <div class="info">
          <div class="nom">${nombreCompleto(c.jugador)}</div>
          <div class="meta">
            ${c.exento ? 'Exento de cuota'
              : Number(c.importe_pagado) > 0
                ? 'Pagado ' + euros(c.importe_pagado) + ' de ' + euros(c.importe_total)
                : 'Sin ningún pago'}
          </div>
        </div>
        <div class="dcha">
          ${Number(c.importe_pendiente) > 0 && !c.exento
            ? crudo(html`<div class="importe" style="color:var(--goldf)">${euros(c.importe_pendiente)}</div>`)
            : tag(TAG_CUOTA, c.estado)}
        </div>
      </button>`).join('') : vacio(
        filtro === 'pendientes' ? 'Nadie debe nada. Disfrútalo.' : 'No hay nadie en este filtro.');

    $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
      abrirCuota(ctx, b.dataset.id, () => render(ctx, cont))));
  }

  $$('#filtros button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    $$('#filtros button').forEach(o => o.setAttribute('aria-pressed', o === b));
    pintar();
  }));

  $('#reclamar')?.addEventListener('click', async () => {
    const texto = 'Cuotas pendientes ' + ctx.temporada.nombre + ':\n' +
      morosos
        .sort((a, b) => nombreCompleto(a.jugador).localeCompare(nombreCompleto(b.jugador)))
        .map(c => '· ' + nombreCompleto(c.jugador) + ' — ' + euros(c.importe_pendiente))
        .join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Lista copiada');
    } catch {
      // Sin permiso de portapapeles (pasa en algunos navegadores): se enseña
      // para copiar a mano en vez de dejar al usuario sin nada.
      hoja('Lista para reclamar', html`<textarea style="width:100%;min-height:220px">${texto}</textarea>`);
    }
  });

  pintar();
}

// --- Ficha de la cuota ----------------------------------------------------

async function abrirCuota(ctx, jugadorId, alGuardar) {
  const [jug, cuota] = await Promise.all([
    db.jugador(jugadorId),
    db.cuotaDe(jugadorId, ctx.temporada.id)
  ]);
  const pagos = cuota ? await db.pagosDe(cuota.id) : [];

  // Reclamar en privado funciona mejor que en el grupo. El mensaje va escrito,
  // pero lo envía el usuario desde WhatsApp: la app no manda nada sola.
  const recordatorio = enlaceWhatsApp(jug.telefono,
    '¡Hola ' + (jug.nombre ?? '') + '! Te recuerdo que quedan ' +
    euros(cuota?.importe_pendiente) + ' de la cuota de ' + ctx.temporada.nombre +
    '. Cuando puedas. ¡Gracias!');

  const panel = hoja(nombreCompleto(jug), html`
    <div class="card" style="text-align:center">
      <div style="font-family:'Anton',sans-serif;font-size:2.2rem;line-height:1;color:${
        cuota.exento ? 'var(--teal)' : Number(cuota.importe_pendiente) > 0 ? 'var(--goldf)' : 'var(--ok)'}">
        ${cuota.exento ? 'Exento' : euros(cuota.importe_pendiente)}
      </div>
      <div class="l muted" style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase;font-size:.75rem;margin-top:.4rem">
        ${cuota.exento ? 'No se le reclama' : 'Pendiente'}
      </div>
      <p class="muted" style="margin:.8rem 0 0;font-size:.9rem">
        Pagado ${euros(cuota.importe_pagado)} de ${euros(cuota.importe_total)} · ${ctx.temporada.nombre}
      </p>
    </div>

    ${recordatorio && !cuota.exento && Number(cuota.importe_pendiente) > 0 ? crudo(html`
      <a class="btn oro ancho" href="${recordatorio}" target="_blank" rel="noopener" style="margin-top:.8rem">
        Recordárselo por WhatsApp
      </a>
      <p class="ayuda" style="text-align:center;margin-top:.4rem">
        Se abre WhatsApp con el mensaje escrito. Lo envías tú.
      </p>`) : ''}

    ${!cuota.exento ? crudo(html`
      <p class="eyebrow">Registrar un pago</p>
      <form id="pago">
        <div class="dos">
          <div class="campo"><label>Importe</label>
            <input name="importe" type="number" step="0.01" min="0.01" inputmode="decimal"
                   value="${Math.max(0, Number(cuota.importe_pendiente)) || ''}" required></div>
          <div class="campo"><label>Fecha</label>
            <input name="fecha" type="date" value="${hoyISO()}" required></div>
        </div>
        <div class="dos">
          <div class="campo"><label>Método</label>
            <select name="metodo">
              <option value="bizum">Bizum</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </select></div>
          <div class="campo"><label>Referencia</label>
            <input name="referencia" placeholder="Opcional"></div>
        </div>
        <button class="btn primario ancho" type="submit">Apuntar el pago</button>
      </form>`) : ''}

    <p class="eyebrow">Pagos registrados</p>
    <div class="lista" id="pagos">
      ${pagos.length ? pagos.map(p => html`
        <div class="fila">
          <div class="info">
            <div class="nom">${euros(p.importe)}</div>
            <div class="meta">${fecha(p.fecha)} · ${p.metodo}${p.referencia ? ' · ' + p.referencia : ''}</div>
          </div>
          <button class="btn-icono" data-borrar="${p.id}" aria-label="Borrar pago" style="margin-left:auto">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
          </button>
        </div>`) : vacio('Todavía no ha pagado nada.')}
    </div>

    <p class="eyebrow">Ajustes de esta cuota</p>
    <form id="ajuste">
      <div class="campo"><label>Importe que le corresponde</label>
        <input name="importe_total" type="number" step="0.01" min="0" value="${cuota.importe_total}">
        <p class="ayuda">Por si a este jugador se le aplica un importe distinto al general.</p></div>
      <div class="check">
        <input type="checkbox" id="exento" name="exento" ${cuota.exento ? crudo('checked') : ''}>
        <label for="exento" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Exento de cuota</label>
      </div>
      <div class="campo"><label>Nota</label>
        <input name="exento_nota" value="${cuota.exento_nota ?? ''}" placeholder="Opcional"></div>
      <button class="btn ancho" type="submit">Guardar ajustes</button>
    </form>`);

  $('#pago', panel)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    try {
      await db.registrarPago({
        cuota_id: cuota.id,
        importe: Number(d.importe),
        fecha: d.fecha,
        metodo: d.metodo,
        referencia: d.referencia || null,
        registrado_por: ctx.perfil.id
      });
      avisar('Pago apuntado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $$('[data-borrar]', panel).forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Borrar el pago', 'Se descuenta de lo cobrado y no se puede deshacer.', 'Borrar')) return;
    try {
      await db.borrarPago(b.dataset.borrar);
      avisar('Pago borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  }));

  $('#ajuste', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await db.guardarCuota(cuota.id, {
        importe_total: Number(f.get('importe_total')),
        exento: f.get('exento') === 'on',
        exento_nota: f.get('exento_nota') || null
      });
      avisar('Cuota actualizada');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
