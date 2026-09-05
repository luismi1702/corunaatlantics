// Avisos — el tablón, desde el lado del club.
//
// Publicar es fácil a propósito. Lo que de verdad aporta es la otra mitad: ver
// quién no lo ha leído, para poder perseguir a esos cuatro por otro canal en
// vez de repetir el aviso al grupo entero.

import * as db from '../db.js';
import {
  html, crudo, $, $$, fecha, nombreCompleto, NOMBRE_UNIDAD, esDeUnidad,
  hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

const cuandoTexto = (iso) => {
  const dias = Math.round((Date.now() - new Date(iso)) / 864e5);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return 'Hace ' + dias + ' días';
  return fecha(iso.slice(0, 10));
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [lista, plantilla] = await Promise.all([
    db.avisos(ctx.temporada.id),
    db.roster()
  ]);
  const activos = plantilla.filter(p => p.estado !== 'baja');

  cont.innerHTML = html`
    <div id="lista" class="lista"></div>
    <button class="btn primario ancho" id="nuevo" style="margin-top:1rem">+ Publicar aviso</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Los avisos no se contestan. Si necesitas respuesta, pregunta en el aviso y
      que te contesten por donde quieras.
    </p>
  `;

  $('#lista').innerHTML = lista.length ? lista.map(a => {
    const alcance = activos.filter(p => esDeUnidad(p.posiciones, a.destinatarios)).length;
    return html`
      <button class="fila aviso-fila ${a.prioridad === 'urgente' ? 'urgente' : ''}" data-id="${a.id}">
        <div class="info">
          <div class="nom">
            ${a.fijado ? crudo('<span class="chincha">📌</span> ') : ''}${a.titulo}
          </div>
          <div class="meta">
            ${cuandoTexto(a.creado_en)}
            ${a.destinatarios !== 'todos' ? ' · solo ' + NOMBRE_UNIDAD[a.destinatarios].toLowerCase() : ''}
            · ${alcance} ${alcance === 1 ? 'destinatario' : 'destinatarios'}
          </div>
        </div>
        <div class="dcha">
          ${a.prioridad === 'urgente' ? crudo('<span class="tag bad">Urgente</span>') : ''}
        </div>
      </button>`;
  }).join('') : vacio('Todavía no has publicado ningún aviso.');

  $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
    abrirAviso(ctx, lista.find(a => a.id === b.dataset.id), activos, () => render(ctx, cont))));

  $('#nuevo').addEventListener('click', () =>
    editarAviso(ctx, {}, () => render(ctx, cont)));
}

// --- Un aviso publicado ---------------------------------------------------

async function abrirAviso(ctx, a, activos, alGuardar) {
  const lecturas = await db.lecturasDe(a.id);
  const leidoPor = new Set(lecturas.map(l => l.jugador_id));
  const destinatarios = activos.filter(p => esDeUnidad(p.posiciones, a.destinatarios));
  const sinLeer = destinatarios.filter(p => !leidoPor.has(p.id));

  const panel = hoja(a.titulo, html`
    <p class="muted" style="margin:0 0 .3rem;font-size:.86rem">
      ${cuandoTexto(a.creado_en)}
      ${a.destinatarios !== 'todos' ? ' · solo ' + NOMBRE_UNIDAD[a.destinatarios].toLowerCase() : ''}
      ${a.prioridad === 'urgente' ? ' · urgente' : ''}
    </p>
    ${a.cuerpo ? crudo(html`<p style="line-height:1.6;white-space:pre-wrap">${a.cuerpo}</p>`) : ''}

    <div class="cifras" style="margin-top:1rem">
      <div class="cifra ok"><div class="n">${leidoPor.size}</div><div class="l">Leído</div></div>
      <div class="cifra ${sinLeer.length ? 'bad' : ''}"><div class="n">${sinLeer.length}</div><div class="l">Sin leer</div></div>
      <div class="cifra"><div class="n">${destinatarios.length}</div><div class="l">En total</div></div>
    </div>

    ${sinLeer.length ? crudo(html`
      <p class="eyebrow">No lo han leído</p>
      <div class="lista">
        ${sinLeer.map(p => html`
          <div class="fila">
            <div class="dorsal ${p.dorsal == null ? 'sin' : ''}">${p.dorsal ?? '—'}</div>
            <div class="info"><div class="nom">${nombreCompleto(p)}</div></div>
          </div>`)}
      </div>
      <button class="btn oro ancho" id="copiar" style="margin-top:.8rem">
        Copiar los nombres</button>`) : crudo(html`
      <p class="ayuda" style="text-align:center;margin-top:1rem">
        Lo ha leído todo el mundo.</p>`)}

    <div style="display:flex;gap:.6rem;margin-top:1.4rem">
      <button class="btn peligro" id="borrar">Borrar</button>
      <button class="btn primario" style="flex:1" id="editar">Editar</button>
    </div>`);

  $('#copiar', panel)?.addEventListener('click', async () => {
    const texto = 'Sin leer "' + a.titulo + '":\n' +
      sinLeer.map(p => '· ' + nombreCompleto(p)).join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Nombres copiados');
    } catch {
      hoja('Sin leer', html`<textarea style="width:100%;min-height:220px">${texto}</textarea>`);
    }
  });

  $('#editar', panel).addEventListener('click', () => {
    panel.cerrar();
    editarAviso(ctx, a, alGuardar);
  });

  $('#borrar', panel).addEventListener('click', async () => {
    if (!await confirmar('Borrar el aviso',
      'Desaparece del tablón de todos, junto con el registro de quién lo había leído.',
      'Borrar')) return;
    try {
      await db.borrarAviso(a.id);
      avisar('Aviso borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Publicar o editar ----------------------------------------------------

function editarAviso(ctx, a, alGuardar) {
  const esNuevo = !a.id;

  const panel = hoja(esNuevo ? 'Publicar aviso' : 'Editar aviso', html`
    <form id="aviso">
      <div class="campo"><label>Título</label>
        <input name="titulo" required value="${a.titulo ?? ''}"
               placeholder="El jueves entrenamos a las 21:00"></div>

      <div class="campo"><label>Mensaje</label>
        <textarea name="cuerpo" style="min-height:130px"
                  placeholder="Lo que haga falta explicar">${a.cuerpo ?? ''}</textarea></div>

      <div class="campo"><label>Para quién</label>
        <select name="destinatarios">
          ${['todos','ataque','defensa','especiales'].map(u => html`
            <option value="${u}" ${(a.destinatarios ?? 'todos') === u ? crudo('selected') : ''}>
              ${u === 'todos' ? 'Todo el equipo' : NOMBRE_UNIDAD[u]}</option>`)}
        </select></div>

      <div class="check">
        <input type="checkbox" id="urgente" name="urgente" ${a.prioridad === 'urgente' ? crudo('checked') : ''}>
        <label for="urgente" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Urgente</label>
      </div>
      <div class="check">
        <input type="checkbox" id="fijado" name="fijado" ${a.fijado ? crudo('checked') : ''}>
        <label for="fijado" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Fijar arriba del tablón</label>
      </div>
      <p class="ayuda" style="margin-top:.5rem;line-height:1.6">
        Guarda lo urgente para lo que de verdad lo sea. Si todo es urgente, deja
        de significar nada y la gente aprende a ignorarlo.
      </p>

      <button class="btn primario ancho" type="submit" style="margin-top:1rem">
        ${esNuevo ? 'Publicar' : 'Guardar'}</button>
    </form>`);

  $('#aviso', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      temporada_id: ctx.temporada.id,
      titulo: f.get('titulo'),
      cuerpo: f.get('cuerpo') || null,
      destinatarios: f.get('destinatarios'),
      prioridad: f.get('urgente') === 'on' ? 'urgente' : 'normal',
      fijado: f.get('fijado') === 'on'
    };
    try {
      if (esNuevo) await db.crearAviso({ ...datos, autor_id: ctx.perfil.id });
      else await db.guardarAviso(a.id, datos);
      avisar(esNuevo ? 'Aviso publicado' : 'Aviso guardado');

      // Publicar un aviso es avisar. Solo al crearlo: corregir una falta de
      // ortografia media hora despues no tiene por que sonarle a nadie otra vez.
      //
      // Y va aparte del guardado: si fallara el envio, el aviso ya esta
      // publicado y en la app. Se dice, pero no se deshace nada.
      if (esNuevo) {
        try {
          const r = await db.avisarAlMovil(datos.titulo, datos.cuerpo ?? '', '/app/#/avisos');
          if (r?.enviados) avisar('Enviado a ' + r.enviados + (r.enviados === 1 ? ' móvil' : ' móviles'));
        } catch (err) {
          console.error(err);
          avisar('Publicado, pero no se ha podido avisar a los móviles.', 'error');
        }
      }

      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
