// Mi ficha — lo que el jugador puede ver y cambiar de sí mismo.
//
// Edita sus datos de contacto; el dorsal, las posiciones, el estado y el
// papeleo son cosa del club y aquí solo se leen. La separación no es de
// interfaz: la base de datos revierte cualquier intento de tocar esos campos.

import * as db from '../db.js';
import * as cerrojo from '../cerrojo.js';
import { pintarAjuste as pintarAvisosMovil } from './avisos-ajuste.js';
import {
  html, crudo, $, euros, fecha, nombreCompleto, tag, TAG_DOC, TAG_JUGADOR,
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
    { etiqueta: 'Licencia', estado: doc?.licencia_estado, caduca: doc?.licencia_caduca_en }
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
    <form class="card dorsal-elegir" id="dorsal">
      <div class="dorsal grande ${yo.dorsal == null ? 'sin' : ''}" id="dorsal-actual">${yo.dorsal ?? '—'}</div>
      <div class="campo" style="margin:0;flex:1">
        <label>Escribe el que quieras</label>
        <input name="dorsal" type="number" min="0" max="99" inputmode="numeric"
               value="${yo.dorsal ?? ''}" placeholder="0-99">
      </div>
      <button class="btn primario" type="submit">Guardar</button>
    </form>
    <p class="ayuda" style="margin-top:.6rem;line-height:1.6">
      El que cojas queda bloqueado para el resto mientras estés en el equipo.
      Déjalo en blanco para soltarlo.
    </p>

    <p class="eyebrow">Tus datos</p>
    <form id="mios" class="card">
      <div class="campo"><label>Nombre en la camiseta</label>
        <input name="apodo" value="${yo.apodo ?? ''}" placeholder="Como te llaman">
        <p class="ayuda">Si lo dejas en blanco sale tu apellido.</p></div>
      <div class="campo"><label>Teléfono</label>
        <input name="telefono" type="tel" value="${yo.telefono ?? ''}"></div>
      <div class="campo"><label>Talla de equipación</label>
        <input name="talla_equipacion" value="${yo.talla_equipacion ?? ''}" placeholder="M, L, XL…"></div>

      <button class="btn primario ancho" type="submit">Guardar</button>
    </form>

    <p class="eyebrow">Tus documentos</p>
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

    <div id="avisos-movil"></div>
    <div id="cerrojo"></div>

    <button class="btn fantasma ancho" id="salir" style="margin-top:1.5rem">Cerrar sesión</button>
  `;

  // La rejilla de cien numeros vive en una hoja aparte: se elige una vez y no
  // tiene por que ocupar la pantalla el resto de la temporada.
  $('#dorsal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bruto = new FormData(e.target).get('dorsal').trim();
    const n = bruto === '' ? null : Number(bruto);

    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) {
      avisar('El dorsal tiene que ser un número del 0 al 99.', 'error');
      return;
    }
    if (n === yo.dorsal) { avisar('Ese ya es el tuyo'); return; }

    // Si sabemos que está cogido, se dice quién lo lleva sin molestar al
    // servidor. Si no lo sabemos, el índice único lo rechaza igual.
    const otro = n !== null ? dueno.get(n) : null;
    if (otro) {
      avisar('El ' + n + ' lo lleva ' + nombreCompleto(otro) + '. Elige otro.', 'error');
      return;
    }

    try {
      await db.elegirDorsal(yo.id, n);
      avisar(n === null ? 'Has soltado tu dorsal' : '¡El ' + n + ' es tuyo!');
      ctx.recargar();
    } catch (err) { fallo(err); }
  });

  pintarAvisosMovil($('#avisos-movil'), yo);
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
