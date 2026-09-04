// Sustituto de db.js con datos inventados, para ver la app sin Supabase.
// Lo carga demo.html mediante un import map. Nada de esto sale del navegador:
// los cambios viven en memoria y se pierden al recargar.

const hoy = new Date();
const enDias = (n) => new Date(hoy.getTime() + n * 864e5).toISOString().slice(0, 10);

const TEMPORADA = {
  id: 't1', nombre: '2026-27',
  fecha_inicio: '2026-09-01', fecha_fin: '2027-06-30',
  activa: true, importe_cuota: 180, permite_plazos: true
};

const nombres = [
  ['Luis Miguel','Pérez',7,['QB'],'activo'],
  ['Diego','Varela',22,['RB','KR'],'activo'],
  ['Andrés','Ferreiro',88,['WR'],'activo'],
  ['Martín','Souto',54,['OL','C'],'activo'],
  ['Iago','Rodríguez',91,['DL','DE'],'lesionado'],
  ['Brais','Otero',33,['LB'],'activo'],
  ['Xabier','Lema',5,['CB','S'],'activo'],
  ['Nicolás','Vidal',80,['TE'],'activo'],
  ['Adrián','Castro',66,['OG'],'activo'],
  ['Hugo','Miranda',12,['WR','PR'],'activo'],
  ['Samuel','Barreiro',44,['FB','LB'],'activo'],
  ['Pablo','Insua',99,['DT'],'activo'],
  ['Rubén','Doval',3,['K','P'],'activo'],
  ['Marcos','Piñeiro',null,['DB'],'activo'],
  ['Álex','Nogueira',21,['S'],'baja_temporal'],
  ['Sergio','Quintela',70,['OT'],'activo'],
  ['Tomás','Rial',18,['WR'],'activo'],
  ['Antón','Salgado',9,['QB'],'baja']
].map(([nombre, apellidos, dorsal, posiciones, estado], i) => ({
  id: 'p' + i,
  user_id: i === 0 ? 'u1' : null,
  nombre, apellidos, apodo: null, dorsal, posiciones,
  rol: i === 0 ? 'admin' : 'jugador',
  email: (nombre.split(' ')[0] + '.' + apellidos).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '@ejemplo.com',
  telefono: i % 4 === 0 ? null : '6' + String(10000000 + i * 137171).slice(0, 8),
  fecha_nacimiento: i % 5 === 0 ? null : (1990 + (i % 12)) + '-04-1' + (i % 9),
  dni: null, talla_equipacion: ['M','L','XL','XXL'][i % 4],
  foto_url: null, estado,
  alta_en: '2026-09-0' + ((i % 8) + 1),
  baja_en: estado === 'baja' ? '2027-01-15' : null,
  notas_staff: null, acceso: 'aprobado',
  creado_en: '2026-09-01T10:00:00Z', actualizado_en: '2026-09-01T10:00:00Z'
}));

// Dos personas que han pedido entrar y esperan respuesta.
const SOLICITUDES = [
  { id: 's1', user_id: 'u90', nombre: 'Aarón', apellidos: 'Ferrol', apodo: null,
    dorsal: null, posiciones: [], rol: 'jugador', email: 'aaron.ferrol@ejemplo.com',
    telefono: '622114477', fecha_nacimiento: '2001-03-14', dni: null,
    talla_equipacion: 'L', foto_url: null, estado: 'activo',
    acceso: 'pendiente', solicitado_en: enDias(-2) + 'T18:20:00Z', notas_staff: null },
  { id: 's2', user_id: 'u91', nombre: 'Lucas', apellidos: 'Bergantiños', apodo: 'Berga',
    dorsal: null, posiciones: [], rol: 'jugador', email: 'lucas.b@ejemplo.com',
    telefono: '699887766', fecha_nacimiento: '2009-07-02', dni: null,
    talla_equipacion: 'XXL', foto_url: null, estado: 'activo',
    acceso: 'pendiente', solicitado_en: enDias(-1) + 'T09:05:00Z', notas_staff: null }
];

// Pagos repartidos para que se vean los tres estados de cuota.
const PAGOS = [];
const CUOTAS = nombres.map((p, i) => {
  const exento = i === 12;
  const cuota = { id: 'c' + i, jugador_id: p.id, temporada_id: 't1',
                  importe_total: 180, exento, exento_nota: exento ? 'Colabora con material' : null, nota: null };
  if (!exento) {
    if (i % 3 === 0) PAGOS.push({ id: 'g' + i, cuota_id: cuota.id, importe: 180, fecha: enDias(-40 + i), metodo: 'bizum', referencia: null, nota: null });
    else if (i % 3 === 1) PAGOS.push({ id: 'g' + i, cuota_id: cuota.id, importe: 90, fecha: enDias(-25 + i), metodo: 'transferencia', referencia: null, nota: null });
  }
  return cuota;
});

const DOCS = nombres.map((p, i) => ({
  id: 'd' + i, jugador_id: p.id, temporada_id: 't1',
  licencia_estado: i % 4 === 0 ? 'pendiente' : 'validado',
  licencia_caduca_en: i % 6 === 0 ? enDias(12) : enDias(200),
  seguro_estado: i % 5 === 0 ? 'entregado' : 'validado',
  seguro_caduca_en: i % 7 === 0 ? enDias(-3) : enDias(180),
  reconocimiento_estado: i % 3 === 0 ? 'pendiente' : 'validado',
  reconocimiento_caduca_en: i % 9 === 0 ? enDias(25) : enDias(300),
  dni_entregado: i % 2 === 0, foto_entregada: i % 3 !== 0,
  notas_staff: null, actualizado_en: '2026-09-01T10:00:00Z'
}));

const calcular = (c) => {
  const pagado = PAGOS.filter(p => p.cuota_id === c.id).reduce((s, p) => s + Number(p.importe), 0);
  return {
    ...c,
    importe_pagado: pagado,
    importe_pendiente: c.importe_total - pagado,
    estado: c.exento ? 'exento'
      : pagado >= c.importe_total && c.importe_total > 0 ? 'al_dia'
      : pagado > 0 ? 'parcial' : 'pendiente'
  };
};

const MOVIMIENTOS = [
  { id: 'm1', temporada_id: 't1', tipo: 'ingreso', concepto: 'Patrocinio Cervecería A Marina', categoria: 'patrocinio', importe: 600, fecha: enDias(-52), metodo: 'transferencia', justificante_url: null, nota: null },
  { id: 'm2', temporada_id: 't1', tipo: 'ingreso', concepto: 'Venta de sudaderas', categoria: 'merchandising', importe: 245, fecha: enDias(-31), metodo: 'bizum', justificante_url: null, nota: null },
  { id: 'm3', temporada_id: 't1', tipo: 'gasto', concepto: 'Licencias federativas', categoria: 'federacion', importe: 890, fecha: enDias(-60), metodo: 'transferencia', justificante_url: null, nota: null },
  { id: 'm4', temporada_id: 't1', tipo: 'gasto', concepto: 'Alquiler campo septiembre', categoria: 'campo', importe: 420, fecha: enDias(-45), metodo: 'transferencia', justificante_url: null, nota: null },
  { id: 'm5', temporada_id: 't1', tipo: 'gasto', concepto: 'Alquiler campo octubre', categoria: 'campo', importe: 420, fecha: enDias(-15), metodo: 'transferencia', justificante_url: null, nota: null },
  { id: 'm6', temporada_id: 't1', tipo: 'gasto', concepto: 'Arbitrajes jornadas 1 y 2', categoria: 'arbitrajes', importe: 310, fecha: enDias(-20), metodo: 'efectivo', justificante_url: null, nota: null },
  { id: 'm7', temporada_id: 't1', tipo: 'gasto', concepto: 'Balones y conos', categoria: 'material', importe: 185, fecha: enDias(-38), metodo: 'bizum', justificante_url: null, nota: null },
  { id: 'm8', temporada_id: 't1', tipo: 'gasto', concepto: 'Botiquín', categoria: 'medico', importe: 74.5, fecha: enDias(-9), metodo: 'efectivo', justificante_url: null, nota: null }
];

// --- Calendario ------------------------------------------------------------

const HORARIOS = [
  { id: 'h1', temporada_id: 't1', dia_semana: 2, hora: '20:30:00', duracion_min: 90, lugar: 'Campo de Elviña', unidad: 'todos', activo: true },
  { id: 'h2', temporada_id: 't1', dia_semana: 4, hora: '20:30:00', duracion_min: 90, lugar: 'Campo de Elviña', unidad: 'todos', activo: true }
];

// Ocho semanas de entrenos alrededor de hoy, más dos partidos.
const EVENTOS = [];
for (let i = -18; i <= 10; i++) {
  const f = new Date(hoy.getTime() + i * 864e5);
  const dia = f.getDay();
  if (dia !== 2 && dia !== 4) continue;
  EVENTOS.push({
    id: 'e' + (i + 20), temporada_id: 't1', tipo: 'entreno',
    fecha: f.toISOString().slice(0, 10), hora: '20:30:00',
    lugar: 'Campo de Elviña', unidad: 'todos', rival: null, es_local: null,
    notas: null, cancelado: i === -4, motivo_cancelacion: null,
    horario_id: dia === 2 ? 'h1' : 'h2'
  });
}
EVENTOS.push(
  { id: 'ep1', temporada_id: 't1', tipo: 'partido', fecha: enDias(6), hora: '12:00:00',
    lugar: 'Campo de Elviña', unidad: 'todos', rival: 'Vigo Marines', es_local: true,
    notas: 'Llegar hora y media antes.', cancelado: false, horario_id: null,
    competicion_id: 'co-1', puntos_favor: null, puntos_contra: null },
  { id: 'ep2', temporada_id: 't1', tipo: 'partido', fecha: enDias(-11), hora: '17:00:00',
    lugar: 'Santiago', unidad: 'todos', rival: 'Santiago Black Ravens', es_local: false,
    notas: null, cancelado: false, horario_id: null,
    competicion_id: 'co-1', puntos_favor: 26, puntos_contra: 19 }
);
EVENTOS.sort((a, b) => a.fecha.localeCompare(b.fecha));

// El primer entreno por venir es solo de defensa: así se ve en la demo el aviso
// que recibe un jugador de ataque cuando la sesión no es la suya.
const primeroFuturo = EVENTOS.find(e => e.tipo === 'entreno' && e.fecha >= hoy.toISOString().slice(0, 10));
if (primeroFuturo) primeroFuturo.unidad = 'defensa';

// Asistencia ya pasada, con patrones distintos por jugador.
const ASISTENCIAS = [];
for (const e of EVENTOS) {
  if (e.fecha >= hoy.toISOString().slice(0, 10) || e.cancelado) continue;
  nombres.forEach((p, i) => {
    if (p.estado === 'baja') return;
    const r = (i * 7 + Number(e.fecha.slice(8))) % 10;
    const estado = r < 6 ? 'presente' : r < 8 ? 'ausente' : r === 8 ? 'justificado' : 'presente';
    ASISTENCIAS.push({ id: e.id + '-' + p.id, evento_id: e.id, jugador_id: p.id, estado, nota: null });
  });
}

// El rol de la demo se guarda en el navegador para poder alternar entre la
// consola del staff y la app del jugador sin tocar código.
const CLAVE_ROL = 'atlantics-demo-rol';
export const rolDemo = () => {
  try { return localStorage.getItem(CLAVE_ROL) || 'admin'; } catch { return 'admin'; }
};

// Confirmaciones ya hechas por otros para los eventos por venir: sin esto el
// recuento saldría siempre a cero y no se podría juzgar la pantalla.
for (const e of EVENTOS) {
  if (e.fecha < hoy.toISOString().slice(0, 10) || e.cancelado) continue;
  nombres.forEach((p, i) => {
    if (p.estado === 'baja' || i === 1) return;
    const r = (i * 3 + Number(e.fecha.slice(8))) % 10;
    if (r < 6) ASISTENCIAS.push({ id: e.id + '-' + p.id, evento_id: e.id, jugador_id: p.id,
                                  estado: null, confirmacion: r < 5 ? 'voy' : 'duda', nota: null });
  });
}

// --- Avisos y material -----------------------------------------------------

const AVISOS = [
  { id: 'av1', temporada_id: 't1', autor_id: 'p0', titulo: 'El jueves entrenamos a las 21:00',
    cuerpo: 'Nos han movido la hora del campo. Avisad al que no lea esto.',
    prioridad: 'urgente', destinatarios: 'todos', fijado: true,
    creado_en: enDias(-1) + 'T19:30:00Z' },
  { id: 'av2', temporada_id: 't1', autor_id: 'p0', titulo: 'Sesión de vídeo el martes',
    cuerpo: 'Media hora antes del entreno, repasamos las jugadas de la última jornada.',
    prioridad: 'normal', destinatarios: 'ataque', fijado: false,
    creado_en: enDias(-4) + 'T12:00:00Z' },
  { id: 'av3', temporada_id: 't1', autor_id: 'p0', titulo: 'Quedan sudaderas del pedido',
    cuerpo: 'Tallas M y L. 25 € por Bizum al de siempre.',
    prioridad: 'normal', destinatarios: 'todos', fijado: false,
    creado_en: enDias(-9) + 'T10:15:00Z' }
];

// Algunas lecturas ya hechas, para que el recuento del staff diga algo.
const LECTURAS = [];
nombres.forEach((p, i) => {
  if (p.estado === 'baja' || i === 1) return;
  if (i % 2 === 0) LECTURAS.push({ aviso_id: 'av1', jugador_id: p.id, leido_en: enDias(-1) });
  if (i % 3 === 0) LECTURAS.push({ aviso_id: 'av3', jugador_id: p.id, leido_en: enDias(-8) });
});

const MATERIAL = [
  { id: 'm-c1', tipo: 'casco', identificador: 'Casco 01', talla: 'L', estado: 'bueno', coste: 210, fecha_compra: '2026-08-20', notas: null },
  { id: 'm-c2', tipo: 'casco', identificador: 'Casco 02', talla: 'M', estado: 'bueno', coste: 210, fecha_compra: '2026-08-20', notas: null },
  { id: 'm-c3', tipo: 'casco', identificador: 'Casco 03', talla: 'XL', estado: 'usado', coste: 180, fecha_compra: '2025-09-10', notas: null },
  { id: 'm-h1', tipo: 'hombreras', identificador: 'Hombreras H-01', talla: 'L', estado: 'nuevo', coste: 160, fecha_compra: '2026-08-20', notas: null },
  { id: 'm-h2', tipo: 'hombreras', identificador: 'Hombreras H-02', talla: 'M', estado: 'bueno', coste: 160, fecha_compra: '2026-08-20', notas: null },
  { id: 'm-b1', tipo: 'balon', identificador: 'Balón entreno 1', talla: null, estado: 'usado', coste: 35, fecha_compra: '2025-09-10', notas: null }
];

// Un préstamo a alguien que ya causó baja, para que se vea el aviso de reclamar.
const PRESTAMOS = [
  { id: 'pr1', material_id: 'm-c1', jugador_id: 'p2', entregado_en: enDias(-40), devuelto_en: null, fianza: 50 },
  { id: 'pr2', material_id: 'm-h1', jugador_id: 'p3', entregado_en: enDias(-40), devuelto_en: null, fianza: null },
  { id: 'pr3', material_id: 'm-c3', jugador_id: 'p17', entregado_en: enDias(-120), devuelto_en: null, fianza: 50 }
];

// --- Equipacion ------------------------------------------------------------

const PRODUCTOS = [
  { id: 'pr-1', nombre: 'Sudadera Atlantics',
    descripcion: 'Capucha, algodon grueso, escudo bordado al pecho.',
    precio: 32, foto_url: null, tallas: ['S','M','L','XL','XXL'], activo: true },
  { id: 'pr-2', nombre: 'Camiseta de entreno',
    descripcion: 'Tecnica, transpirable. La de los martes y jueves.',
    precio: 18, foto_url: null, tallas: ['S','M','L','XL'], activo: true },
  { id: 'pr-3', nombre: 'Gorra', descripcion: null,
    precio: 15, foto_url: null, tallas: [], activo: true }
];

const PEDIDOS = [
  { id: 'pd-1', producto_id: 'pr-1', jugador_id: 'p1', talla: 'L',  cantidad: 1, estado: 'pedido',    pagado: true,  nota: null },
  { id: 'pd-2', producto_id: 'pr-1', jugador_id: 'p3', talla: 'XL', cantidad: 1, estado: 'pedido',    pagado: false, nota: null },
  { id: 'pd-3', producto_id: 'pr-1', jugador_id: 'p5', talla: 'M',  cantidad: 2, estado: 'pedido',    pagado: false, nota: null },
  { id: 'pd-4', producto_id: 'pr-2', jugador_id: 'p1', talla: 'L',  cantidad: 1, estado: 'entregado', pagado: true,  nota: null }
];

// --- Competiciones y estadisticas ------------------------------------------

const COMPETICIONES = [
  { id: 'co-1', temporada_id: 't1', nombre: 'Liga Gallega Flag 2026-27',
    tipo: 'liga', notas: null, activa: true, puntos_victoria: 3, puntos_empate: 1 }
];

const EQUIPOS_COMP = [
  { id: 'eq1', competicion_id: 'co-1', nombre: 'Vigo Marines',          es_nuestro: false },
  { id: 'eq2', competicion_id: 'co-1', nombre: 'Coruña Atlantics',      es_nuestro: true  },
  { id: 'eq3', competicion_id: 'co-1', nombre: 'Santiago Black Ravens', es_nuestro: false },
  { id: 'eq4', competicion_id: 'co-1', nombre: 'Ourense Bisontes',      es_nuestro: false }
];

// Todos los partidos de la liga, no solo los nuestros: de aqui sale la tabla.
// Los dos nuestros apuntan a su entrada del calendario.
const PARTIDOS_COMP = [
  { id: 'pc1', competicion_id: 'co-1', jornada: 1, fecha: enDias(-25), hora: '12:00:00', lugar: 'Vigo',
    local_id: 'eq1', visitante_id: 'eq4', puntos_local: 28, puntos_visitante: 12, evento_id: null },
  { id: 'pc2', competicion_id: 'co-1', jornada: 2, fecha: enDias(-18), hora: '12:00:00', lugar: 'Vigo',
    local_id: 'eq1', visitante_id: 'eq3', puntos_local: 21, puntos_visitante: 14, evento_id: null },
  { id: 'pc3', competicion_id: 'co-1', jornada: 2, fecha: enDias(-18), hora: '17:00:00', lugar: 'Ourense',
    local_id: 'eq4', visitante_id: 'eq2', puntos_local: 6, puntos_visitante: 32, evento_id: null },
  { id: 'pc4', competicion_id: 'co-1', jornada: 3, fecha: enDias(-11), hora: '17:00:00', lugar: 'Santiago',
    local_id: 'eq3', visitante_id: 'eq2', puntos_local: 19, puntos_visitante: 26, evento_id: 'ep2' },
  { id: 'pc5', competicion_id: 'co-1', jornada: 3, fecha: enDias(-11), hora: '12:00:00', lugar: 'Santiago',
    local_id: 'eq3', visitante_id: 'eq4', puntos_local: 24, puntos_visitante: 18, evento_id: null },
  { id: 'pc6', competicion_id: 'co-1', jornada: 4, fecha: enDias(6), hora: '12:00:00', lugar: 'Campo de Elviña',
    local_id: 'eq2', visitante_id: 'eq1', puntos_local: null, puntos_visitante: null, evento_id: 'ep1' }
];

// Numeros del partido ya jugado contra Santiago.
const ESTADISTICAS_DEMO = [
  { id: 'st-1', evento_id: 'ep2', jugador_id: 'p1',  clave: 'td', valor: 2 },
  { id: 'st-3', evento_id: 'ep2', jugador_id: 'p0',  clave: 'td_pase', valor: 3 },
  { id: 'st-4', evento_id: 'ep2', jugador_id: 'p2',  clave: 'td', valor: 1 },
  { id: 'st-6', evento_id: 'ep2', jugador_id: 'p6',  clave: 'int', valor: 2 },
  { id: 'st-9', evento_id: 'ep2', jugador_id: 'p5',  clave: 'sacks', valor: 2 },
  { id: 'st-10', evento_id: 'ep2', jugador_id: 'p6', clave: 'td_defensivo', valor: 1 }
];

const demora = (v) => new Promise(r => setTimeout(() => r(structuredClone(v)), 120));
const noDisponible = () => { throw new Error('En el modo demo no se guarda nada. Los datos son inventados.'); };

// --- API idéntica a la de db.js -------------------------------------------

export const traducirError = (e) => e?.message ?? String(e ?? '');
export const sesion = () => demora({ user: { id: 'u1' } });
export const entrar = () => noDisponible();
export const salir = () => demora(null);
// Cuatro puntos del recorrido, para poder verlo entero desde la vista previa:
// la consola del staff, la app de un jugador ya dentro, el formulario de alta
// de alguien que acaba de registrarse, y la espera tras enviarlo.
const RECIEN_LLEGADO = {
  id: 'nuevo1', user_id: 'u99', nombre: 'Nuevo', apellidos: '', apodo: null,
  dorsal: null, posiciones: [], rol: 'jugador', email: 'nuevo@ejemplo.com',
  telefono: null, fecha_nacimiento: null, dni: null, talla_equipacion: null,
  foto_url: null, estado: 'activo', acceso: 'nuevo', notas_staff: null
};

export const miPerfil = () => {
  const rol = rolDemo();
  if (rol === 'jugador')   return demora(nombres[1]);
  if (rol === 'registro')  return demora(RECIEN_LLEGADO);
  if (rol === 'pendiente') return demora({ ...RECIEN_LLEGADO, ...SOLICITUDES[0], acceso: 'pendiente' });
  return demora(nombres[0]);
};

export const temporadaActiva = () => demora(TEMPORADA);
export const temporadas = () => demora([TEMPORADA]);
export const guardarTemporada = () => noDisponible();
export const crearTemporada = () => noDisponible();
export const abrirTemporada = () => noDisponible();
export const aplicarImporteCuota = () => noDisponible();

export const roster = () => demora(nombres);
export const jugador = (id) => demora(nombres.find(p => p.id === id));
export const crearJugador = () => noDisponible();
export const guardarJugador = (id, cambios) => {
  // Mismo bloqueo que el índice único de la base de datos.
  if (cambios.dorsal != null &&
      nombres.some(x => x.id !== id && x.dorsal === cambios.dorsal && x.estado !== 'baja')) {
    throw new Error('perfiles_dorsal_activo');
  }
  const p = nombres.find(x => x.id === id);
  if (p) Object.assign(p, cambios);
  return demora(p);
};

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
export const cambiarAcceso = (id, acceso) => {
  const p = nombres.find(x => x.id === id);
  if (p) p.acceso = acceso;
  return demora(p);
};
export const borrarJugador = () => noDisponible();

export const cuotasDe = () => demora(CUOTAS.map(calcular));
export const cuotaDe = (jugadorId) => demora(calcular(CUOTAS.find(c => c.jugador_id === jugadorId)));
export const asegurarCuota = (jugadorId) => cuotaDe(jugadorId);
export const pagosDe = (cuotaId) => demora(PAGOS.filter(p => p.cuota_id === cuotaId));
export const registrarPago = () => noDisponible();
export const borrarPago = () => noDisponible();
export const guardarCuota = () => noDisponible();

export const movimientosDe = () => demora(MOVIMIENTOS);
export const registrarMovimiento = () => noDisponible();
export const guardarMovimiento = () => noDisponible();
export const borrarMovimiento = () => noDisponible();

export const resumenTesoreria = () => {
  const cuotas = PAGOS.reduce((s, p) => s + Number(p.importe), 0);
  const ingresos = MOVIMIENTOS.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.importe, 0);
  const gastos = MOVIMIENTOS.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.importe, 0);
  return demora({
    temporada_id: 't1', nombre: '2026-27',
    ingresos_cuotas: cuotas, ingresos_otros: ingresos,
    ingresos_total: cuotas + ingresos, gastos_total: gastos,
    saldo: cuotas + ingresos - gastos
  });
};

export const horarios = () => demora(HORARIOS);
export const crearHorario = () => noDisponible();
export const guardarHorario = () => noDisponible();
export const borrarHorario = () => noDisponible();
export const generarEntrenos = () => noDisponible();

export const eventos = (_t, { desde, hasta } = {}) => demora(EVENTOS.filter(e =>
  (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta)));
export const evento = (id) => demora(EVENTOS.find(e => e.id === id));
export const crearEvento = () => noDisponible();
export const guardarEvento = () => noDisponible();
export const borrarEvento = () => noDisponible();

export const asistenciasDe = (eventoId) =>
  demora(ASISTENCIAS.filter(a => a.evento_id === eventoId));

// Pasar lista sí funciona en la demo, en memoria: es la función que hay que
// poder probar con el dedo para juzgarla.
export const marcarAsistencia = (eventoId, jugadorId, estado) => {
  const i = ASISTENCIAS.findIndex(a => a.evento_id === eventoId && a.jugador_id === jugadorId);
  if (i >= 0) ASISTENCIAS[i].estado = estado;
  else ASISTENCIAS.push({ id: eventoId + '-' + jugadorId, evento_id: eventoId, jugador_id: jugadorId, estado, nota: null });
  return demora({ estado });
};

export const quitarAsistencia = (eventoId, jugadorId) => {
  const i = ASISTENCIAS.findIndex(a => a.evento_id === eventoId && a.jugador_id === jugadorId);
  if (i >= 0) ASISTENCIAS.splice(i, 1);
  return demora(null);
};

export const resumenAsistencia = () => {
  const porJugador = {};
  const cancelados = new Set(EVENTOS.filter(e => e.cancelado || e.tipo !== 'entreno').map(e => e.id));
  for (const a of ASISTENCIAS) {
    if (cancelados.has(a.evento_id)) continue;
    const r = porJugador[a.jugador_id] ??= { jugador_id: a.jugador_id, temporada_id: 't1',
      presentes: 0, ausentes: 0, justificados: 0, computables: 0, porcentaje: 0 };
    if (a.estado === 'presente') r.presentes++;
    if (a.estado === 'ausente') r.ausentes++;
    if (a.estado === 'justificado') r.justificados++;
    if (a.estado !== 'justificado') r.computables++;
  }
  const lista = Object.values(porJugador);
  for (const r of lista) r.porcentaje = r.computables ? Math.round(100 * r.presentes / r.computables) : null;
  return demora(lista);
};

export const aptitud = () => demora(nombres.map((p, i) => {
  const d = DOCS[i];
  const motivos = [];
  if (p.estado === 'lesionado') motivos.push('Lesionado');
  if (p.estado === 'baja_temporal') motivos.push('De baja temporal');
  if (p.estado === 'baja') motivos.push('Ya no está en el equipo');
  if (d.licencia_estado === 'pendiente') motivos.push('Sin licencia');
  if (d.seguro_estado === 'entregado') motivos.push('Seguro sin validar');
  if (d.reconocimiento_estado === 'pendiente') motivos.push('Sin reconocimiento médico');
  if (d.seguro_caduca_en < hoy.toISOString().slice(0, 10)) motivos.push('Seguro caducado');
  const bloquea = p.estado !== 'activo'
    || d.licencia_estado === 'pendiente'
    || d.reconocimiento_estado === 'pendiente'
    || d.seguro_caduca_en < hoy.toISOString().slice(0, 10);
  return { jugador_id: p.id, temporada_id: 't1',
           apto: bloquea ? 'no' : motivos.length ? 'pega' : 'si', motivos };
}));

// --- La parte del jugador --------------------------------------------------

export const misAsistencias = (jugadorId) =>
  demora(ASISTENCIAS.filter(a => a.jugador_id === jugadorId));

export const confirmarAsistencia = (eventoId, jugadorId, valor) => {
  const i = ASISTENCIAS.findIndex(a => a.evento_id === eventoId && a.jugador_id === jugadorId);
  if (i >= 0) ASISTENCIAS[i].confirmacion = valor;
  else ASISTENCIAS.push({ id: eventoId + '-' + jugadorId, evento_id: eventoId,
                          jugador_id: jugadorId, estado: null, confirmacion: valor, nota: null });
  return demora({ confirmacion: valor });
};

export const companeros = () => demora(nombres
  .filter(p => p.estado !== 'baja')
  .map(({ id, nombre, apellidos, apodo, dorsal, posiciones, estado }) =>
    ({ id, nombre, apellidos, apodo, dorsal, posiciones, estado })));

export const confirmadosDe = (eventoId) => {
  const de = ASISTENCIAS.filter(a => a.evento_id === eventoId);
  return demora({
    voy:    de.filter(a => a.confirmacion === 'voy').length,
    no_voy: de.filter(a => a.confirmacion === 'no_voy').length,
    duda:   de.filter(a => a.confirmacion === 'duda').length
  });
};

// --- Solicitudes -----------------------------------------------------------

export const solicitudes = () => demora(SOLICITUDES);

// Resolver funciona en la demo: es lo que hay que poder probar con el dedo.
export const resolverSolicitud = (id, aprobar) => {
  const i = SOLICITUDES.findIndex(p => p.id === id);
  if (i < 0) return demora(null);
  const [p] = SOLICITUDES.splice(i, 1);
  if (aprobar) {
    p.acceso = 'aprobado';
    nombres.push(p);
    DOCS.push({ id: 'd-' + p.id, jugador_id: p.id, temporada_id: 't1',
      licencia_estado: 'pendiente', licencia_caduca_en: null,
      seguro_estado: 'pendiente', seguro_caduca_en: null,
      reconocimiento_estado: 'pendiente', reconocimiento_caduca_en: null,
      dni_entregado: false, foto_entregada: false, notas_staff: null,
      actualizado_en: new Date().toISOString() });
    CUOTAS.push({ id: 'c-' + p.id, jugador_id: p.id, temporada_id: 't1',
      importe_total: 180, exento: false, exento_nota: null, nota: null });
  }
  return demora(null);
};

export const entregarSolicitud = (_id, datos) => {
  try { localStorage.setItem(CLAVE_ROL, 'pendiente'); } catch { /* da igual */ }
  return demora({ ...RECIEN_LLEGADO, ...datos, acceso: 'pendiente' });
};

// --- Avisos ----------------------------------------------------------------

export const avisos = () => demora(
  [...AVISOS].sort((a, b) => (b.fijado - a.fijado) || b.creado_en.localeCompare(a.creado_en)));

export const crearAviso = (datos) => {
  AVISOS.push({ id: 'av' + (AVISOS.length + 1), creado_en: new Date().toISOString(), ...datos });
  return demora(null);
};
export const guardarAviso = (id, cambios) => {
  const a = AVISOS.find(x => x.id === id);
  if (a) Object.assign(a, cambios);
  return demora(a);
};
export const borrarAviso = (id) => {
  const i = AVISOS.findIndex(x => x.id === id);
  if (i >= 0) AVISOS.splice(i, 1);
  return demora(null);
};

export const lecturasDe = (avisoId) => demora(LECTURAS.filter(l => l.aviso_id === avisoId));
export const misLecturas = (jugadorId) => demora(LECTURAS.filter(l => l.jugador_id === jugadorId));
export const marcarLeido = (avisoId, jugadorId) => {
  if (!LECTURAS.some(l => l.aviso_id === avisoId && l.jugador_id === jugadorId)) {
    LECTURAS.push({ aviso_id: avisoId, jugador_id: jugadorId, leido_en: new Date().toISOString() });
  }
  return demora(null);
};

// --- Material --------------------------------------------------------------

export const material = () => demora(MATERIAL.map(m => {
  const p = PRESTAMOS.find(x => x.material_id === m.id && !x.devuelto_en);
  return { ...m, prestamo_id: p?.id ?? null, jugador_id: p?.jugador_id ?? null,
           entregado_en: p?.entregado_en ?? null, fianza: p?.fianza ?? null };
}));

export const crearMaterial = (datos) => {
  MATERIAL.push({ id: 'm-' + (MATERIAL.length + 1), ...datos });
  return demora(null);
};
export const guardarMaterial = (id, cambios) => {
  const m = MATERIAL.find(x => x.id === id);
  if (m) Object.assign(m, cambios);
  return demora(m);
};
export const borrarMaterial = (id) => {
  const i = MATERIAL.findIndex(x => x.id === id);
  if (i >= 0) MATERIAL.splice(i, 1);
  return demora(null);
};
export const entregarMaterial = (datos) => {
  PRESTAMOS.push({ id: 'pr' + (PRESTAMOS.length + 1), devuelto_en: null, ...datos });
  return demora(null);
};
export const devolverMaterial = (prestamoId, cambios) => {
  const p = PRESTAMOS.find(x => x.id === prestamoId);
  if (p) Object.assign(p, { devuelto_en: enDias(0) }, cambios);
  return demora(null);
};
export const misPrestamos = (jugadorId) => demora(
  PRESTAMOS.filter(p => p.jugador_id === jugadorId && !p.devuelto_en)
    .map(p => ({ ...p, material: MATERIAL.find(m => m.id === p.material_id) })));

export const productos = () => demora(PRODUCTOS);
export const crearProducto = (d) => { PRODUCTOS.push({ id: 'pr-' + (PRODUCTOS.length + 1), foto_url: null, ...d }); return demora(null); };
export const guardarProducto = (id, c) => { const p = PRODUCTOS.find(x => x.id === id); if (p) Object.assign(p, c); return demora(p); };
export const borrarProducto = (id) => { const i = PRODUCTOS.findIndex(x => x.id === id); if (i >= 0) PRODUCTOS.splice(i, 1); return demora(null); };

export const pedidos = () => demora(PEDIDOS);
export const misPedidos = (jid) => demora(PEDIDOS.filter(p => p.jugador_id === jid));
export const crearPedido = (d) => { PEDIDOS.push({ id: 'pd-' + (PEDIDOS.length + 1), estado: 'pedido', pagado: false, nota: null, ...d }); return demora(null); };
export const guardarPedido = (id, c) => { const p = PEDIDOS.find(x => x.id === id); if (p) Object.assign(p, c); return demora(p); };
export const borrarPedido = (id) => { const i = PEDIDOS.findIndex(x => x.id === id); if (i >= 0) PEDIDOS.splice(i, 1); return demora(null); };

// En la demo no hay almacenamiento: se ensena la foto elegida sin subir nada.
export const subirFotoProducto = (archivo) => demora(URL.createObjectURL(archivo));

export const competiciones = () => demora(COMPETICIONES);
export const crearCompeticion = (d) => { COMPETICIONES.push({ id: 'co-' + (COMPETICIONES.length + 1), ...d }); return demora(null); };
export const guardarCompeticion = (id, c) => { const x = COMPETICIONES.find(y => y.id === id); if (x) Object.assign(x, c); return demora(x); };
export const borrarCompeticion = (id) => { const i = COMPETICIONES.findIndex(y => y.id === id); if (i >= 0) COMPETICIONES.splice(i, 1); return demora(null); };

export const equiposDe = (cid) => demora(
  EQUIPOS_COMP.filter(e => e.competicion_id === cid)
    .sort((a, b) => (b.es_nuestro - a.es_nuestro) || a.nombre.localeCompare(b.nombre)));

export const crearEquipoCompeticion = (d) => { EQUIPOS_COMP.push({ id: 'eq-' + Date.now(), ...d }); return demora(null); };
export const guardarEquipoCompeticion = (id, c) => { const x = EQUIPOS_COMP.find(y => y.id === id); if (x) Object.assign(x, c); return demora(x); };
export const borrarEquipoCompeticion = (id) => { const i = EQUIPOS_COMP.findIndex(y => y.id === id); if (i >= 0) EQUIPOS_COMP.splice(i, 1); return demora(null); };

export const partidosDe = (cid) => demora(
  PARTIDOS_COMP.filter(p => p.competicion_id === cid)
    .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '')));

export const crearPartidoCompeticion = (d) => {
  const nuevo = { id: 'pc-' + Date.now(), evento_id: null, ...d };
  PARTIDOS_COMP.push(nuevo);
  return demora(nuevo);
};
export const guardarPartidoCompeticion = (id, c) => { const x = PARTIDOS_COMP.find(y => y.id === id); if (x) Object.assign(x, c); return demora(x); };
export const borrarPartidoCompeticion = (id) => { const i = PARTIDOS_COMP.findIndex(y => y.id === id); if (i >= 0) PARTIDOS_COMP.splice(i, 1); return demora(null); };

export const partidoDeEvento = (eventoId) => demora(PARTIDOS_COMP.find(p => p.evento_id === eventoId) ?? null);

// La misma cuenta que hace la vista de la base de datos, aqui a mano.
export const clasificacion = (cid) => {
  const comp = COMPETICIONES.find(c => c.id === cid);
  const pv = comp?.puntos_victoria ?? 3;
  const pe = comp?.puntos_empate ?? 1;

  const filas = EQUIPOS_COMP.filter(e => e.competicion_id === cid).map(e => {
    const suyos = PARTIDOS_COMP.filter(p => p.competicion_id === cid &&
      p.puntos_local != null && p.puntos_visitante != null &&
      (p.local_id === e.id || p.visitante_id === e.id));

    const marcadores = suyos.map(p => p.local_id === e.id
      ? { pf: p.puntos_local, pc: p.puntos_visitante }
      : { pf: p.puntos_visitante, pc: p.puntos_local });

    const ganados   = marcadores.filter(m => m.pf > m.pc).length;
    const empatados = marcadores.filter(m => m.pf === m.pc).length;
    const favor     = marcadores.reduce((s, m) => s + m.pf, 0);
    const contra    = marcadores.reduce((s, m) => s + m.pc, 0);

    return {
      competicion_id: cid, equipo_id: e.id, equipo: e.nombre, es_nuestro: e.es_nuestro,
      jugados: marcadores.length, ganados, empatados,
      perdidos: marcadores.filter(m => m.pf < m.pc).length,
      puntos_favor: favor, puntos_contra: contra, diferencia: favor - contra,
      puntos: ganados * pv + empatados * pe
    };
  });

  filas.sort((a, b) => b.puntos - a.puntos || b.diferencia - a.diferencia || b.puntos_favor - a.puntos_favor);
  return demora(filas);
};

// En la demo el calendario tambien se mueve, para que se vea el enganche.
export const sincronizarEventoDePartido = (partido, { equipos }) => {
  const nuestro = equipos.find(e => e.es_nuestro);
  const enCasa = !!nuestro && partido.local_id === nuestro.id;
  const fuera  = !!nuestro && partido.visitante_id === nuestro.id;
  if (!enCasa && !fuera) return demora(null);

  const rival = equipos.find(e => e.id === (enCasa ? partido.visitante_id : partido.local_id));
  const datos = {
    temporada_id: 't1', tipo: 'partido', fecha: partido.fecha, hora: partido.hora,
    lugar: partido.lugar, unidad: 'todos', rival: rival ? rival.nombre : null,
    es_local: enCasa, notas: null, cancelado: false, horario_id: null,
    competicion_id: partido.competicion_id,
    puntos_favor:  enCasa ? partido.puntos_local : partido.puntos_visitante,
    puntos_contra: enCasa ? partido.puntos_visitante : partido.puntos_local
  };

  const ya = EVENTOS.find(e => e.id === partido.evento_id);
  if (ya) { Object.assign(ya, datos); return demora(ya.id); }

  const id = 'ev-' + Date.now();
  EVENTOS.push({ id, ...datos });
  EVENTOS.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const fila = PARTIDOS_COMP.find(p => p.id === partido.id);
  if (fila) fila.evento_id = id;
  return demora(id);
};

export const sincronizarPartidoDeEvento = (evento) => {
  const partido = PARTIDOS_COMP.find(p => p.evento_id === evento.id);
  if (!partido) return demora(null);
  Object.assign(partido, evento.es_local
    ? { puntos_local: evento.puntos_favor, puntos_visitante: evento.puntos_contra }
    : { puntos_local: evento.puntos_contra, puntos_visitante: evento.puntos_favor });
  return demora(partido);
};

export const estadisticasDe = (eventoId) => demora(ESTADISTICAS_DEMO.filter(x => x.evento_id === eventoId));

export const guardarEstadisticas = (eventoId, jugadorId, valores) => {
  for (const [clave, valor] of Object.entries(valores)) {
    const i = ESTADISTICAS_DEMO.findIndex(x => x.evento_id === eventoId && x.jugador_id === jugadorId && x.clave === clave);
    if (Number(valor) > 0) {
      if (i >= 0) ESTADISTICAS_DEMO[i].valor = Number(valor);
      else ESTADISTICAS_DEMO.push({ id: 'st-' + Date.now() + clave, evento_id: eventoId, jugador_id: jugadorId, clave, valor: Number(valor) });
    } else if (i >= 0) ESTADISTICAS_DEMO.splice(i, 1);
  }
  return demora(null);
};

const agregar = () => {
  const mapa = {};
  for (const x of ESTADISTICAS_DEMO) {
    const k = x.jugador_id + '|' + x.clave;
    mapa[k] ??= { temporada_id: 't1', jugador_id: x.jugador_id, clave: x.clave, total: 0, partidos: 0 };
    mapa[k].total += x.valor;
    mapa[k].partidos = 1;
  }
  return Object.values(mapa);
};
export const estadisticasTemporada = () => demora(agregar());
export const estadisticasHistorico = () => demora(agregar());

export const documentacionDe = () => demora(DOCS);
export const asegurarDocumentacion = (jugadorId) => demora(DOCS.find(d => d.jugador_id === jugadorId));
export const guardarDocumentacion = () => noDisponible();
