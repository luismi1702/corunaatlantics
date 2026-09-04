// Alta — el formulario que rellena quien se registra por su cuenta.
//
// Se enseña una sola vez, justo después de entrar por primera vez. Al enviarlo
// la ficha pasa a pendiente y el club decide. Nada de lo que ponga aquí le da
// acceso: eso lo concede un administrador.
//
// Solo se piden los datos que el propio jugador conoce mejor que nadie. El
// dorsal y las posiciones los decide el club, así que aquí alargarían el
// formulario justo en el momento en que más gente lo abandona.

import * as db from '../db.js';
import { html, $, avisar, fallo } from '../ui.js';

export async function render(ctx, cont) {
  const yo = ctx.perfil;

  cont.innerHTML = html`
    <div class="alta">
      <img class="alta-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
      <h1>Únete al equipo</h1>
      <p class="alta-intro">
        Rellena tu ficha y el club revisará tu solicitud. Solo se envía una vez;
        luego podrás cambiar tus datos cuando quieras.
      </p>

      <form id="alta">
        <div class="dos">
          <div class="campo"><label>Nombre</label>
            <input name="nombre" required value="${yo.nombre ?? ''}"></div>
          <div class="campo"><label>Apellidos</label>
            <input name="apellidos" required value="${yo.apellidos ?? ''}"></div>
        </div>

        <div class="campo"><label>Cómo te llaman</label>
          <input name="apodo" value="${yo.apodo ?? ''}" placeholder="Opcional"></div>

        <div class="dos">
          <div class="campo"><label>Teléfono</label>
            <input name="telefono" type="tel" required value="${yo.telefono ?? ''}"></div>
          <div class="campo"><label>Fecha de nacimiento</label>
            <input name="fecha_nacimiento" type="date" required value="${yo.fecha_nacimiento ?? ''}"></div>
        </div>

        <div class="campo"><label>Talla de equipación</label>
          <input name="talla_equipacion" value="${yo.talla_equipacion ?? ''}" placeholder="M, L, XL…"></div>

        <div class="check" style="align-items:flex-start;margin-top:.6rem">
          <input type="checkbox" id="consiento" required>
          <label for="consiento" style="margin:0;letter-spacing:0;text-transform:none;font-size:.95rem;color:var(--text);line-height:1.5">
            Autorizo al Coruña Atlantics a guardar estos datos para gestionar mi
            participación en el equipo. Puedo consultarlos, cambiarlos o pedir
            que se borren cuando quiera.
          </label>
        </div>

        <button class="btn primario ancho" type="submit" style="margin-top:1.2rem">
          Enviar solicitud</button>
        <button class="btn fantasma ancho" type="button" id="salir" style="margin-top:.7rem">
          Salir</button>
      </form>
    </div>`;

  $('#alta', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    const f = new FormData(e.target);
    const datos = Object.fromEntries(f.entries());
    delete datos.consiento;
    datos.consentimiento_rgpd_en = new Date().toISOString();
    for (const k of ['apodo', 'talla_equipacion']) if (datos[k] === '') datos[k] = null;

    try {
      await db.entregarSolicitud(yo.id, datos);
      avisar('Solicitud enviada');
      ctx.recargar();
    } catch (err) {
      fallo(err);
      boton.disabled = false;
    }
  });

  $('#salir', cont).addEventListener('click', async () => {
    await db.salir();
    location.reload();
  });
}
