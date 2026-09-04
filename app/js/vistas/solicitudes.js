// Solicitudes — quién ha pedido entrar en el equipo.
//
// Aprobar da acceso y crea su cuota y su ficha de documentación de la temporada
// activa, igual que un alta hecha desde el roster.

import * as db from '../db.js';
import {
  html, crudo, $, $$, fecha, nombreCompleto,
  enlaceLlamada, enlaceWhatsApp, hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

const edad = (iso) => {
  if (!iso) return null;
  const n = new Date(iso + 'T12:00:00');
  const hoy = new Date();
  let a = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) a--;
  return a;
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();
  const lista = await db.solicitudes();

  cont.innerHTML = html`
    ${lista.length ? crudo(html`
      <p class="eyebrow">${lista.length === 1 ? 'Una solicitud' : lista.length + ' solicitudes'}</p>
      <div class="lista">
        ${lista.map(p => {
          const anios = edad(p.fecha_nacimiento);
          return html`
            <button class="fila" data-id="${p.id}">
              <div class="dorsal sin">?</div>
              <div class="info">
                <div class="nom">${nombreCompleto(p)}</div>
                <div class="meta">
                  ${anios != null ? anios + ' años' : 'Sin fecha de nacimiento'}
                  ${p.talla_equipacion ? ' · talla ' + p.talla_equipacion : ''}
                </div>
              </div>
              <div class="dcha">
                ${anios != null && anios < 18
                  ? crudo('<span class="tag warn">Menor</span>')
                  : crudo('<span class="tag teal">Revisar</span>')}
              </div>
            </button>`;
        })}
      </div>`) : vacio('No hay solicitudes pendientes.')}

    <div class="card" style="margin-top:1.2rem">
      <p style="margin:0 0 .8rem;line-height:1.6" class="muted">
        Cualquiera con el enlace de la app puede pedir entrar, pero no ve nada
        del club hasta que lo apruebas aquí.
      </p>
      <button class="btn ancho" id="compartir">Compartir el enlace de la app</button>
    </div>
  `;

  $$('.fila', cont).forEach(b => b.addEventListener('click', () =>
    abrirSolicitud(ctx, lista.find(p => p.id === b.dataset.id), () => render(ctx, cont))));

  $('#compartir').addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    const texto = 'Únete al Coruña Atlantics: entra aquí, regístrate y te damos acceso. ' + url;
    try {
      if (navigator.share) await navigator.share({ title: 'Coruña Atlantics', text: texto, url });
      else { await navigator.clipboard.writeText(texto); avisar('Enlace copiado'); }
    } catch { /* si cancela el diálogo de compartir, no hay nada que decir */ }
  });
}

// --- Una solicitud --------------------------------------------------------

function abrirSolicitud(ctx, p, alResolver) {
  const anios = edad(p.fecha_nacimiento);
  const tel = p.telefono;

  const dato = (etiqueta, valor) => html`
    <div class="fila">
      <div class="info">
        <div class="meta">${etiqueta}</div>
        <div class="nom">${valor || '—'}</div>
      </div>
    </div>`;

  const panel = hoja(nombreCompleto(p), html`
    ${anios != null && anios < 18 ? crudo(html`
      <p class="otra-unidad" style="margin:0 0 1rem">
        Tiene ${anios} años. Antes de aprobarle hace falta el consentimiento de
        su padre, madre o tutor.
      </p>`) : ''}

    <div class="contacto">
      ${enlaceLlamada(tel) ? crudo(html`<a class="btn" href="${enlaceLlamada(tel)}">Llamar</a>`) : ''}
      ${enlaceWhatsApp(tel) ? crudo(html`
        <a class="btn" href="${enlaceWhatsApp(tel)}" target="_blank" rel="noopener">WhatsApp</a>`) : ''}
    </div>

    <div class="lista">
      ${dato('Email', p.email)}
      ${dato('Teléfono', p.telefono)}
      ${dato('Nacimiento', p.fecha_nacimiento ? fecha(p.fecha_nacimiento) + (anios != null ? ' · ' + anios + ' años' : '') : null)}
      ${dato('Talla', p.talla_equipacion)}
      ${dato('Solicitó', p.solicitado_en ? fecha(p.solicitado_en.slice(0, 10)) : null)}
    </div>

    <div style="display:flex;gap:.6rem;margin-top:1.3rem">
      <button class="btn peligro" style="flex:1" id="rechazar">Rechazar</button>
      <button class="btn primario" style="flex:1" id="aprobar">Aprobar</button>
    </div>
    <p class="ayuda" style="margin-top:.8rem;line-height:1.6">
      Al aprobar entra en el roster y se le abre la cuota de la temporada.
      El dorsal y las posiciones se los pones tú desde su ficha.
    </p>`);

  $('#aprobar', panel).addEventListener('click', async () => {
    try {
      await db.resolverSolicitud(p.id, true);
      avisar(nombreCompleto(p) + ' ya está dentro');
      panel.cerrar();
      alResolver();
    } catch (err) { fallo(err); }
  });

  $('#rechazar', panel).addEventListener('click', async () => {
    if (!await confirmar('Rechazar la solicitud',
      'No entrará en el equipo y verá que su solicitud no ha salido adelante. ' +
      'Puedes volver a aprobarle más adelante desde el roster.', 'Rechazar')) return;
    try {
      await db.resolverSolicitud(p.id, false);
      avisar('Solicitud rechazada');
      panel.cerrar();
      alResolver();
    } catch (err) { fallo(err); }
  });
}
