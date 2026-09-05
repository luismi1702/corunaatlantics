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

import { enviar } from './webpush.ts';

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
