// Acceso a datos. Todo lo que habla con Supabase pasa por aquí, para que las
// vistas no tengan que saber cómo está montada la base de datos.

// Version fija a proposito. Con @2 el CDN sirve la ultima que haya salido, asi
// que la app podia cambiar de comportamiento una mañana sin que nadie tocara
// nada. Para algo de lo que depende un equipo, eso no compensa.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { hoyISO } from './ui.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Al volver a la app despues de un rato, refrescar la sesion antes de nada.
//
// El permiso para entrar caduca cada hora y la libreria lo renueva sola con un
// temporizador. Pero un movil suspende la app en cuanto la dejas: el
// temporizador no corre, y al volver el permiso esta caducado. Sin esto, la
// primera consulta que haga la pantalla falla y parece que se ha cerrado la
// sesion cuando en realidad solo habia que renovarla.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sb.auth.getSession().catch(() => { /* si no hay red, ya se vera al pulsar */ });
    }
  });
}

// Lanza el error de Supabase en vez de devolver { data, error }: así cualquier
// fallo sube hasta el manejador de la vista y se ve en pantalla, en vez de
// quedarse en silencio con una lista vacía.
const ok = ({ data, error }) => { if (error) throw error; return data; };

// Los errores de Supabase llegan en inglés y en jerga. Los que puede ver una
// persona normal se traducen a algo que explique qué ha pasado y qué hacer.
const TRADUCCIONES = [
  [/email rate limit exceeded/i,
   'Se han enviado demasiados correos en poco tiempo. Espera un rato y vuelve a intentarlo.'],
  [/you can only request this after (\d+) seconds?/i,
   'Acabas de pedir un enlace. Espera $1 segundos y vuelve a intentarlo.'],
  [/(invalid|expired).*(link|token)|token has expired/i,
   'Ese código ya no vale: han pasado demasiados minutos o ya lo habías usado. Pide otro.'],
  [/token.*not found|invalid otp/i,
   'El código no es correcto. Míralo otra vez en el correo.'],
  [/signups? not allowed/i,
   'El registro está cerrado ahora mismo. Habla con alguien del club.'],
  [/invalid email/i, 'Ese email no parece válido.'],
  [/failed to fetch|networkerror|load failed/i,
   'No hay conexión con el servidor. Comprueba los datos del móvil y reinténtalo.'],
  [/jwt|invalid api key/i,
   'La app no ha podido identificarse con el servidor. Avisa a quien la administra.']
];

export function traducirError(e) {
  const texto = e?.message ?? String(e ?? '');
  for (const [patron, mensaje] of TRADUCCIONES) {
    const m = texto.match(patron);
    if (m) return mensaje.replace('$1', m[1] ?? '');
  }
  return texto;
}

// --- Sesión ---------------------------------------------------------------

export async function sesion() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function entrar(email) {
  return sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  }).then(ok);
}

// El mismo correo trae tambien un codigo de seis cifras, y esto lo canjea.
// Existe por el iPhone: una app instalada en la pantalla de inicio guarda su
// sesion aparte de Safari, asi que abrir el enlace desde el correo abre Safari
// y deja la app como estaba. Tecleando el codigo dentro de la app, la sesion se
// crea donde tiene que estar.
export const entrarConCodigo = (email, codigo) =>
  sb.auth.verifyOtp({ email, token: String(codigo).trim(), type: 'email' }).then(ok);

export const salir = () => sb.auth.signOut();

export async function miPerfil() {
  const s = await sesion();
  if (!s) return null;
  const filas = await sb.from('perfiles').select('*').eq('user_id', s.user.id).limit(1).then(ok);
  return filas[0] ?? null;
}

// --- Temporadas -----------------------------------------------------------

export async function temporadaActiva() {
  const filas = await sb.from('temporadas').select('*').eq('activa', true).limit(1).then(ok);
  return filas[0] ?? null;
}

export const temporadas = () =>
  sb.from('temporadas').select('*').order('fecha_inicio', { ascending: false }).then(ok);

export const guardarTemporada = (id, cambios) =>
  sb.from('temporadas').update(cambios).eq('id', id).select().single().then(ok);

export const crearTemporada = (datos) =>
  sb.from('temporadas').insert(datos).select().single().then(ok);

// Prepara cuota y documentación de toda la plantilla activa de una vez.
export const abrirTemporada = (id) =>
  sb.rpc('abrir_temporada', { p_temporada: id }).then(ok);

// Pone al importe vigente las cuotas que se quedaron a cero, para cuando el
// precio se fija después de que la gente ya se haya registrado.
export const aplicarImporteCuota = (id) =>
  sb.rpc('aplicar_importe_cuota', { p_temporada: id }).then(ok);

// --- Roster ---------------------------------------------------------------

// Las solicitudes sin resolver no son plantilla y no salen aquí. Quien tiene el
// acceso quitado sí sale: sigue siendo del club, solo que no entra en la app, y
// hace falta encontrarle para poder devolvérselo.
export const roster = () =>
  sb.from('perfiles')
    .select('*')
    .in('acceso', ['aprobado', 'rechazado'])
    .order('estado')
    .order('dorsal', { ascending: true, nullsFirst: false })
    .order('nombre')
    .then(ok);

export const jugador = (id) =>
  sb.from('perfiles').select('*').eq('id', id).single().then(ok);

export const crearJugador = (datos) =>
  sb.from('perfiles').insert(datos).select().single().then(ok);

export const guardarJugador = (id, cambios) =>
  sb.from('perfiles').update(cambios).eq('id', id).select().single().then(ok);

// El dorsal lo bloquea un índice único, así que dos jugadores tocando el mismo
// número a la vez terminan con uno de los dos recibiendo un error de duplicado.
// Aquí se traduce a algo que se entienda.
export async function elegirDorsal(jugadorId, dorsal) {
  try {
    return await guardarJugador(jugadorId, { dorsal });
  } catch (e) {
    if (String(e.message).includes('perfiles_dorsal_activo')) {
      throw new Error('Ese dorsal lo acaba de coger otro. Elige otro número.');
    }
    throw e;
  }
}

// Quitar el acceso no toca nada de su histórico: ni pagos, ni asistencia, ni
// documentación. Es lo que se quiere casi siempre al pensar "quiero eliminar a
// este".
export const cambiarAcceso = (id, acceso, motivo = null) =>
  sb.from('perfiles')
    .update({ acceso, motivo_rechazo: acceso === 'rechazado' ? motivo : null,
              resuelto_en: new Date().toISOString() })
    .eq('id', id).select().single().then(ok);

export const borrarJugador = (id) =>
  sb.from('perfiles').delete().eq('id', id).then(ok);

// --- Cuotas y pagos -------------------------------------------------------

export const cuotasDe = (temporadaId) =>
  sb.from('cuotas_estado').select('*').eq('temporada_id', temporadaId).then(ok);

export const cuotaDe = async (jugadorId, temporadaId) => {
  const filas = await sb.from('cuotas_estado').select('*')
    .eq('jugador_id', jugadorId).eq('temporada_id', temporadaId).limit(1).then(ok);
  return filas[0] ?? null;
};

// Crea la cuota si el jugador todavía no la tenía (alta a media temporada).
export async function asegurarCuota(jugadorId, temporada) {
  const existente = await cuotaDe(jugadorId, temporada.id);
  if (existente) return existente;
  await sb.from('cuotas').insert({
    jugador_id: jugadorId,
    temporada_id: temporada.id,
    importe_total: temporada.importe_cuota
  }).then(ok);
  return cuotaDe(jugadorId, temporada.id);
}

export const pagosDe = (cuotaId) =>
  sb.from('pagos').select('*').eq('cuota_id', cuotaId).order('fecha', { ascending: false }).then(ok);

export const registrarPago = (datos) =>
  sb.from('pagos').insert(datos).select().single().then(ok);

export const borrarPago = (id) =>
  sb.from('pagos').delete().eq('id', id).then(ok);

export const guardarCuota = (id, cambios) =>
  sb.from('cuotas').update(cambios).eq('id', id).select().single().then(ok);

// --- Documentación --------------------------------------------------------

export const documentacionDe = (temporadaId) =>
  sb.from('documentacion').select('*').eq('temporada_id', temporadaId).then(ok);

export async function asegurarDocumentacion(jugadorId, temporadaId) {
  const filas = await sb.from('documentacion').select('*')
    .eq('jugador_id', jugadorId).eq('temporada_id', temporadaId).limit(1).then(ok);
  if (filas[0]) return filas[0];
  return sb.from('documentacion')
    .insert({ jugador_id: jugadorId, temporada_id: temporadaId })
    .select().single().then(ok);
}

export const guardarDocumentacion = (id, cambios) =>
  sb.from('documentacion').update(cambios).eq('id', id).select().single().then(ok);

// --- Tesorería ------------------------------------------------------------
// Los pagos de cuota NO se apuntan aquí: ya están en `pagos`, y el resumen los
// suma por su lado. Duplicarlos inflaría el saldo.

export const movimientosDe = (temporadaId) =>
  sb.from('movimientos').select('*')
    .eq('temporada_id', temporadaId)
    .order('fecha', { ascending: false })
    .then(ok);

export const registrarMovimiento = (datos) =>
  sb.from('movimientos').insert(datos).select().single().then(ok);

export const guardarMovimiento = (id, cambios) =>
  sb.from('movimientos').update(cambios).eq('id', id).select().single().then(ok);

export const borrarMovimiento = (id) =>
  sb.from('movimientos').delete().eq('id', id).then(ok);

export async function resumenTesoreria(temporadaId) {
  const filas = await sb.from('tesoreria_resumen').select('*')
    .eq('temporada_id', temporadaId).limit(1).then(ok);
  return filas[0] ?? null;
}

// --- Calendario y asistencia ----------------------------------------------

export const horarios = (temporadaId) =>
  sb.from('horarios_entreno').select('*')
    .eq('temporada_id', temporadaId)
    .order('dia_semana').order('hora')
    .then(ok);

export const crearHorario = (datos) =>
  sb.from('horarios_entreno').insert(datos).select().single().then(ok);

export const guardarHorario = (id, cambios) =>
  sb.from('horarios_entreno').update(cambios).eq('id', id).select().single().then(ok);

export const borrarHorario = (id) =>
  sb.from('horarios_entreno').delete().eq('id', id).then(ok);

// Materializa los entrenos del horario semanal hasta la fecha indicada.
export const generarEntrenos = (temporadaId, hasta) =>
  sb.rpc('generar_entrenos', { p_temporada: temporadaId, p_hasta: hasta }).then(ok);

export const eventos = (temporadaId, { desde, hasta } = {}) => {
  let q = sb.from('eventos').select('*').eq('temporada_id', temporadaId);
  if (desde) q = q.gte('fecha', desde);
  if (hasta) q = q.lte('fecha', hasta);
  return q.order('fecha').order('hora', { nullsFirst: true }).then(ok);
};

export const evento = (id) =>
  sb.from('eventos').select('*').eq('id', id).single().then(ok);

export const crearEvento = (datos) =>
  sb.from('eventos').insert(datos).select().single().then(ok);

export const guardarEvento = (id, cambios) =>
  sb.from('eventos').update(cambios).eq('id', id).select().single().then(ok);

export const borrarEvento = (id) =>
  sb.from('eventos').delete().eq('id', id).then(ok);

export const asistenciasDe = (eventoId) =>
  sb.from('asistencias').select('*').eq('evento_id', eventoId).then(ok);

// Un solo toque en la lista: se inserta o se actualiza sin preguntar antes.
export const marcarAsistencia = (eventoId, jugadorId, estado, registradoPor) =>
  sb.from('asistencias')
    .upsert({ evento_id: eventoId, jugador_id: jugadorId, estado, registrado_por: registradoPor },
            { onConflict: 'evento_id,jugador_id' })
    .select().single().then(ok);

export const quitarAsistencia = (eventoId, jugadorId) =>
  sb.from('asistencias').delete().eq('evento_id', eventoId).eq('jugador_id', jugadorId).then(ok);

export const resumenAsistencia = (temporadaId) =>
  sb.from('asistencia_resumen').select('*').eq('temporada_id', temporadaId).then(ok);

// --- Disponibilidad para jugar --------------------------------------------

export const aptitud = (temporadaId) =>
  sb.from('aptitud_jugadores').select('*').eq('temporada_id', temporadaId).then(ok);

// --- La parte del jugador -------------------------------------------------
// Las políticas RLS ya limitan lo que devuelve cada consulta: un jugador solo
// lee sus propias filas aunque la consulta no lo pida.

export const misAsistencias = (jugadorId) =>
  sb.from('asistencias').select('*').eq('jugador_id', jugadorId).then(ok);

// El jugador escribe su confirmación; el estado de la lista lo pone el staff y
// un disparador impide que se lo toque.
export const confirmarAsistencia = (eventoId, jugadorId, valor) =>
  sb.from('asistencias')
    .upsert({ evento_id: eventoId, jugador_id: jugadorId, confirmacion: valor },
            { onConflict: 'evento_id,jugador_id' })
    .select().single().then(ok);

export const companeros = () =>
  sb.from('companeros').select('*')
    .order('dorsal', { ascending: true, nullsFirst: false })
    .order('nombre')
    .then(ok);

export async function confirmadosDe(eventoId) {
  const filas = await sb.rpc('confirmados_de', { p_evento: eventoId }).then(ok);
  return filas?.[0] ?? { voy: 0, no_voy: 0, duda: 0 };
}

// --- Solicitudes de alta ---------------------------------------------------

export const solicitudes = () =>
  sb.from('perfiles').select('*').eq('acceso', 'pendiente')
    .order('solicitado_en', { ascending: true })
    .then(ok);

export const resolverSolicitud = (jugadorId, aprobar, motivo = null) =>
  sb.rpc('resolver_solicitud', {
    p_jugador: jugadorId, p_aprobar: aprobar, p_motivo: motivo
  }).then(ok);

// El jugador entrega su ficha: los datos y el salto de "nuevo" a "pendiente".
// Que ese salto sea legal lo decide un disparador, no esta función.
export const entregarSolicitud = (jugadorId, datos) =>
  sb.from('perfiles').update({ ...datos, acceso: 'pendiente' })
    .eq('id', jugadorId).select().single().then(ok);

// --- Avisos ---------------------------------------------------------------
// Unidireccionales a propósito: el club publica y el equipo lee.

export const avisos = (temporadaId) =>
  sb.from('avisos').select('*')
    .eq('temporada_id', temporadaId)
    .order('fijado', { ascending: false })
    .order('creado_en', { ascending: false })
    .then(ok);

export const crearAviso = (datos) =>
  sb.from('avisos').insert(datos).select().single().then(ok);

export const guardarAviso = (id, cambios) =>
  sb.from('avisos').update(cambios).eq('id', id).select().single().then(ok);

export const borrarAviso = (id) =>
  sb.from('avisos').delete().eq('id', id).then(ok);

export const lecturasDe = (avisoId) =>
  sb.from('lecturas_aviso').select('*').eq('aviso_id', avisoId).then(ok);

export const misLecturas = (jugadorId) =>
  sb.from('lecturas_aviso').select('aviso_id').eq('jugador_id', jugadorId).then(ok);

// Marcar como leído no debe fallar si ya estaba marcado: se ignora el duplicado.
export const marcarLeido = (avisoId, jugadorId) =>
  sb.from('lecturas_aviso')
    .upsert({ aviso_id: avisoId, jugador_id: jugadorId }, { onConflict: 'aviso_id,jugador_id' })
    .then(({ error }) => { if (error) throw error; });

// --- Material -------------------------------------------------------------

export const material = () =>
  sb.from('material_estado').select('*').order('tipo').order('identificador').then(ok);

export const crearMaterial = (datos) =>
  sb.from('material').insert(datos).select().single().then(ok);

export const guardarMaterial = (id, cambios) =>
  sb.from('material').update(cambios).eq('id', id).select().single().then(ok);

export const borrarMaterial = (id) =>
  sb.from('material').delete().eq('id', id).then(ok);

export const entregarMaterial = (datos) =>
  sb.from('prestamos_material').insert(datos).select().single().then(ok);

export const devolverMaterial = (prestamoId, cambios) =>
  sb.from('prestamos_material').update({ devuelto_en: hoyISO(), ...cambios })
    .eq('id', prestamoId).select().single().then(ok);

export const misPrestamos = (jugadorId) =>
  sb.from('prestamos_material').select('*, material(*)')
    .eq('jugador_id', jugadorId).is('devuelto_en', null)
    .then(ok);

// --- Equipación y pedidos --------------------------------------------------

export const productos = () =>
  sb.from('productos').select('*').order('activo', { ascending: false }).order('nombre').then(ok);

export const crearProducto = (datos) =>
  sb.from('productos').insert(datos).select().single().then(ok);

export const guardarProducto = (id, cambios) =>
  sb.from('productos').update(cambios).eq('id', id).select().single().then(ok);

export const borrarProducto = (id) =>
  sb.from('productos').delete().eq('id', id).then(ok);

export const pedidos = () =>
  sb.from('pedidos').select('*').order('creado_en', { ascending: false }).then(ok);

export const misPedidos = (jugadorId) =>
  sb.from('pedidos').select('*').eq('jugador_id', jugadorId)
    .order('creado_en', { ascending: false }).then(ok);

export const crearPedido = (datos) =>
  sb.from('pedidos').insert(datos).select().single().then(ok);

export const guardarPedido = (id, cambios) =>
  sb.from('pedidos').update(cambios).eq('id', id).select().single().then(ok);

export const borrarPedido = (id) =>
  sb.from('pedidos').delete().eq('id', id).then(ok);

// La foto se guarda en el almacén de Supabase y en el producto solo va su URL.
// El nombre lleva la marca de tiempo para que cambiar la foto de un producto no
// pise la anterior mientras alguien la esté viendo.
//
// Antes de subirla se encoge. Una foto recien hecha con el movil pesa entre 3 y
// 5 MB, y esa foto se sube una vez pero se la descargan todos los jugadores
// cada vez que abren la tienda. A 1200 px de lado se ve igual de bien en un
// movil y baja a unos 200 KB. Si algo falla —un formato raro, un navegador
// viejo— se sube la original: mejor pesada que no subir nada.
async function encoger(archivo, lado = 1200, calidad = 0.82) {
  if (!archivo.type.startsWith('image/')) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && archivo.size < 400_000) return archivo;

    const lienzo = document.createElement('canvas');
    lienzo.width  = Math.round(bitmap.width  * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    bitmap.close?.();

    const trozo = await new Promise(r => lienzo.toBlob(r, 'image/jpeg', calidad));
    if (!trozo || trozo.size >= archivo.size) return archivo;
    return new File([trozo], 'foto.jpg', { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}

export async function subirFotoProducto(original) {
  const archivo = await encoger(original);
  const extension = (archivo.name.split('.').pop() || 'jpg').toLowerCase();
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await sb.storage.from('productos')
    .upload(nombre, archivo, { cacheControl: '31536000', upsert: false, contentType: archivo.type });
  if (error) throw error;

  return sb.storage.from('productos').getPublicUrl(nombre).data.publicUrl;
}

// Cobrar es apuntar: marca el pedido y mete ese dinero en la caja de una vez.
// Si quien cobra no lleva la tesoreria, solo marca; el apunte lo hara luego
// quien lleve las cuentas.
export const cobrarPedido = (pedidoId, pagado, temporadaId) =>
  sb.rpc('cobrar_pedido',
    { p_pedido: pedidoId, p_pagado: pagado, p_temporada: temporadaId }).then(ok);

// Y la escoba: lo que se cobro sin apuntar entra en la caja de golpe.
export const apuntarTiendaEnTesoreria = (productoId, temporadaId) =>
  sb.rpc('apuntar_tienda_en_tesoreria',
    { p_producto: productoId, p_temporada: temporadaId }).then(ok);

// --- Avisos al movil -------------------------------------------------------

// Una fila por dispositivo. Si ese endpoint ya estaba —el mismo movil que
// vuelve a activarlo— se actualiza en vez de duplicarse.
export const guardarSuscripcion = (perfilId, s) =>
  sb.from('suscripciones_push')
    .upsert({ perfil_id: perfilId, ...s }, { onConflict: 'endpoint' })
    .then(ok);

export const borrarSuscripcion = (endpoint) =>
  sb.from('suscripciones_push').delete().eq('endpoint', endpoint).then(ok);

export const movilesConAvisos = () => sb.rpc('moviles_con_avisos').then(ok);

// Manda la notificacion a todo el equipo. Lo hace una funcion en el servidor:
// desde aqui no se pueden leer las suscripciones de los demas, ni debe poderse.
export async function avisarAlMovil(titulo, cuerpo, url) {
  const { data, error } = await sb.functions.invoke('enviar-push', {
    body: { titulo, cuerpo, url }
  });
  if (!error) return data;

  // El error que devuelve invoke() es siempre el mismo texto generico ("non-2xx
  // status code"), y el motivo de verdad viene en el cuerpo de la respuesta.
  // Sin sacarlo de ahi, un fallo de configuracion y uno de permisos parecen
  // identicos desde el movil, que es justo cuando hace falta saberlo.
  let detalle = '';
  try {
    const r = error.context;
    if (r && typeof r.text === 'function') {
      const texto = await r.text();
      try { detalle = JSON.parse(texto).error ?? texto; } catch { detalle = texto; }
      if (r.status) detalle = r.status + ': ' + detalle;
    }
  } catch { /* si no se puede leer, queda el generico */ }

  throw new Error(detalle || error.message);
}

// --- Permisos por seccion --------------------------------------------------

// Las llaves de quien pregunta. Va por funcion y no por consulta a la tabla
// porque la tabla solo deja ver las propias, y asi no depende de esa politica.
export const misPermisos = () =>
  sb.rpc('mis_permisos').then(ok).then(filas => filas.map(f => f.seccion));

export const permisosDe = (perfilId) =>
  sb.from('permisos').select('seccion').eq('perfil_id', perfilId)
    .then(ok).then(filas => filas.map(f => f.seccion));

export const darPermiso = (perfilId, seccion) =>
  sb.from('permisos').upsert({ perfil_id: perfilId, seccion },
    { onConflict: 'perfil_id,seccion' }).then(ok);

export const quitarPermiso = (perfilId, seccion) =>
  sb.from('permisos').delete().eq('perfil_id', perfilId).eq('seccion', seccion).then(ok);

// --- Competiciones y estadisticas ------------------------------------------

export const competiciones = (temporadaId) =>
  sb.from('competiciones').select('*').eq('temporada_id', temporadaId)
    .order('activa', { ascending: false }).order('nombre').then(ok);

export const crearCompeticion = (datos) =>
  sb.from('competiciones').insert(datos).select().single().then(ok);

export const guardarCompeticion = (id, cambios) =>
  sb.from('competiciones').update(cambios).eq('id', id).select().single().then(ok);

export const borrarCompeticion = (id) =>
  sb.from('competiciones').delete().eq('id', id).then(ok);

// Los equipos que juegan la competicion. Uno de ellos somos nosotros.
export const equiposDe = (competicionId) =>
  sb.from('equipos_competicion').select('*').eq('competicion_id', competicionId)
    .order('es_nuestro', { ascending: false }).order('nombre').then(ok);

export const crearEquipoCompeticion = (datos) =>
  sb.from('equipos_competicion').insert(datos).select().single().then(ok);

export const guardarEquipoCompeticion = (id, cambios) =>
  sb.from('equipos_competicion').update(cambios).eq('id', id).select().single().then(ok);

export const borrarEquipoCompeticion = (id) =>
  sb.from('equipos_competicion').delete().eq('id', id).then(ok);

// Todos los partidos de la liga, no solo los nuestros: sin los de los demas la
// clasificacion no sale.
export const partidosDe = (competicionId) =>
  sb.from('partidos_competicion').select('*').eq('competicion_id', competicionId)
    .order('fecha', { ascending: true, nullsFirst: false })
    .order('jornada', { ascending: true, nullsFirst: false })
    .then(ok);

export const crearPartidoCompeticion = (datos) =>
  sb.from('partidos_competicion').insert(datos).select().single().then(ok);

export const guardarPartidoCompeticion = (id, cambios) =>
  sb.from('partidos_competicion').update(cambios).eq('id', id).select().single().then(ok);

export const borrarPartidoCompeticion = (id) =>
  sb.from('partidos_competicion').delete().eq('id', id).then(ok);

// El partido de liga al que corresponde una entrada del calendario, si la hay.
export const partidoDeEvento = (eventoId) =>
  sb.from('partidos_competicion').select('*').eq('evento_id', eventoId).maybeSingle().then(ok);

// La tabla no se teclea: sale de los partidos. Se ordena por puntos y, a
// igualdad, por diferencia de puntos, que es el desempate habitual.
export const clasificacion = (competicionId) =>
  sb.from('clasificacion').select('*').eq('competicion_id', competicionId)
    .order('puntos', { ascending: false })
    .order('diferencia', { ascending: false })
    .order('puntos_favor', { ascending: false })
    .then(ok);

// Nuestros partidos viven en dos sitios: en la tabla de la liga, que es de
// donde sale la clasificacion, y en el calendario, que es donde se pasa lista y
// se meten las estadisticas. Esto mantiene el segundo al dia a partir del
// primero para que nadie escriba el mismo partido dos veces.
export async function sincronizarEventoDePartido(partido, { temporadaId, equipos }) {
  const nuestro = equipos.find(e => e.es_nuestro);
  const enCasa  = !!nuestro && partido.local_id === nuestro.id;
  const fuera   = !!nuestro && partido.visitante_id === nuestro.id;

  // Si deja de ser nuestro, el evento que arrastraba sobra.
  if (!enCasa && !fuera) {
    if (partido.evento_id) {
      await guardarPartidoCompeticion(partido.id, { evento_id: null });
      await borrarEvento(partido.evento_id);
    }
    return null;
  }

  const rival = equipos.find(e => e.id === (enCasa ? partido.visitante_id : partido.local_id));
  const datos = {
    temporada_id:   temporadaId,
    tipo:           'partido',
    fecha:          partido.fecha,
    hora:           partido.hora,
    lugar:          partido.lugar,
    rival:          rival ? rival.nombre : null,
    es_local:       enCasa,
    competicion_id: partido.competicion_id,
    puntos_favor:   enCasa ? partido.puntos_local : partido.puntos_visitante,
    puntos_contra:  enCasa ? partido.puntos_visitante : partido.puntos_local
  };

  if (partido.evento_id) {
    await guardarEvento(partido.evento_id, datos);
    return partido.evento_id;
  }
  const evento = await crearEvento(datos);
  await guardarPartidoCompeticion(partido.id, { evento_id: evento.id });
  return evento.id;
}

// Y al reves: el marcador tambien se toca desde el partido del calendario, que
// es donde se esta al acabar. Si ese partido es de una competicion, la tabla
// tiene que enterarse.
export async function sincronizarPartidoDeEvento(evento) {
  const partido = await partidoDeEvento(evento.id);
  if (!partido) return null;

  const nuestros = { pf: evento.puntos_favor, pc: evento.puntos_contra };
  return guardarPartidoCompeticion(partido.id, evento.es_local
    ? { puntos_local: nuestros.pf, puntos_visitante: nuestros.pc }
    : { puntos_local: nuestros.pc, puntos_visitante: nuestros.pf });
}

// Estadisticas de un partido, tal cual estan guardadas.
export const estadisticasDe = (eventoId) =>
  sb.from('estadisticas').select('*').eq('evento_id', eventoId).then(ok);

// Se guardan todas las de un jugador de golpe: las que quedan a cero se borran
// para no llenar la tabla de filas vacias.
export async function guardarEstadisticas(eventoId, jugadorId, valores) {
  const conValor = Object.entries(valores).filter(([, v]) => Number(v) > 0);
  const enCero   = Object.entries(valores).filter(([, v]) => !(Number(v) > 0)).map(([k]) => k);

  if (enCero.length) {
    const { error } = await sb.from('estadisticas').delete()
      .eq('evento_id', eventoId).eq('jugador_id', jugadorId).in('clave', enCero);
    if (error) throw error;
  }
  if (conValor.length) {
    const { error } = await sb.from('estadisticas').upsert(
      conValor.map(([clave, valor]) => ({ evento_id: eventoId, jugador_id: jugadorId, clave, valor: Number(valor) })),
      { onConflict: 'evento_id,jugador_id,clave' });
    if (error) throw error;
  }
}

export const estadisticasTemporada = (temporadaId) =>
  sb.from('estadisticas_temporada').select('*').eq('temporada_id', temporadaId).then(ok);

export const estadisticasHistorico = () =>
  sb.from('estadisticas_historico').select('*').then(ok);
