// Manda una notificación a todos los móviles del equipo.
//
// La llama la app cuando se publica un aviso. Necesita leer las suscripciones
// de todo el mundo, y eso obliga a correr con permisos de servidor; por eso
// comprueba por su cuenta quién llama, preguntándole a la base de datos con el
// token de quien llama si esa persona lleva la sección de avisos. Sin eso,
// cualquiera con la clave pública del proyecto podría mandarle una notificación
// a la plantilla entera.
//
// Va con `fetch` pelado y sin el cliente de Supabase a propósito. Una función
// que se despliega a mano y se toca una vez al año no debería poder romperse
// porque una dependencia cambie: aquí lo único que puede fallar es la red.
//
// No usa la clave de servidor del proyecto. La uso al principio y salio mal:
// Supabase la esta jubilando y, cuando deja de dar permisos de servidor, la
// funcion lee la tabla vacia sin dar ningun error — un aviso que no suena y
// nada que mirar. Ahora las dos operaciones que necesita viven en la base de
// datos (`suscripciones_para_enviar` y `borrar_suscripciones`) y solo responden
// a quien lleva los avisos, asi que basta con el token de quien llama.

// El cifrado va aqui dentro, no en un fichero aparte. Separado se lee mejor,
// pero obliga a subir dos ficheros al desplegar a mano y, si el segundo no
// llega o se llama distinto, la funcion no arranca y el error que se ve desde
// fuera —BOOT_ERROR— no dice cual falta. Un fichero no se puede quedar a medias.

// ===========================================================================
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

async function cifrar(
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

async function enviar(suscripcion: {
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

// ===========================================================================


const URL_SB     = Deno.env.get('SUPABASE_URL')!;
const VAPID_PUB  = Deno.env.get('VAPID_PUBLICA')!;
const VAPID_PRIV = Deno.env.get('VAPID_PRIVADA')!;
const CONTACTO   = Deno.env.get('VAPID_CONTACTO') ?? 'mailto:atlantics@corunaatlantics.com';

// De un diccionario JSON de claves saca la primera que parezca una clave.
function deDiccionario(json: string | undefined): string | undefined {
  if (!json) return undefined;
  try {
    const buscar = (v: unknown): string | undefined => {
      if (typeof v === 'string' && (v.startsWith('sb_') || v.startsWith('eyJ'))) return v;
      if (v && typeof v === 'object') {
        for (const x of Object.values(v as Record<string, unknown>)) {
          const encontrado = buscar(x);
          if (encontrado) return encontrado;
        }
      }
      return undefined;
    };
    return buscar(JSON.parse(json));
  } catch { return undefined; }
}

// La cabecera `apikey` identifica al proyecto y la `Authorization` a la
// persona: son dos cosas distintas y no vale poner el token del usuario en las
// dos. Antes se toleraba; con las claves nuevas, no.
const CLAVE_PROYECTO =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  deDiccionario(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  deDiccionario(Deno.env.get('SUPABASE_SECRET_KEYS'));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

// Version del codigo. Sirve para una cosa muy concreta: saber desde fuera si lo
// que esta corriendo es lo que uno cree que subio. Sin esto, un despliegue que
// no llego a hacerse y un fallo de verdad se parecen demasiado.
const VERSION = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Comprobacion de vida, sin credenciales: solo dice que version corre y si
  // tiene sus secretos. No toca datos ni los enseña.
  // Ojo al nombre: mas abajo hay otra `url`, la del aviso. Dos declaraciones
  // del mismo nombre en el mismo ambito no compilan y la funcion ni arranca.
  const direccion = new URL(req.url);
  if (req.method === 'GET' || direccion.searchParams.has('ping')) {
    return responder({
      version: VERSION,
      vapid: Boolean(VAPID_PUB && VAPID_PRIV),
      clave: Boolean(CLAVE_PROYECTO)
    });
  }

  if (!CLAVE_PROYECTO) {
    return responder({ error: 'La función no encuentra la clave del proyecto.' }, 500);
  }
  if (!VAPID_PUB || !VAPID_PRIV) {
    return responder({ error: 'Faltan los secretos VAPID_PUBLICA o VAPID_PRIVADA.' }, 500);
  }

  const cabecera = req.headers.get('Authorization') ?? '';
  const token = cabecera.replace(/^Bearer\s+/i, '');
  if (!token) return responder({ error: 'Sin credenciales' }, 401);

  const comoQuienLlama = {
    apikey: CLAVE_PROYECTO,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const rpc = (nombre: string, cuerpo: unknown) =>
    fetch(`${URL_SB}/rest/v1/rpc/${nombre}`, {
      method: 'POST', headers: comoQuienLlama, body: JSON.stringify(cuerpo)
    });

  // ¿Quién llama, y lleva los avisos?
  const permiso = await rpc('puede', { _seccion: 'avisos' });

  // Con el motivo dentro: un 401 a secas no dice si falta la clave, si el token
  // no vale o si la funcion `puede` no esta.
  if (!permiso.ok) {
    return responder({
      error: 'Comprobando quién llama: ' + permiso.status + ' ' + (await permiso.text()).slice(0, 300)
    }, 401);
  }
  if (await permiso.json() !== true) return responder({ error: 'No llevas los avisos' }, 403);

  const { titulo, cuerpo, url } = await req.json().catch(() => ({}));
  if (!titulo) return responder({ error: 'Falta el título' }, 400);

  // La base de datos decide qué se puede leer; aquí no hay ninguna llave que
  // se salte las políticas.
  const consulta = await rpc('suscripciones_para_enviar', {});
  const crudo = await consulta.text();

  if (!consulta.ok) {
    return responder({ error: 'Leyendo suscripciones: ' + consulta.status + ' ' + crudo.slice(0, 300) }, 500);
  }

  let suscripciones: Record<string, string>[] = [];
  try { suscripciones = JSON.parse(crudo); } catch { /* abajo se cuenta como cero */ }

  // Si no hay a quien mandar, se dice POR QUE. Un cero puede ser "nadie lo ha
  // activado" o "la consulta no devolvio lo que parecia": desde el movil se ven
  // igual, y distinguirlos a base de conjeturas cuesta una tarde.
  if (!suscripciones.length) {
    return responder({
      enviados: 0, caducados: 0, fallidos: 0,
      diagnostico: 'rpc ' + consulta.status + ' · ' + crudo.slice(0, 200) +
        ' · version ' + VERSION + ' · clave ' + (CLAVE_PROYECTO ?? '').slice(0, 12)
    });
  }

  const mensaje = JSON.stringify({ titulo, cuerpo: cuerpo ?? '', url: url ?? '/app/' });
  const vapid = { publica: VAPID_PUB, privada: VAPID_PRIV, contacto: CONTACTO };

  const resultados = await Promise.all(suscripciones.map(async (s: Record<string, string>) => {
    try {
      const r = await enviar({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, mensaje, vapid);
      return { id: s.id, estado: r.status };
    } catch {
      return { id: s.id, estado: 0 };
    }
  }));

  // 404 y 410 significan "este destino ya no existe": movil formateado, app
  // desinstalada, permiso retirado. Guardarlas solo hace mas lento cada envio.
  const muertas = resultados.filter(r => r.estado === 404 || r.estado === 410).map(r => r.id);
  if (muertas.length) await rpc('borrar_suscripciones', { p_ids: muertas });

  return responder({
    enviados:  resultados.filter(r => r.estado >= 200 && r.estado < 300).length,
    caducados: muertas.length,
    fallidos:  resultados.filter(r => r.estado === 0 || r.estado >= 500).length
  });
});
