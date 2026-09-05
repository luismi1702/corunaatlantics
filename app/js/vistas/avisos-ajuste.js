// El interruptor de los avisos al móvil.
//
// Se pinta igual en la ficha del jugador y en los ajustes del club, porque es
// la misma decisión para todos: quiero que me avise el móvil, o no.
//
// Lo que se enseña sale de preguntarle al navegador, no de lo que haya en la
// base de datos: una suscripción caduca sola, y un móvil formateado deja una
// fila que ya no vale para nada. Manda lo que diga el aparato que tienes en la
// mano.

import * as db from '../db.js';
import * as avisos from '../avisos-movil.js';
import { html, crudo, $, avisar, fallo } from '../ui.js';

export async function pintarAjuste(cont, perfil) {
  if (!cont) return;

  const motivo = avisos.motivoImposible();
  const suscrito = motivo ? null : await avisos.suscripcionActual();
  const bloqueado = !motivo && avisos.permiso() === 'denied';

  cont.innerHTML = html`
    <p class="eyebrow">Avisos en el móvil</p>
    <div class="card">
      ${motivo ? crudo(html`
        <p style="margin:0;line-height:1.6" class="muted">${motivo}</p>`)
      : bloqueado ? crudo(html`
        <p style="margin:0;line-height:1.6" class="muted">
          Los tienes bloqueados en este navegador. Hay que volver a permitirlos
          desde sus ajustes; desde aquí no se puede.
        </p>`)
      : crudo(html`
        <p style="margin:0 0 .9rem;line-height:1.6" class="muted">
          ${suscrito
            ? 'Este móvil recibe los avisos del club.'
            : 'Actívalos y el club puede avisarte de un cambio de entreno sin que abras la app.'}
        </p>
        <button class="btn ${suscrito ? '' : 'primario'} ancho" id="conmutar">
          ${suscrito ? 'Desactivar en este móvil' : 'Activar los avisos'}
        </button>`)}
    </div>`;

  $('#conmutar', cont)?.addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    boton.disabled = true;
    try {
      if (suscrito) {
        const endpoint = await avisos.desactivar();
        if (endpoint) await db.borrarSuscripcion(endpoint);
        avisar('Avisos desactivados en este móvil');
      } else {
        const datos = await avisos.activar();
        await db.guardarSuscripcion(perfil.id, datos);
        avisar('Listo, este móvil ya recibe los avisos');
      }
      pintarAjuste(cont, perfil);
    } catch (err) {
      fallo(err);
      boton.disabled = false;
    }
  });
}
