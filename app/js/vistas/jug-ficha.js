// Mi ficha — lo que el jugador puede ver y cambiar de sí mismo.
//
// Edita sus datos de contacto; el dorsal, las posiciones, el estado y el
// papeleo son cosa del club y aquí solo se leen. La separación no es de
// interfaz: la base de datos revierte cualquier intento de tocar esos campos.

import * as db from '../db.js';
import * as cerrojo from '../cerrojo.js';
import {
  html, crudo, $, $$, euros, fecha, nombreCompleto, tag, TAG_DOC, TAG_JUGADOR,
  avisar, fallo, cargando
} from '../ui.js';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const yo = ctx.perfil;
  const [cuota, docs, equipo] = await Promise.all([
    db.cuotaDe(yo.id, ctx.temporada.id),
    db.documentacionDe(ctx.temporada.id),
    db.companeros()
  ]);
  const doc = docs.find(d => d.jugador_id === yo.id);

  // Quién lleva cada número, para pintar los ocupados y saber de quién son.
  const dueno = new Map();
  for (const p of equipo) if (p.dorsal != null && p.id !== yo.id) dueno.set(p.dorsal, p);

  const DOCUMENTOS = [
    { etiqueta: 'Licencia',              estado: doc?.licencia_estado,       caduca: doc?.licencia_caduca_en },
    { etiqueta: 'Seguro',                estado: doc?.seguro_estado,         caduca: doc?.seguro_caduca_en },
    { etiqueta: 'Reconocimiento médico', estado: doc?.reconocimiento_estado, caduca: doc?.reconocimiento_caduca_en }
  ];

  cont.innerHTML = html`
    <div class="card ficha-cabecera">
      <div class="dorsal grande ${yo.dorsal == null ? 'sin' : ''}">${yo.dorsal ?? '—'}</div>
      <div>
        <h2>${nombreCompleto(yo)}</h2>
        <p class="muted" style="margin:.3rem 0 0">
          ${yo.posiciones.join(' · ') || 'Sin posición asignada'}
        </p>
        <p style="margin:.5rem 0 0">${tag(TAG_JUGADOR, yo.estado)}</p>
      </div>
    </div>

    <p class="eyebrow">Tu dorsal</p>
    <div class="card">
      <p class="ayuda" style="margin:0 0 .8rem;line-height:1.6">
        ${yo.dorsal != null
          ? 'Llevas el ' + yo.dorsal + '. Es tuyo mientras estés en el equipo; nadie más puede cogerlo. Toca otro libre si quieres cambiarlo.'
          : 'Elige el tuyo. El que cojas queda bloqueado para el resto.'}
      </p>
      <div class="dorsales" id="dorsales">
        ${Array.from({ length: 100 }, (_, n) => {
          const otro = dueno.get(n);
          return html`
            <button type="button" class="num ${otro ? 'pillado' : ''} ${yo.dorsal === n ? 'mio' : ''}"
              data-n="${n}" ${otro ? crudo('disabled') : ''}
              title="${otro ? nombreCompleto(otro) : 'Libre'}">${n}</button>`;
        })}
      </div>
    </div>

    <p class="eyebrow">Tus datos</p>
    <form id="mios" class="card">
      <div class="campo"><label>Apodo</label>
        <input name="apodo" value="${yo.apodo ?? ''}" placeholder="Como te llaman"></div>
      <div class="campo"><label>Teléfono</label>
        <input name="telefono" type="tel" value="${yo.telefono ?? ''}"></div>
      <div class="campo"><label>Talla de equipación</label>
        <input name="talla_equipacion" value="${yo.talla_equipacion ?? ''}" placeholder="M, L, XL…"></div>

      <button class="btn primario ancho" type="submit">Guardar</button>
    </form>

    <p class="eyebrow">Tu papeleo</p>
    <div class="lista">
      ${DOCUMENTOS.map(d => html`
        <div class="fila">
          <div class="info">
            <div class="nom">${d.etiqueta}</div>
            <div class="meta">${d.caduca ? 'Caduca el ' + fecha(d.caduca) : 'Sin fecha de caducidad'}</div>
          </div>
          <div class="dcha">${tag(TAG_DOC, d.estado ?? 'pendiente')}</div>
        </div>`)}
      <div class="fila">
        <div class="info">
          <div class="nom">Copia del DNI</div>
          <div class="meta">Se entrega al club</div>
        </div>
        <div class="dcha">
          ${doc?.dni_entregado ? crudo('<span class="tag ok">Entregada</span>')
                               : crudo('<span class="tag bad">Pendiente</span>')}
        </div>
      </div>
    </div>
    <p class="ayuda" style="margin-top:.6rem;line-height:1.6">
      Esto lo actualiza el club cuando recibe cada documento. Si algo lleva mucho
      en pendiente, habla con el staff.
    </p>

    ${cuota ? crudo(html`
      <p class="eyebrow">Tu cuota</p>
      <div class="card" style="text-align:center">
        <div style="font-family:'Anton',sans-serif;font-size:2rem;line-height:1;color:${
          cuota.exento ? 'var(--teal)' : Number(cuota.importe_pendiente) > 0 ? 'var(--goldf)' : 'var(--ok)'}">
          ${cuota.exento ? 'Exento' : Number(cuota.importe_pendiente) > 0 ? euros(cuota.importe_pendiente) : 'Al día'}
        </div>
        <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">
          ${cuota.exento ? 'No te corresponde pagar cuota esta temporada'
            : 'Has pagado ' + euros(cuota.importe_pagado) + ' de ' + euros(cuota.importe_total) + ' · ' + ctx.temporada.nombre}
        </p>
      </div>`) : ''}

    <div id="cerrojo"></div>

    <button class="btn fantasma ancho" id="salir" style="margin-top:1.5rem">Cerrar sesión</button>
  `;

  $$('#dorsales .num').forEach(b => b.addEventListener('click', async () => {
    const n = Number(b.dataset.n);
    const nuevo = yo.dorsal === n ? null : n;   // tocar el propio lo libera
    try {
      await db.elegirDorsal(yo.id, nuevo);
      avisar(nuevo == null ? 'Has soltado tu dorsal' : '¡El ' + nuevo + ' es tuyo!');
      ctx.recargar();
    } catch (err) { fallo(err); }
  }));

  cerrojo.pintarAjuste($('#cerrojo'), yo);

  $('#mios').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = Object.fromEntries(f.entries());
    for (const k of Object.keys(datos)) if (datos[k] === '') datos[k] = null;
    try {
      await db.guardarJugador(yo.id, datos);
      avisar('Datos guardados');
      ctx.recargar();
    } catch (err) { fallo(err); }
  });

  $('#salir').addEventListener('click', async () => {
    await db.salir();
    location.reload();
  });
}
