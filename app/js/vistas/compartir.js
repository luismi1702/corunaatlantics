// Repartir la app: el enlace y el QR.
//
// Vive en Ajustes porque es una acción del club, no una pantalla que se mire a
// diario. Y va plegado: el día que repartes la app lo abres una vez y no
// vuelves; tenerlo desplegado siempre sería ocupar media pantalla de Ajustes
// con un cuadro que casi nunca hace falta.
//
// El QR y el enlace son lo mismo. El enlace vale para el goteo —alguien que se
// apunta a mitad de temporada, se le manda por WhatsApp y ya—; el QR sirve para
// una sola cosa, pero importante: veinte personas a la vez en un entreno, cada
// una apuntando con la cámara, sin reenviar nada ni buscar el mensaje.

import { html, $, avisar, pintarQR } from '../ui.js';

// El jugador lo ve tambien, en Mi ficha: cualquiera con el enlace solo puede
// PEDIR entrar, y el club aprueba o rechaza. Asi que dejarles compartirlo no
// abre ninguna puerta, y el boca a boca es como crece un club. Solo cambia el
// texto: a el no le "aprueban" nada, se lo aprueba el club.
export function pintarCompartir(cont, { staff = true } = {}) {
  if (!cont) return;

  const url = location.origin + location.pathname;

  cont.innerHTML = html`
    <p class="eyebrow">${staff ? 'Repartir la app' : 'Traer a alguien al equipo'}</p>
    <div class="card">
      <p style="margin:0 0 .9rem;line-height:1.6" class="muted">
        ${staff
          ? 'Cualquiera con el enlace puede pedir entrar, pero no ve nada del club hasta que apruebas su solicitud.'
          : '¿Conoces a alguien que se apuntaría? Pásale el enlace. Rellenará su ficha y el club decide si entra.'}
      </p>

      <button class="btn primario ancho" id="compartir">Compartir el enlace</button>
      <button class="btn ancho" id="ver-qr" style="margin-top:.6rem"
              aria-expanded="false">Enseñar el código QR</button>

      <div id="zona-qr" hidden style="margin-top:1rem">
        <div class="qr" id="qr"><div class="spinner" style="margin:2rem auto"></div></div>
        <p class="enlace-app" id="url"></p>
        <p class="ayuda" style="margin:.6rem 0 0;line-height:1.6">
          ${staff
            ? 'Enséñalo en un entreno y que lo escaneen todos a la vez. Es la forma que funciona: uno a uno por WhatsApp se queda a medias.'
            : 'Que lo escanee con la cámara del móvil y entra directo.'}
        </p>
      </div>
    </div>`;

  $('#compartir', cont).addEventListener('click', async () => {
    const texto = staff
      ? 'Únete al Coruña Atlantics: entra aquí, regístrate y te damos acceso. ' + url
      : '¿Te vienes a jugar al Coruña Atlantics? Entra aquí y apúntate: ' + url;
    try {
      if (navigator.share) await navigator.share({ title: 'Coruña Atlantics', text: texto, url });
      else { await navigator.clipboard.writeText(texto); avisar('Enlace copiado'); }
    } catch { /* si cancela el diálogo de compartir, no hay nada que decir */ }
  });

  $('#ver-qr', cont).addEventListener('click', (e) => {
    const zona = $('#zona-qr', cont);
    const abierto = zona.hidden;
    zona.hidden = !abierto;
    e.currentTarget.setAttribute('aria-expanded', String(abierto));
    e.currentTarget.textContent = abierto ? 'Ocultar el código QR' : 'Enseñar el código QR';

    // Se dibuja al abrirlo, no antes: no tiene sentido montar el codigo para
    // dejarlo escondido.
    if (abierto && !zona.dataset.pintado) {
      $('#url', cont).textContent = url.replace(/^https?:\/\//, '');
      pintarQR($('#qr', cont), url);
      zona.dataset.pintado = '1';
    }
  });
}
