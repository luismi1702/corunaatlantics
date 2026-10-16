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

        <div class="campo"><label>Nombre en la camiseta</label>
          <input name="apodo" value="${yo.apodo ?? ''}" placeholder="Opcional">
          <p class="ayuda">Como te llaman. Si lo dejas en blanco sale tu apellido.</p></div>

        <div class="dos">
          <div class="campo"><label>Teléfono</label>
            <input name="telefono" type="tel" required value="${yo.telefono ?? ''}"></div>
          <div class="campo"><label>Fecha de nacimiento</label>
            <input name="fecha_nacimiento" type="date" required value="${yo.fecha_nacimiento ?? ''}"></div>
        </div>

        <div class="campo"><label>Talla de equipación</label>
          <input name="talla_equipacion" value="${yo.talla_equipacion ?? ''}" placeholder="M, L, XL…"></div>

        <!-- Menores de 14: en España el consentimiento lo da el padre, la madre
             o el tutor (LOPDGDD, art. 7). Sale solo si la fecha lo pide. -->
        <div id="tutor" hidden>
          <p class="eyebrow">Padre, madre o tutor</p>
          <p class="ayuda" style="margin:-.2rem 0 .8rem;line-height:1.6">
            Al ser menor de 14 años, esta solicitud tiene que hacerla tu padre, tu madre
            o tu tutor legal, con sus datos.</p>
          <div class="dos">
            <div class="campo"><label>Nombre y apellidos</label>
              <input name="tutor_nombre"></div>
            <div class="campo"><label>Teléfono</label>
              <input name="tutor_telefono" type="tel"></div>
          </div>
          <div class="dos">
            <div class="campo"><label>Email</label>
              <input name="tutor_email" type="email" placeholder="Opcional"></div>
            <div class="campo"><label>Relación</label>
              <input name="tutor_relacion" placeholder="Madre, padre, tutor…"></div>
          </div>
        </div>

        <div class="check" style="align-items:flex-start;margin-top:.6rem">
          <input type="checkbox" id="consiento" required>
          <label for="consiento" id="texto-consiento" style="margin:0;letter-spacing:0;text-transform:none;font-size:.95rem;color:var(--text);line-height:1.5">
            Autorizo al Coruña Atlantics a guardar estos datos para gestionar mi
            participación en el equipo.
          </label>
        </div>
        <!-- Lo que hay que decir al recoger datos (RGPD, art. 13), en corto. -->
        <p class="ayuda" style="margin:.5rem 0 0;line-height:1.6">
          Los trata el Coruña Atlantics, solo para la gestión del equipo (entrenos,
          cuotas, licencia federativa) y no se ceden a nadie salvo a la federación
          para la licencia. Se guardan mientras estés en el equipo. Puedes consultarlos,
          cambiarlos o pedir que se borren escribiendo a coruna.atlantics@gmail.com.
        </p>

        <button class="btn primario ancho" type="submit" style="margin-top:1.2rem">
          Enviar solicitud</button>
        <button class="btn fantasma ancho" type="button" id="salir" style="margin-top:.7rem">
          Salir</button>
      </form>
    </div>`;

  // Edad a fecha de hoy, contando si ya ha cumplido este año.
  const edad = (iso) => {
    if (!iso) return null;
    const n = new Date(iso + 'T12:00:00'), h = new Date();
    return h.getFullYear() - n.getFullYear() -
      (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate()) ? 1 : 0);
  };
  const esMenor = () => { const e = edad($('[name=fecha_nacimiento]', cont).value); return e !== null && e < 14; };

  const ajustarTutor = () => {
    const menor = esMenor();
    $('#tutor', cont).hidden = !menor;
    for (const n of ['tutor_nombre', 'tutor_telefono']) $(`[name=${n}]`, cont).required = menor;
    $('#texto-consiento', cont).textContent = menor
      ? 'Soy su padre, madre o tutor legal y autorizo al Coruña Atlantics a guardar estos datos para gestionar su participación en el equipo.'
      : 'Autorizo al Coruña Atlantics a guardar estos datos para gestionar mi participación en el equipo.';
  };
  $('[name=fecha_nacimiento]', cont).addEventListener('change', ajustarTutor);
  ajustarTutor();

  $('#alta', cont).addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    const f = new FormData(e.target);
    const datos = Object.fromEntries(f.entries());
    delete datos.consiento;
    const tutor = {
      nombre: datos.tutor_nombre, telefono: datos.tutor_telefono,
      email: datos.tutor_email, relacion: datos.tutor_relacion
    };
    for (const k of Object.keys(datos)) if (k.startsWith('tutor_')) delete datos[k];
    datos.consentimiento_rgpd_en = new Date().toISOString();
    for (const k of ['apodo', 'talla_equipacion']) if (datos[k] === '') datos[k] = null;

    try {
      // El tutor va antes: en cuanto se entrega la solicitud, el jugador ya no
      // puede apuntarlo (registrar_tutor solo deja hacerlo con la ficha sin
      // entregar).
      if (esMenor()) await db.registrarTutor(tutor);
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
