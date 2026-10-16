// "Ya he pagado" — el jugador avisa de su pago y tesorería lo valida.
//
// Dos mitades de un mismo circuito, por eso viven juntas:
//   - pintarAvisoPago: en Mi ficha, debajo de la cuota. Botón para avisar y,
//     mientras tanto, en qué estado está su aviso.
//   - pintarPorValidar: en Tesorería, arriba de todo. Los avisos que esperan,
//     y validar o rechazar cada uno.
//
// Lo que dice el jugador no cuenta como cobrado: es un aviso. Al validarlo se
// apunta el pago de verdad y la cuota pasa sola a "al día", porque el estado se
// calcula a partir de los pagos (app/db/31_pago_avisado.sql).

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, hoyISO, nombreCompleto, hoja, confirmar,
  avisar, fallo, conRespaldo
} from '../ui.js';

const METODOS = { bizum: 'Bizum', transferencia: 'transferencia', efectivo: 'efectivo', otro: 'otro medio' };
const metodoDe = (m) => METODOS[m] ?? m;

// --- El jugador ------------------------------------------------------------

export async function pintarAvisoPago(cont, { cuota, alCambiar }) {
  if (!cont || !cuota || cuota.exento) return;

  const avisos = await conRespaldo(db.misPagosAvisados(cuota.id), []);
  const pendiente = avisos.find(a => a.estado === 'pendiente');
  const ultimo = avisos[0];
  const debe = Number(cuota.importe_pendiente) > 0;

  if (pendiente) {
    cont.innerHTML = html`
      <div class="aviso-pago espera">
        <p><strong>Pendiente de confirmar.</strong> Avisaste de un pago de
          ${euros(pendiente.importe)} por ${metodoDe(pendiente.metodo)} el ${fecha(pendiente.fecha)}.
          Cuando el club lo compruebe, aquí pondrá que estás al día.</p>
        <button class="btn fantasma pequeno" id="retirar-pago">Me he equivocado, quitar el aviso</button>
      </div>`;
    $('#retirar-pago', cont).addEventListener('click', async () => {
      if (!await confirmar('Quitar el aviso', 'El club dejará de verlo como pago por confirmar.', 'Quitar')) return;
      try {
        await db.retirarPagoAvisado(pendiente.id);
        avisar('Aviso quitado');
        alCambiar();
      } catch (err) { fallo(err); }
    });
    return;
  }

  if (!debe) { cont.innerHTML = ''; return; }

  const rechazado = ultimo?.estado === 'rechazado' ? ultimo : null;

  cont.innerHTML = html`
    ${rechazado ? crudo(html`
      <div class="aviso-pago rechazo">
        <p><strong>El club no ha encontrado tu pago</strong> de ${euros(rechazado.importe)}
          del ${fecha(rechazado.fecha)}.${rechazado.motivo ? ' ' + rechazado.motivo : ''}
          Si lo hiciste, vuelve a avisar o habla con quien lleva las cuentas.</p>
      </div>`) : ''}
    <button class="btn primario ancho" id="ya-pague" style="margin-top:.8rem">Ya he pagado</button>`;

  $('#ya-pague', cont).addEventListener('click', () => abrirAviso(cuota, alCambiar));
}

function abrirAviso(cuota, alCambiar) {
  const panel = hoja('Avisar de un pago', html`
    <p class="muted" style="margin:0 0 1rem;line-height:1.6">
      Al club le llega un aviso. Lo comprueba en la cuenta y, cuando lo confirme,
      tu cuota se pone al día sola.
    </p>
    <form id="form-pago">
      <div class="dos">
        <div class="campo"><label>Cuánto</label>
          <input name="importe" type="number" step="0.01" min="0.01" inputmode="decimal"
                 value="${Number(cuota.importe_pendiente)}" required></div>
        <div class="campo"><label>Cuándo</label>
          <input name="fecha" type="date" value="${hoyISO()}" max="${hoyISO()}" required></div>
      </div>
      <div class="campo"><label>Cómo</label>
        <select name="metodo">
          <option value="bizum">Bizum</option>
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">En mano</option>
          <option value="otro">Otro</option>
        </select></div>
      <div class="campo"><label>Algo que deba saber el club</label>
        <input name="nota" placeholder="Opcional: desde otra cuenta, a nombre de…"></div>
      <button class="btn primario ancho" type="submit">Avisar al club</button>
    </form>`);

  $('#form-pago', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button[type=submit]');
    const d = Object.fromEntries(new FormData(e.target).entries());
    boton.disabled = true;
    try {
      await db.avisarPago({
        cuotaId: cuota.id, importe: Number(d.importe), metodo: d.metodo,
        fecha: d.fecha, nota: d.nota
      });
      avisar('Avisado. Cuando el club lo confirme, estarás al día.');
      panel.cerrar();
      alCambiar();
    } catch (err) { fallo(err); boton.disabled = false; }
  });
}

// --- Tesorería -------------------------------------------------------------

export async function pintarPorValidar(cont, ctx, alCambiar) {
  if (!cont) return;
  const [avisos, plantilla, cuotas] = await Promise.all([
    conRespaldo(db.pagosPorValidar(), []),
    conRespaldo(db.roster(), []),
    conRespaldo(db.cuotasDe(ctx.temporada.id), [])
  ]);
  if (!avisos.length) { cont.innerHTML = ''; return; }

  const porId = new Map(plantilla.map(p => [p.id, p]));
  const cuotaDe = new Map(cuotas.map(c => [c.id, c]));

  cont.innerHTML = html`
    <p class="eyebrow">Pagos por validar<span class="cuenta">${avisos.length}</span></p>
    <div class="lista por-validar">
      ${avisos.map(a => {
        const jug = porId.get(a.jugador_id);
        return html`
          <button class="fila" data-aviso="${a.id}">
            <div class="dorsal ${jug?.dorsal == null ? 'sin' : ''}">${jug?.dorsal ?? '—'}</div>
            <div class="info">
              <div class="nom">${jug ? nombreCompleto(jug) : 'Alguien'}</div>
              <div class="meta">${metodoDe(a.metodo)} · ${fecha(a.fecha)}${a.nota ? ' · ' + a.nota : ''}</div>
            </div>
            <div class="dcha"><div class="importe" style="color:var(--goldf)">${euros(a.importe)}</div></div>
          </button>`;
      })}
    </div>`;

  $$('[data-aviso]', cont).forEach(b => b.addEventListener('click', () => {
    const a = avisos.find(x => x.id === b.dataset.aviso);
    abrirValidar(a, porId.get(a.jugador_id), cuotaDe.get(a.cuota_id), alCambiar);
  }));
}

function abrirValidar(a, jug, cuota, alCambiar) {
  const nombre = jug ? nombreCompleto(jug) : 'Este jugador';
  const panel = hoja('Pago por validar', html`
    <div class="card" style="text-align:center">
      <div style="font-family:'Anton',sans-serif;font-size:2.2rem;line-height:1;color:var(--goldf)">
        ${euros(a.importe)}</div>
      <p class="muted" style="margin:.7rem 0 0;line-height:1.5">
        ${nombre} dice que lo pagó por ${metodoDe(a.metodo)} el ${fecha(a.fecha)}.
        ${cuota ? 'Le quedaban ' + euros(cuota.importe_pendiente) + ' de ' + euros(cuota.importe_total) + '.' : ''}
      </p>
      ${a.nota ? crudo(html`<p style="margin:.6rem 0 0">«${a.nota}»</p>`) : ''}
    </div>

    <p class="eyebrow">Si ha llegado</p>
    <form id="validar">
      <div class="campo"><label>Importe que ha llegado</label>
        <input name="importe" type="number" step="0.01" min="0.01" inputmode="decimal"
               value="${Number(a.importe)}" required>
        <p class="ayuda">Cámbialo si no coincide con lo que dice.</p></div>
      <button class="btn primario ancho" type="submit">Validar el pago</button>
    </form>

    <p class="eyebrow">Si no aparece</p>
    <form id="rechazar">
      <div class="campo"><label>Por qué</label>
        <input name="motivo" placeholder="Opcional: no aparece en la cuenta…"></div>
      <button class="btn fantasma ancho" type="submit">No lo encuentro</button>
    </form>`);

  $('#validar', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const importe = Number(new FormData(e.target).get('importe'));
    try {
      await db.validarPagoAvisado(a.id, importe);
      const queda = cuota ? Math.max(0, Number(cuota.importe_pendiente) - importe) : null;
      avisar('Pago validado');
      // Que se entere sin tener que abrir la app. Si no le llega, lo ve igual
      // en su ficha la próxima vez. Sin cifras: sale en la pantalla bloqueada.
      db.avisarAlMovil('Pago confirmado',
        queda === 0 ? 'El club ha confirmado tu pago. Estás al día con la cuota.'
          : 'El club ha confirmado tu pago. Lo que te queda lo tienes en Mi ficha.',
        '/app/#/mificha', [a.jugador_id]).catch(() => {});
      panel.cerrar();
      alCambiar();
    } catch (err) { fallo(err); }
  });

  $('#rechazar', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivo = new FormData(e.target).get('motivo') || null;
    if (!await confirmar('No lo encuentro',
      'Se le dirá que el club no ha encontrado su pago y podrá volver a avisar.', 'Rechazar')) return;
    try {
      await db.rechazarPagoAvisado(a.id, motivo);
      avisar('Aviso rechazado');
      db.avisarAlMovil('Pago sin encontrar',
        'El club no ha encontrado tu pago. Lo tienes en Mi ficha.',
        '/app/#/mificha', [a.jugador_id]).catch(() => {});
      panel.cerrar();
      alCambiar();
    } catch (err) { fallo(err); }
  });
}
