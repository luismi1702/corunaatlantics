// Hoy — la pantalla que ve el jugador al abrir la app.
//
// Una sola pregunta: ¿vas al próximo entreno? Está montada como una entrada al
// campo: raíl con la fecha, los datos de la sesión, línea de corte y debajo la
// respuesta. Todo lo demás va después y en tono menor.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, cuando, hora, hoyISO, fechaCorta, diasHasta, DIAS,
  unidadDe, esDeUnidad, NOMBRE_UNIDAD, OPCIONES_ASISTENCIA as OPCIONES,
  avisar, fallo, cargando
} from '../ui.js';

const DICHO = {
  voy:    'Has dicho que vas',
  duda:   'Has dicho que es duda',
  no_voy: 'Has dicho que no vas'
};

const cuentaAtras = (iso) => {
  const d = diasHasta(iso);
  if (d === 0) return 'Es hoy';
  if (d === 1) return 'Es mañana';
  if (d > 1) return 'En ' + d + ' días';
  return 'Ya pasó';
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const yo = ctx.perfil;
  const [agenda, mias, cuota, docs, resumen, tablon, lecturas,
         catalogo, misEncargos] = await Promise.all([
    db.eventos(ctx.temporada.id, { desde: hoyISO() }),
    db.misAsistencias(yo.id),
    db.cuotaDe(yo.id, ctx.temporada.id),
    db.documentacionDe(ctx.temporada.id),
    db.resumenAsistencia(ctx.temporada.id),
    db.avisos(ctx.temporada.id),
    db.misLecturas(yo.id),
    db.productos(),
    db.misPedidos(yo.id)
  ]);

  const proximos = agenda.filter(e => !e.cancelado);
  const evento = proximos[0] ?? null;
  const siguiente = proximos[1] ?? null;

  const miAsistencia = resumen.find(a => a.jugador_id === yo.id);
  const miDoc = docs.find(d => d.jugador_id === yo.id);
  const porEvento = new Map(mias.map(a => [a.evento_id, a]));
  const miUnidad = unidadDe(yo.posiciones);
  const respuesta = evento ? porEvento.get(evento.id)?.confirmacion ?? null : null;

  const pendientes = [];
  if (miDoc) {
    if (miDoc.licencia_estado !== 'validado') pendientes.push('la licencia');
    if (miDoc.seguro_estado !== 'validado') pendientes.push('el seguro');
    if (miDoc.reconocimiento_estado !== 'validado') pendientes.push('el reconocimiento médico');
    if (!miDoc.dni_entregado) pendientes.push('la copia del DNI');
  }
  const debe = cuota && !cuota.exento && Number(cuota.importe_pendiente) > 0;

  // Equipacion: si debe algo se le recuerda, y si no, se le enseña que existe.
  const alaVenta = catalogo.filter(p => p.activo);
  const encargosVivos = misEncargos.filter(p => p.estado !== 'cancelado');
  const debeEquipacion = encargosVivos.filter(p => !p.pagado).reduce((suma, p) => {
    const prod = catalogo.find(x => x.id === p.producto_id);
    return suma + (prod ? Number(prod.precio) * p.cantidad : 0);
  }, 0);

  const leidos = new Set(lecturas.map(l => l.aviso_id));
  const sinLeer = tablon.filter(a => esDeUnidad(yo.posiciones, a.destinatarios) && !leidos.has(a.id));

  const titulo = (e) => e.tipo === 'partido'
    ? (e.rival ? (e.es_local ? 'vs ' : 'en ') + e.rival : 'Partido')
    : 'Entreno';

  const diaCorto = (iso) => DIAS[(new Date(iso + 'T12:00:00').getDay() + 6) % 7].slice(0, 3);
  const mesCorto = (iso) => fechaCorta(iso).split(' ').pop().replace('.', '');

  cont.innerHTML = html`
    <header class="identidad">
      <p class="saludo">Hola,</p>
      <h2>${yo.apodo || yo.nombre || 'Atlantic'}</h2>
      <p class="chapa">
        <span class="chapa-dorsal">${yo.dorsal != null ? '#' + yo.dorsal : '—'}</span>
        <span>${yo.posiciones.join(' · ') || 'Sin posición'}</span>
        ${miUnidad ? crudo(html`<span class="chapa-unidad">${NOMBRE_UNIDAD[miUnidad]}</span>`) : ''}
      </p>
    </header>

    ${sinLeer.length ? crudo(html`
      <a class="banda-avisos ${sinLeer.some(a => a.prioridad === 'urgente') ? 'urgente' : ''}"
         href="#/avisos">
        <span class="n">${sinLeer.length}</span>
        <span>${sinLeer.length === 1 ? 'aviso sin leer' : 'avisos sin leer'}</span>
        <span class="ir">Ver →</span>
      </a>`) : ''}

    ${evento ? crudo(html`
      <article class="entrada ${evento.tipo === 'partido' ? 'partido' : ''}">
        <div class="entrada-cuerpo">
          <div class="entrada-fecha">
            <span class="dia">${diaCorto(evento.fecha)}</span>
            <span class="num">${Number(evento.fecha.slice(8))}</span>
            <span class="mes">${mesCorto(evento.fecha)}</span>
          </div>
          <div class="entrada-datos">
            <p class="tipo">${evento.tipo === 'partido' ? 'Partido' : 'Entreno'}</p>
            <h3>${titulo(evento)}</h3>
            <p class="detalle fuerte">
              ${cuentaAtras(evento.fecha)}${evento.hora ? ' · ' + hora(evento.hora) : ''}
            </p>
            ${evento.lugar ? crudo(html`<p class="detalle">${evento.lugar}</p>`) : ''}
          </div>
        </div>

        ${evento.notas ? crudo(html`<p class="entrada-nota">${evento.notas}</p>`) : ''}

        ${!esDeUnidad(yo.posiciones, evento.unidad) ? crudo(html`
          <p class="otra-unidad">
            Esta sesión es solo para ${NOMBRE_UNIDAD[evento.unidad].toLowerCase()}.
            No hace falta que vengas.
          </p>`) : ''}

        <div class="entrada-corte"></div>

        <div class="entrada-respuesta">
          <p class="pregunta" id="pregunta">${respuesta ? DICHO[respuesta] : '¿Vas a ir?'}</p>
          <div class="respuesta" id="respuesta">
            ${OPCIONES.map(o => html`
              <button class="opcion ${o.clase}" data-v="${o.valor}" aria-pressed="${respuesta === o.valor}">
                <svg viewBox="0 0 24 24" aria-hidden="true">${crudo(o.icono)}</svg>
                <span>${o.txt}</span>
              </button>`)}
          </div>
          <p class="recuento" id="recuento">&nbsp;</p>
        </div>
      </article>`) : crudo(html`
      <div class="card">
        <p style="margin:0;line-height:1.6" class="muted">
          No hay nada programado por ahora. Cuando el club añada entrenos o partidos,
          aparecerán aquí.
        </p>
      </div>`)}

    ${siguiente ? crudo(html`
      <a class="siguiente" href="#/agenda">
        <span class="et">Y después</span>
        <span class="que">${titulo(siguiente)}</span>
        <span class="cuando">${cuando(siguiente.fecha)}${siguiente.hora ? ' · ' + hora(siguiente.hora) : ''}</span>
      </a>`) : ''}

    ${miAsistencia || pendientes.length || debe || alaVenta.length ? crudo(html`
      <div class="tiras">
        ${miAsistencia ? html`
          <div class="tira">
            <span class="cifra-grande" style="color:${
              miAsistencia.porcentaje >= 70 ? 'var(--ok)' : miAsistencia.porcentaje >= 40 ? 'var(--warn)' : 'var(--bad)'}">
              ${miAsistencia.porcentaje ?? 0}%
            </span>
            <span class="et">Asistencia</span>
            <span class="pie">${miAsistencia.presentes} de ${miAsistencia.computables} entrenos</span>
          </div>` : ''}

        ${pendientes.length ? html`
          <a class="tira aviso" href="#/mificha">
            <span class="cifra-grande" style="color:var(--warn)">${pendientes.length}</span>
            <span class="et">Papeles</span>
            <span class="pie">Falta ${pendientes.join(', ')}</span>
          </a>` : ''}

        ${alaVenta.length ? html`
          <a class="tira ${debeEquipacion > 0 ? 'aviso' : ''}" href="#/tienda">
            <span class="cifra-grande" style="color:${debeEquipacion > 0 ? 'var(--goldf)' : 'var(--teal)'}">
              ${debeEquipacion > 0 ? euros(debeEquipacion) : alaVenta.length}
            </span>
            <span class="et">Equipación</span>
            <span class="pie">${debeEquipacion > 0
              ? 'Te queda por pagar'
              : (alaVenta.length === 1 ? 'Hay algo a la venta' : 'Cosas a la venta del club')}</span>
          </a>` : ''}

        ${debe ? html`
          <a class="tira aviso" href="#/mificha">
            <span class="cifra-grande" style="color:var(--goldf)">${euros(cuota.importe_pendiente)}</span>
            <span class="et">Cuota</span>
            <span class="pie">Pendiente de ${ctx.temporada.nombre}</span>
          </a>` : ''}
      </div>`) : ''}

    <p class="menu-pie">#WeAreAtlantics</p>
  `;

  if (!evento) return;

  async function recuento() {
    try {
      const c = await db.confirmadosDe(evento.id);
      $('#recuento').textContent = c.voy
        ? c.voy + (c.voy === 1 ? ' ha confirmado' : ' han confirmado') +
          (c.duda ? ' · ' + c.duda + ' en duda' : '')
        : 'Nadie ha confirmado todavía. Sé el primero.';
    } catch { /* el recuento es un extra: si falla, no se enseña nada */ }
  }

  $$('#respuesta .opcion').forEach(b => b.addEventListener('click', async () => {
    const valor = b.dataset.v;
    $$('#respuesta .opcion').forEach(o => o.setAttribute('aria-pressed', o === b));
    $('#pregunta').textContent = DICHO[valor];
    try {
      await db.confirmarAsistencia(evento.id, yo.id, valor);
      avisar(valor === 'voy' ? '¡Nos vemos allí!' : valor === 'duda' ? 'Anotado, avisa cuando lo sepas' : 'Anotado');
      recuento();
    } catch (err) { fallo(err); }
  }));

  recuento();
}
