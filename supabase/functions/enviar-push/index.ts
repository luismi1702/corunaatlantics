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
// Las claves: Supabase esta jubilando los nombres de siempre en favor de unos
// diccionarios JSON. Se miran los dos, porque segun cuando se creara el
// proyecto existe uno u otro.

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

const CLAVE_SERVIDOR =
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!CLAVE_SERVIDOR) {
    return responder({ error: 'La función no encuentra la clave de servidor del proyecto.' }, 500);
  }
  if (!VAPID_PUB || !VAPID_PRIV) {
    return responder({ error: 'Faltan los secretos VAPID_PUBLICA o VAPID_PRIVADA.' }, 500);
  }

  const cabecera = req.headers.get('Authorization') ?? '';
  const token = cabecera.replace(/^Bearer\s+/i, '');
  if (!token) return responder({ error: 'Sin credenciales' }, 401);

  // ¿Quién llama, y lleva los avisos? Con SU token, no con el del servidor.
  const permiso = await fetch(`${URL_SB}/rest/v1/rpc/puede`, {
    method: 'POST',
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ _seccion: 'avisos' })
  });

  if (!permiso.ok) return responder({ error: 'No se ha podido comprobar quién llama' }, 401);
  if (await permiso.json() !== true) return responder({ error: 'No llevas los avisos' }, 403);

  const { titulo, cuerpo, url } = await req.json().catch(() => ({}));
  if (!titulo) return responder({ error: 'Falta el título' }, 400);

  // A partir de aquí, permisos de servidor.
  const delServidor = {
    apikey: CLAVE_SERVIDOR,
    Authorization: `Bearer ${CLAVE_SERVIDOR}`,
    'Content-Type': 'application/json'
  };

  const consulta = await fetch(`${URL_SB}/rest/v1/suscripciones_push?select=*`, { headers: delServidor });
  if (!consulta.ok) return responder({ error: await consulta.text() }, 500);

  const suscripciones = await consulta.json();
  if (!suscripciones.length) return responder({ enviados: 0, caducados: 0, fallidos: 0 });

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
  if (muertas.length) {
    await fetch(`${URL_SB}/rest/v1/suscripciones_push?id=in.(${muertas.join(',')})`,
      { method: 'DELETE', headers: delServidor });
  }

  return responder({
    enviados:  resultados.filter(r => r.estado >= 200 && r.estado < 300).length,
    caducados: muertas.length,
    fallidos:  resultados.filter(r => r.estado === 0 || r.estado >= 500).length
  });
});
