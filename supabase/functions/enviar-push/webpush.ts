// Web Push a mano, sin librerías.
//
// Mandar una notificación a un móvil son dos cosas independientes:
//
//   1. Firmar quién eres ante el servidor de push (Google, Apple…). Eso es
//      VAPID: un JWT firmado con la clave privada del club. RFC 8292.
//   2. Cifrar el contenido para que ese servidor no pueda leerlo. El navegador
//      del jugador es el único que tiene la clave para abrirlo. RFC 8291.
//
// Lo segundo es lo que suele obligar a arrastrar una dependencia. Está hecho
// aquí con WebCrypto, que Deno trae de serie, y comprobado contra el vector de
// prueba del propio RFC 8291: si el cifrado se desviara un milímetro, el móvil
// recibiría basura y no habría manera de saber por qué.

const b64urlADatos = (s: string): Uint8Array => {
  const base = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base + '='.repeat((4 - base.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

const datosAB64url = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const unir = (...trozos: Uint8Array[]): Uint8Array => {
  const total = trozos.reduce((n, t) => n + t.length, 0);
  const salida = new Uint8Array(total);
  let i = 0;
  for (const t of trozos) { salida.set(t, i); i += t.length; }
  return salida;
};

const texto = (s: string) => new TextEncoder().encode(s);

// --- 1. VAPID: quién manda esto ---------------------------------------------

async function cabeceraVapid(endpoint: string, publica: string, clavePrivada: string, contacto: string) {
  const origen = new URL(endpoint).origin;
  const cuerpo = {
    aud: origen,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: contacto
  };

  const cabecera = { typ: 'JWT', alg: 'ES256' };
  const sinFirmar = datosAB64url(texto(JSON.stringify(cabecera))) + '.' +
                    datosAB64url(texto(JSON.stringify(cuerpo)));

  // WebCrypto no importa una clave EC privada suelta: exige el JWK completo
  // con sus coordenadas. Se sacan de la clave publica, que es 0x04 seguido de
  // x e y de 32 bytes cada una.
  const bruta = b64urlADatos(publica);
  const clave = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256', ext: true, d: clavePrivada,
      x: datosAB64url(bruta.slice(1, 33)),
      y: datosAB64url(bruta.slice(33, 65))
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']);

  const firma = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, clave, texto(sinFirmar)));

  return sinFirmar + '.' + datosAB64url(firma);
}

// --- 2. El cifrado del contenido (aes128gcm, RFC 8291) ----------------------

async function hkdf(sal: Uint8Array, ikm: Uint8Array, info: Uint8Array, largo: number) {
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info }, base, largo * 8));
}

export async function cifrar(
  mensaje: string,
  p256dhCliente: string,
  authCliente: string,
  salFija?: Uint8Array,
  efimeraFija?: CryptoKeyPair
) {
  const clavePublicaCliente = b64urlADatos(p256dhCliente);
  const secretoAuth = b64urlADatos(authCliente);
  const sal = salFija ?? crypto.getRandomValues(new Uint8Array(16));

  const efimera = efimeraFija ?? await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

  const efimeraPublica = new Uint8Array(
    await crypto.subtle.exportKey('raw', efimera.publicKey));

  const cliente = await crypto.subtle.importKey(
    'raw', clavePublicaCliente, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  const compartido = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: cliente }, efimera.privateKey, 256));

  // El "info" lleva las dos claves publicas: eso ata el cifrado a este par
  // concreto de emisor y receptor.
  const infoIkm = unir(texto('WebPush: info\0'), clavePublicaCliente, efimeraPublica);
  const ikm = await hkdf(secretoAuth, compartido, infoIkm, 32);

  const claveContenido = await hkdf(sal, ikm, texto('Content-Encoding: aes128gcm\0'), 16);
  const nonce          = await hkdf(sal, ikm, texto('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', claveContenido, 'AES-GCM', false, ['encrypt']);

  // El 0x02 es el relleno que marca el final del ultimo registro.
  const cuerpo = unir(texto(mensaje), new Uint8Array([2]));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aes, cuerpo));

  // Cabecera del formato: sal(16) + tamaño de registro(4) + largo de la clave(1) + clave(65)
  const tam = new Uint8Array(4);
  new DataView(tam.buffer).setUint32(0, 4096);

  return unir(sal, tam, new Uint8Array([efimeraPublica.length]), efimeraPublica, cifrado);
}

// --- 3. Mandarlo -------------------------------------------------------------

export async function enviar(suscripcion: {
  endpoint: string; p256dh: string; auth: string;
}, mensaje: string, vapid: { publica: string; privada: string; contacto: string }) {
  const cuerpo = await cifrar(mensaje, suscripcion.p256dh, suscripcion.auth);
  const jwt = await cabeceraVapid(suscripcion.endpoint, vapid.publica, vapid.privada, vapid.contacto);

  return fetch(suscripcion.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Urgency': 'high',
      'Authorization': `vapid t=${jwt}, k=${vapid.publica}`
    },
    body: cuerpo
  });
}
