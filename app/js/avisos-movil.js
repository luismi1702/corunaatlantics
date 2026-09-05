// Activar y desactivar los avisos en el móvil.
//
// Tres cosas que no son evidentes y explican casi todo lo de aquí:
//
// 1. El permiso hay que pedirlo desde un toque del usuario. Pedirlo al abrir la
//    app hace que la mitad le dé a "No" sin leer, y el "No" de un navegador es
//    para siempre: no se puede volver a preguntar.
//
// 2. En iPhone solo funciona si la app está instalada en la pantalla de inicio.
//    Desde una pestaña de Safari la API ni existe. Por eso hay que distinguir
//    "aquí no se puede" de "aquí se puede y no quiso", y decírselo.
//
// 3. La suscripción caduca sola de vez en cuando. Al arrancar se comprueba lo
//    que dice el navegador y se pisa lo guardado, en vez de fiarse de la tabla.

import { VAPID_PUBLICA } from './config.js';

const b64urlADatos = (base64) => {
  const relleno = '='.repeat((4 - base64.length % 4) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

const aB64url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ¿Se puede siquiera? En un iPhone fuera de la app instalada, no.
export const seSoporta = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const instalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const iOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Por qué no se puede, en palabras que sirvan para hacer algo.
export function motivoImposible() {
  if (seSoporta()) return null;
  if (iOS() && !instalada()) {
    return 'En iPhone los avisos solo llegan con la app instalada. Dale a Compartir → Añadir a pantalla de inicio y ábrela desde ahí.';
  }
  return 'Este navegador no admite avisos. Prueba con Chrome o Safari actualizados.';
}

export const permiso = () => (seSoporta() ? Notification.permission : 'denied');

export async function suscripcionActual() {
  if (!seSoporta()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

const desmontar = (s) => {
  const bruta = s.toJSON();
  return {
    endpoint: s.endpoint,
    p256dh: bruta.keys?.p256dh ?? aB64url(s.getKey('p256dh')),
    auth:   bruta.keys?.auth   ?? aB64url(s.getKey('auth')),
    agente: navigator.userAgent.slice(0, 200)
  };
}

// Devuelve la suscripcion lista para guardar, o lanza con un motivo que se
// pueda enseñar tal cual.
export async function activar() {
  const motivo = motivoImposible();
  if (motivo) throw new Error(motivo);

  const respuesta = await Notification.requestPermission();
  if (respuesta === 'denied') {
    throw new Error('Has bloqueado los avisos. Para volver a activarlos hay que cambiarlo en los ajustes del navegador.');
  }
  if (respuesta !== 'granted') throw new Error('No se han activado los avisos.');

  const reg = await navigator.serviceWorker.ready;
  const suscripcion = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64urlADatos(VAPID_PUBLICA)
  });

  return desmontar(suscripcion);
}

export async function desactivar() {
  const s = await suscripcionActual();
  if (!s) return null;
  const endpoint = s.endpoint;
  await s.unsubscribe();
  return endpoint;
}
