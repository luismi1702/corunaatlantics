// Acceso a datos. Todo lo que habla con Supabase pasa por aquí, para que las
// vistas no tengan que saber cómo está montada la base de datos.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Lanza el error de Supabase en vez de devolver { data, error }: así cualquier
// fallo sube hasta el manejador de la vista y se ve en pantalla, en vez de
// quedarse en silencio con una lista vacía.
const ok = ({ data, error }) => { if (error) throw error; return data; };

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

// --- Roster ---------------------------------------------------------------

// Solo gente aprobada: una solicitud sin resolver no es plantilla y no debe
// aparecer en el roster, ni en cuotas, ni en papeles.
export const roster = () =>
  sb.from('perfiles')
    .select('*')
    .eq('acceso', 'aprobado')
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
