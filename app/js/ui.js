// Utilidades de interfaz compartidas por todas las vistas.

// --- Plantillas -----------------------------------------------------------

// Escapa por defecto. Para insertar HTML ya construido se envuelve en crudo(),
// que devuelve un objeto marcado: así ningún texto que escriba un usuario puede
// hacerse pasar por HTML de confianza, por raro que sea lo que ponga.
class Crudo { constructor(s) { this.s = s; } toString() { return this.s; } }

// Idempotente a propósito: html() ya devuelve Crudo, y volver a envolverlo
// desde una vista no debe anidar marcas.
export const crudo = (s) => s instanceof Crudo ? s : new Crudo(s);

const escapar = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Ojo: dentro de una plantilla, un array de html`` se pasa TAL CUAL. Hacerle
// .join('') antes lo convierte en texto plano, pierde la marca de confianza y
// acaba escapado y a la vista. El .join('') solo vale al asignar a innerHTML.
const resolver = (v) => {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Crudo) return v.s;
  if (Array.isArray(v)) return v.map(resolver).join('');
  return escapar(v);
};

// El resultado ya es HTML válido, así que se marca como crudo: eso permite
// anidar plantillas sin tener que envolverlas a mano en cada llamada.
export function html(trozos, ...valores) {
  return crudo(trozos.reduce((acc, trozo, i) =>
    i === 0 ? trozo : acc + resolver(valores[i - 1]) + trozo, ''));
}

export const $  = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// --- Formato --------------------------------------------------------------

export const euros = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
    .format(Number(n) || 0);

export const fecha = (iso) =>
  iso ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))) : '—';

// La fecha de HOY en el huso del móvil, no en UTC.
//
// toISOString() convierte a UTC, así que en España entre medianoche y las dos
// de la mañana devolvía el día anterior: a las 00:30 de un martes, el entreno
// de ese martes se contaba como pasado y desaparecía de "próximos". Dos horas
// al día de comportamiento equivocado, justo cuando alguien mira el móvil
// después de un partido.
export const hoyISO = (d = new Date()) =>
  [d.getFullYear(),
   String(d.getMonth() + 1).padStart(2, '0'),
   String(d.getDate()).padStart(2, '0')].join('-');

export const enDiasISO = (n) => hoyISO(new Date(Date.now() + n * 864e5));

export function diasHasta(iso) {
  if (!iso) return null;
  const dia = 24 * 60 * 60 * 1000;
  return Math.round((new Date(iso + 'T12:00:00') - new Date().setHours(12, 0, 0, 0)) / dia);
}

export const nombreCompleto = (p) =>
  [p.nombre, p.apellidos].filter(Boolean).join(' ') || p.email || 'Sin nombre';

export const iniciales = (p) =>
  nombreCompleto(p).split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// --- Consultas que pueden faltar -------------------------------------------

// Una pantalla que lanza diez consultas a la vez no debe morir porque falle
// una. Pasa de verdad: al añadir una funcion nueva, la tabla todavia no existe
// en la base de datos de quien no ha ejecutado el SQL, y con Promise.all eso
// tumba la pantalla entera en vez de dejar una baldosa sin su numerito.
export const conRespaldo = (promesa, valor) =>
  Promise.resolve(promesa).catch((e) => { console.warn('Consulta opcional fallida:', e); return valor; });

// --- Contacto -------------------------------------------------------------

// Los teléfonos se guardan como los escriba cada uno, pero los enlaces tel: y
// wa.me necesitan prefijo internacional. Se asume España solo cuando el número
// tiene pinta de español: nueve dígitos empezando por 6, 7, 8 o 9.
export function telefonoE164(bruto) {
  if (!bruto) return null;
  const limpio = String(bruto).replace(/[^\d+]/g, '');
  if (limpio.startsWith('+')) return limpio;
  if (limpio.startsWith('00')) return '+' + limpio.slice(2);
  if (/^[6789]\d{8}$/.test(limpio)) return '+34' + limpio;
  if (/^34[6789]\d{8}$/.test(limpio)) return '+' + limpio;
  return null;
}

export const enlaceLlamada = (t) => {
  const n = telefonoE164(t);
  return n ? 'tel:' + n : null;
};

// wa.me quiere el número sin el '+'. El texto va preparado, pero el envío lo
// hace el usuario desde WhatsApp: la app no manda nada por su cuenta.
export const enlaceWhatsApp = (t, texto = '') => {
  const n = telefonoE164(t);
  if (!n) return null;
  return 'https://wa.me/' + n.slice(1) + (texto ? '?text=' + encodeURIComponent(texto) : '');
};

// --- Fechas del calendario ------------------------------------------------

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const diaSemana = (iso) => {
  const d = new Date(iso + 'T12:00:00').getDay();
  return DIAS[(d + 6) % 7];
};

export const hora = (t) => (t ? t.slice(0, 5) : '');

export const fechaCorta = (iso) =>
  iso ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
    .format(new Date(iso + 'T12:00:00')) : '—';

export function cuando(iso) {
  const d = diasHasta(iso);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d > 1 && d < 7) return diaSemana(iso);
  return diaSemana(iso) + ' ' + fechaCorta(iso);
}

// --- Código QR ------------------------------------------------------------

// La librería se carga solo al abrir la pantalla que la necesita, y desde fuera:
// generar un QR bien es más código del que merece la pena escribir aquí. Si no
// hay conexión no se puede cargar, así que siempre queda el enlace a mano.
export async function pintarQR(cont, texto) {
  try {
    const { default: qrcode } = await import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm');
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    cont.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    const svg = cont.querySelector('svg');
    if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); }
    return true;
  } catch (e) {
    console.error(e);
    cont.innerHTML = html`<p class="ayuda" style="text-align:center;line-height:1.6">
      No se ha podido generar el código (hace falta conexión).<br>El enlace sigue
      ahí abajo.</p>`;
    return false;
  }
}

// --- Avisos ---------------------------------------------------------------

export function avisar(texto, tipo = '') {
  const zona = $('#avisos');
  const el = document.createElement('div');
  el.className = 'aviso ' + tipo;
  el.textContent = texto;
  zona.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export const fallo = (e) => {
  console.error(e);
  avisar(e?.message || 'Algo ha fallado', 'error');
};

// --- Hoja modal -----------------------------------------------------------
// Devuelve el elemento del panel para que quien la abre enganche sus eventos.

export function hoja(titulo, contenido, { alCerrar } = {}) {
  const fondo = document.createElement('div');
  fondo.className = 'hoja';
  fondo.innerHTML = html`
    <div class="hoja-panel" role="dialog" aria-modal="true" aria-label="${titulo}">
      <div class="hoja-cab">
        <h2>${titulo}</h2>
        <span class="spacer"></span>
        <button class="btn-icono" data-cerrar aria-label="Cerrar">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="hoja-cuerpo">${crudo(contenido)}</div>
    </div>`;

  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc); alCerrar?.(); };
  const esc = (e) => { if (e.key === 'Escape') cerrar(); };

  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  fondo.querySelector('[data-cerrar]').addEventListener('click', cerrar);
  document.addEventListener('keydown', esc);
  document.body.appendChild(fondo);

  const panel = fondo.querySelector('.hoja-cuerpo');
  panel.cerrar = cerrar;
  return panel;
}

export async function confirmar(titulo, mensaje, textoBoton = 'Confirmar') {
  return new Promise((resolve) => {
    let decidido = false;
    const panel = hoja(titulo, html`
      <p style="line-height:1.6;color:var(--muted)">${mensaje}</p>
      <div style="display:flex;gap:.6rem;margin-top:1.2rem">
        <button class="btn fantasma" style="flex:1" data-no>Cancelar</button>
        <button class="btn peligro" style="flex:1" data-si>${textoBoton}</button>
      </div>`, { alCerrar: () => { if (!decidido) resolve(false); } });

    panel.querySelector('[data-si]').addEventListener('click', () => { decidido = true; panel.cerrar(); resolve(true); });
    panel.querySelector('[data-no]').addEventListener('click', () => { decidido = true; panel.cerrar(); resolve(false); });
  });
}

// --- Estados visuales -----------------------------------------------------

export const TAG_CUOTA = {
  al_dia:    { txt: 'Al día',    clase: 'ok' },
  parcial:   { txt: 'Parcial',   clase: 'warn' },
  pendiente: { txt: 'Pendiente', clase: 'bad' },
  exento:    { txt: 'Exento',    clase: 'teal' }
};

export const TAG_JUGADOR = {
  activo:        { txt: 'Activo',    clase: 'ok' },
  lesionado:     { txt: 'Lesionado', clase: 'warn' },
  baja_temporal: { txt: 'Baja temp.', clase: 'n' },
  baja:          { txt: 'Baja',      clase: 'n' }
};

export const TAG_DOC = {
  validado:  { txt: 'Validado',  clase: 'ok' },
  entregado: { txt: 'Entregado', clase: 'warn' },
  pendiente: { txt: 'Pendiente', clase: 'bad' },
  caducado:  { txt: 'Caducado',  clase: 'bad' }
};

export const tag = (mapa, clave) => {
  const t = mapa[clave] ?? { txt: clave ?? '—', clase: 'n' };
  return html`<span class="tag ${t.clase}">${t.txt}</span>`;
};

// Estaban repetidas en tres vistas. Aquí sirven además para saber de qué
// unidad es un jugador y avisarle si el próximo entreno no es el suyo.
export const UNIDADES = {
  ataque:     ['QB','RB','FB','WR','TE','OL','C','OG','OT'],
  defensa:    ['DL','DE','DT','LB','CB','S','DB'],
  especiales: ['K','P','LS','KR','PR']
};

export const NOMBRE_UNIDAD = {
  todos: 'Todo el equipo', ataque: 'Ataque', defensa: 'Defensa', especiales: 'Equipos especiales'
};

// La unidad principal es la de la primera posición reconocida: un KR que
// además es RB entrena con el ataque.
export function unidadDe(posiciones = []) {
  for (const pos of posiciones) {
    for (const [unidad, lista] of Object.entries(UNIDADES)) {
      if (lista.includes(pos)) return unidad;
    }
  }
  return null;
}

export const esDeUnidad = (posiciones, unidad) =>
  unidad === 'todos' || (posiciones ?? []).some(p => UNIDADES[unidad]?.includes(p));

// Compartidas por Hoy y por Agenda: los mismos tres botones en los dos sitios.
export const OPCIONES_ASISTENCIA = [
  { valor: 'voy',    txt: 'Voy',    clase: 'ok',
    icono: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  { valor: 'duda',   txt: 'Duda',   clase: 'warn',
    icono: '<path d="M9 9.2a3 3 0 115 2.2c-.9.8-2 1.3-2 2.8" stroke-linecap="round"/><circle cx="12" cy="18" r="1.15" fill="currentColor" stroke="none"/>' },
  { valor: 'no_voy', txt: 'No voy', clase: 'bad',
    icono: '<path d="M7 7l10 10M17 7L7 17" stroke-linecap="round"/>' }
];

export const POSICIONES = [
  'QB','RB','FB','WR','TE','OL','C','OG','OT',
  'DL','DE','DT','LB','CB','S','DB',
  'K','P','LS','KR','PR'
];

export const cargando = () => html`<div class="cargando"><div class="spinner"></div></div>`;

export const vacio = (texto) => html`<p class="vacio">${texto}</p>`;
