// Panel — la pantalla que se abre cada día.
// Solo lo que requiere acción. Todo lo que no pide una decisión hoy vive en su
// propia pestaña, no aquí.

import * as db from '../db.js';
import { DIAS_AVISO_CADUCIDAD } from '../config.js';
import { html, crudo, euros, diasHasta, nombreCompleto, cargando } from '../ui.js';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, cuotas, docs, tesoreria] = await Promise.all([
    db.roster(),
    db.cuotasDe(ctx.temporada.id),
    db.documentacionDe(ctx.temporada.id),
    db.resumenTesoreria(ctx.temporada.id)
  ]);

  const activos = plantilla.filter(p => p.estado !== 'baja');
  const porId = new Map(plantilla.map(p => [p.id, p]));

  // --- Dinero -------------------------------------------------------------
  const cuotasVivas = cuotas.filter(c => porId.get(c.jugador_id)?.estado !== 'baja');
  const cobrado  = cuotasVivas.reduce((s, c) => s + Number(c.importe_pagado), 0);
  const pendiente = cuotasVivas
    .filter(c => !c.exento)
    .reduce((s, c) => s + Math.max(0, Number(c.importe_pendiente)), 0);
  const morosos = cuotasVivas.filter(c => !c.exento && Number(c.importe_pendiente) > 0);

  // --- Caducidades --------------------------------------------------------
  const caducan = [];
  for (const d of docs) {
    const p = porId.get(d.jugador_id);
    if (!p || p.estado === 'baja') continue;
    for (const [campo, etiqueta] of [
      ['licencia_caduca_en', 'Licencia'],
      ['seguro_caduca_en', 'Seguro'],
      ['reconocimiento_caduca_en', 'Reconocimiento médico']
    ]) {
      const dias = diasHasta(d[campo]);
      if (dias !== null && dias <= DIAS_AVISO_CADUCIDAD) caducan.push({ p, etiqueta, dias });
    }
  }
  caducan.sort((a, b) => a.dias - b.dias);

  // --- Fichas incompletas -------------------------------------------------
  const incompletos = activos.filter(p => !p.telefono || !p.fecha_nacimiento);

  const sinCuotaDefinida = ctx.temporada.importe_cuota <= 0;

  cont.innerHTML = html`
    <div class="cifras">
      <div class="cifra ok"><div class="n">${euros(cobrado)}</div><div class="l">Cobrado</div></div>
      <div class="cifra gold"><div class="n">${euros(pendiente)}</div><div class="l">Pendiente</div></div>
      <div class="cifra ${morosos.length ? 'bad' : ''}"><div class="n">${morosos.length}</div><div class="l">Sin pagar</div></div>
    </div>

    ${sinCuotaDefinida ? crudo(html`
      <p class="eyebrow">Primero esto</p>
      <div class="card">
        <p style="margin:0 0 .8rem;line-height:1.6">
          Todavía no has fijado el importe de la cuota de <strong>${ctx.temporada.nombre}</strong>,
          así que los totales de arriba salen a cero. Se cambia en Ajustes cuando lo sepas.
        </p>
        <a class="btn primario ancho" href="#/ajustes">Fijar el importe</a>
      </div>`) : ''}

    <p class="eyebrow">Caja</p>
    <a class="fila" href="#/tesoreria" style="text-decoration:none;color:inherit">
      <div class="info">
        <div class="nom">Saldo de la temporada</div>
        <div class="meta">${euros(tesoreria?.ingresos_total)} entrados · ${euros(tesoreria?.gastos_total)} gastados</div>
      </div>
      <div class="dcha">
        <div class="importe" style="font-size:1.25rem;color:${
          Number(tesoreria?.saldo ?? 0) < 0 ? 'var(--bad)' : 'var(--ok)'}">${euros(tesoreria?.saldo)}</div>
      </div>
    </a>

    <p class="eyebrow">Plantilla</p>
    <div class="cifras">
      <div class="cifra"><div class="n">${activos.filter(p => p.estado === 'activo').length}</div><div class="l">Activos</div></div>
      <div class="cifra"><div class="n">${plantilla.filter(p => p.estado === 'lesionado').length}</div><div class="l">Lesionados</div></div>
      <div class="cifra"><div class="n">${incompletos.length}</div><div class="l">Fichas a medias</div></div>
    </div>

    ${caducan.length ? crudo(html`
      <p class="eyebrow">Caduca pronto</p>
      <div class="lista">
        ${caducan.slice(0, 8).map(c => html`
          <a class="fila" href="#/documentacion" style="text-decoration:none;color:inherit">
            <div class="dorsal ${c.p.dorsal == null ? 'sin' : ''}">${c.p.dorsal ?? '—'}</div>
            <div class="info">
              <div class="nom">${nombreCompleto(c.p)}</div>
              <div class="meta">${c.etiqueta}</div>
            </div>
            <div class="dcha">
              <span class="tag ${c.dias < 0 ? 'bad' : 'warn'}">
                ${c.dias < 0 ? 'Caducado' : 'En ' + c.dias + ' d'}
              </span>
            </div>
          </a>`)}
      </div>`) : ''}

    ${morosos.length ? crudo(html`
      <p class="eyebrow">Cuotas pendientes</p>
      <div class="lista">
        ${morosos
          .sort((a, b) => Number(b.importe_pendiente) - Number(a.importe_pendiente))
          .slice(0, 8)
          .map(c => {
            const p = porId.get(c.jugador_id);
            return html`
              <a class="fila" href="#/cuotas" style="text-decoration:none;color:inherit">
                <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
                <div class="info">
                  <div class="nom">${nombreCompleto(p)}</div>
                  <div class="meta">${Number(c.importe_pagado) > 0 ? 'Ha pagado ' + euros(c.importe_pagado) : 'Sin ningún pago'}</div>
                </div>
                <div class="dcha"><div class="importe" style="color:var(--goldf)">${euros(c.importe_pendiente)}</div></div>
              </a>`;
          })}
      </div>
      ${morosos.length > 8 ? html`<p class="muted" style="text-align:center;margin-top:.7rem">y ${morosos.length - 8} más</p>` : ''}
      `) : ''}

    ${incompletos.length ? crudo(html`
      <p class="eyebrow">Fichas sin completar</p>
      <div class="card">
        <p style="margin:0 0 .8rem;line-height:1.6" class="muted">
          A ${incompletos.length === 1 ? 'un jugador le' : incompletos.length + ' jugadores les'}
          falta el teléfono o la fecha de nacimiento.
        </p>
        <a class="btn ancho" href="#/roster">Ver el roster</a>
      </div>`) : ''}

    ${!morosos.length && !caducan.length && !incompletos.length && !sinCuotaDefinida ? crudo(html`
      <div class="card" style="text-align:center;padding:2rem 1rem">
        <p style="margin:0;line-height:1.6">Nada pendiente. Todo al día.</p>
      </div>`) : ''}
  `;
}
