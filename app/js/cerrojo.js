// Cerrojo biométrico — Face ID, Touch ID o huella para abrir la app.
//
// Qué es: un cerrojo LOCAL. El navegador le pregunta al sistema si eres tú y
// devuelve un sí o un no. La cara o la huella nunca salen del teléfono: ni las
// vemos, ni las guardamos, ni viajan a ningún servidor.
//
// Qué NO es: un segundo factor de autenticación de verdad. No hay servidor
// verificando la firma, así que protege de que alguien coja tu móvil
// desbloqueado, no de un ataque contra la cuenta. Conviene tenerlo claro para
// no confiar en él más de lo que aguanta.
//
// La credencial se guarda por dispositivo. Activarlo en el móvil no lo activa
// en el portátil, que es justo lo que se espera de un cerrojo.

import { html, crudo, avisar } from './ui.js';

const CLAVE = 'atlantics-cerrojo';

const aBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const deBase64 = (texto) => Uint8Array.from(atob(texto), c => c.charCodeAt(0));

const guardado = () => {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
};

export const activo = () => !!guardado();

// ¿Tiene este dispositivo un sensor biométrico que el navegador pueda usar?
export async function disponible() {
  if (!window.isSecureContext || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Dentro de un marco incrustado los navegadores bloquean WebAuthn a propósito:
// si no, cualquier web podría enmarcar a otra y robarle autenticaciones. Merece
// la pena distinguirlo, porque no es lo mismo "tu móvil no puede" que "aquí no
// se puede".
export const incrustado = () => {
  try { return window.self !== window.top; } catch { return true; }
};

const reto = () => crypto.getRandomValues(new Uint8Array(32));

export async function activar(perfil) {
  const credencial = await navigator.credentials.create({
    publicKey: {
      challenge: reto(),
      rp: { name: 'Coruña Atlantics' },        // sin id: vale el dominio actual
      user: {
        id: new TextEncoder().encode(perfil.id),
        name: perfil.email ?? perfil.id,
        displayName: [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ') || 'Atlantics'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',   // el sensor del propio aparato
        userVerification: 'required',
        residentKey: 'discouraged'
      },
      attestation: 'none',                     // no queremos identificar el aparato
      timeout: 60000
    }
  });

  if (!credencial) throw new Error('No se ha podido activar el cerrojo');
  localStorage.setItem(CLAVE, aBase64(credencial.rawId));
  return true;
}

export function desactivar() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada que hacer */ }
}

export async function abrir() {
  const id = guardado();
  if (!id) return true;                        // sin cerrojo, no hay nada que abrir

  const credencial = await navigator.credentials.get({
    publicKey: {
      challenge: reto(),
      allowCredentials: [{ id: deBase64(id), type: 'public-key', transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000
    }
  });

  return !!credencial;
}

// --- El interruptor, igual en Ajustes y en Mi ficha ------------------------

export async function pintarAjuste(cont, perfil) {
  const hay = await disponible();

  const pintar = () => {
    const on = activo();
    cont.innerHTML = html`
      <p class="eyebrow">Bloqueo con Face ID</p>
      <div class="card">
        ${hay ? crudo(html`
          <div class="check" style="align-items:flex-start">
            <input type="checkbox" id="usar-cerrojo" ${on ? crudo('checked') : ''}>
            <label for="usar-cerrojo" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text);line-height:1.5">
              Pedir Face ID, huella o código al abrir la app en este dispositivo
            </label>
          </div>
          <p class="ayuda" style="margin-top:.6rem;line-height:1.6">
            Tu cara o tu huella no salen del teléfono: la app solo recibe un sí o
            un no del sistema. Es un cerrojo para que nadie abra la app si te coge
            el móvil desbloqueado, no una contraseña nueva.
            ${on ? ' Si cambias de móvil, entra con el correo y actívalo allí.' : ''}
          </p>`) : incrustado() ? crudo(html`
          <p class="muted" style="margin:0;line-height:1.6">
            Estás viendo la app dentro de otra página, y los navegadores no dejan
            pedir Face ID desde ahí — es una protección suya, no un fallo de tu
            móvil. Con la app abierta en su propia dirección funciona con
            normalidad.
          </p>`) : crudo(html`
          <p class="muted" style="margin:0;line-height:1.6">
            Este dispositivo o este navegador no ofrecen desbloqueo biométrico,
            así que el cerrojo no se puede activar aquí.
          </p>`)}
      </div>`;

    const casilla = cont.querySelector('#usar-cerrojo');
    if (!casilla) return;

    casilla.addEventListener('change', async () => {
      if (!casilla.checked) {
        desactivar();
        avisar('Cerrojo desactivado');
        pintar();
        return;
      }
      try {
        await activar(perfil);
        avisar('Cerrojo activado');
      } catch (e) {
        console.error(e);
        avisar(e?.name === 'NotAllowedError'
          ? 'Se ha cancelado'
          : 'Aquí no se ha podido activar el cerrojo', 'error');
      }
      pintar();
    });
  };

  pintar();
}
