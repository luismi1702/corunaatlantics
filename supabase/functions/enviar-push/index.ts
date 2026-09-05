// Manda una notificación a todos los móviles del equipo.
//
// La llama la app cuando se publica un aviso o se cancela un entreno. Corre con
// permisos de servidor porque tiene que leer las suscripciones de todo el mundo,
// y eso obliga a comprobar por su cuenta quién está llamando: se le pregunta a
// la base de datos con el token de quien llama si esa persona lleva la sección
// de avisos. Sin eso, cualquiera con la clave pública del proyecto podría
// mandarle una notificación al equipo entero.
//
// Las suscripciones muertas se borran solas. Un móvil formateado, una app
// desinstalada o un permiso retirado devuelven 404 o 410, y guardarlas para
// siempre solo sirve para que cada envío tarde más cada vez.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { enviar } from './webpush.ts';

const URL_SB      = Deno.env.get('SUPABASE_URL')!;
const ANON        = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICIO    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUB   = Deno.env.get('VAPID_PUBLICA')!;
const VAPID_PRIV  = Deno.env.get('VAPID_PRIVADA')!;
const CONTACTO    = Deno.env.get('VAPID_CONTACTO') ?? 'mailto:atlantics@corunaatlantics.com';

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

  const autorizacion = req.headers.get('Authorization') ?? '';
  if (!autorizacion) return responder({ error: 'Sin credenciales' }, 401);

  // Quien llama, con SU token: si no lleva avisos, aquí se acaba.
  const comoUsuario = createClient(URL_SB, ANON, {
    global: { headers: { Authorization: autorizacion } }
  });

  const { data: puede, error: errorPermiso } =
    await comoUsuario.rpc('puede', { _seccion: 'avisos' });

  if (errorPermiso) return responder({ error: errorPermiso.message }, 401);
  if (!puede)       return responder({ error: 'No llevas los avisos' }, 403);

  const { titulo, cuerpo, url } = await req.json().catch(() => ({}));
  if (!titulo) return responder({ error: 'Falta el título' }, 400);

  // A partir de aquí, permisos de servidor: hay que leer las suscripciones de
  // todo el equipo, y nadie puede hacer eso desde la app.
  const comoServidor = createClient(URL_SB, SERVICIO);
  const { data: suscripciones, error } =
    await comoServidor.from('suscripciones_push').select('*');

  if (error) return responder({ error: error.message }, 500);
  if (!suscripciones?.length) return responder({ enviados: 0, caducados: 0 });

  const mensaje = JSON.stringify({
    titulo,
    cuerpo: cuerpo ?? '',
    url: url ?? '/app/'
  });

  const vapid = { publica: VAPID_PUB, privada: VAPID_PRIV, contacto: CONTACTO };

  const resultados = await Promise.all(suscripciones.map(async (s) => {
    try {
      const r = await enviar(s, mensaje, vapid);
      return { id: s.id, estado: r.status };
    } catch {
      return { id: s.id, estado: 0 };
    }
  }));

  // 404 y 410 significan "este destino ya no existe". Se limpian.
  const muertas = resultados.filter(r => r.estado === 404 || r.estado === 410).map(r => r.id);
  if (muertas.length) {
    await comoServidor.from('suscripciones_push').delete().in('id', muertas);
  }

  return responder({
    enviados:  resultados.filter(r => r.estado >= 200 && r.estado < 300).length,
    caducados: muertas.length,
    fallidos:  resultados.filter(r => r.estado === 0 || r.estado >= 500).length
  });
});
