// Ajustes — temporada, importe de la cuota y sesión.

import * as db from '../db.js';
import * as cerrojo from '../cerrojo.js';
import { pintarAjuste as pintarAvisosMovil } from './avisos-ajuste.js';
import {
  html, crudo, $, $$, euros, fecha, nombreCompleto, DIAS, hora, enDiasISO,
  hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();
  const [lista, horario] = await Promise.all([db.temporadas(), db.horarios(ctx.temporada.id)]);

  cont.innerHTML = html`
    <p class="eyebrow">Temporada en curso</p>
    <form id="temporada" class="card">
      <div class="campo"><label>Nombre</label>
        <input name="nombre" value="${ctx.temporada.nombre}" required></div>
      <div class="dos">
        <div class="campo"><label>Empieza</label>
          <input type="date" name="fecha_inicio" value="${ctx.temporada.fecha_inicio}" required></div>
        <div class="campo"><label>Termina</label>
          <input type="date" name="fecha_fin" value="${ctx.temporada.fecha_fin}" required></div>
      </div>
      <div class="campo"><label>Importe de la cuota</label>
        <input type="number" step="0.01" min="0" name="importe_cuota"
               value="${ctx.temporada.importe_cuota}" inputmode="decimal">
        <p class="ayuda">
          Es el importe que se asigna a los jugadores que des de alta a partir de ahora.
          A los que ya están no les cambia solo: para aplicárselo, usa el botón de abajo.
        </p></div>
      <div class="check">
        <input type="checkbox" id="plazos" name="permite_plazos"
               ${ctx.temporada.permite_plazos ? crudo('checked') : ''}>
        <label for="plazos" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Se puede pagar a plazos</label>
      </div>
      <button class="btn primario ancho" type="submit" style="margin-top:.6rem">Guardar</button>
    </form>

    <p class="eyebrow">Horario de entrenos</p>
    <div class="lista">
      ${horario.length ? horario.map(h => html`
        <div class="fila">
          <div class="info">
            <div class="nom">${DIAS[h.dia_semana - 1]} · ${hora(h.hora)}</div>
            <div class="meta">${h.lugar || 'Sin lugar'} · ${h.duracion_min} min${h.activo ? '' : ' · pausado'}</div>
          </div>
          <button class="btn-icono" data-borrar-horario="${h.id}" aria-label="Quitar" style="margin-left:auto">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
          </button>
        </div>`) : vacio('Sin horario fijo. Los entrenos habría que crearlos uno a uno.')}
    </div>
    <div style="display:flex;gap:.6rem;margin-top:.7rem">
      <button class="btn" id="nuevo-horario" style="flex:1">+ Día de entreno</button>
      <button class="btn primario" id="generar" style="flex:1" ${horario.length ? '' : crudo('disabled')}>
        Generar entrenos</button>
    </div>
    <p class="ayuda" style="margin-top:.5rem;line-height:1.6">
      Crea los entrenos de las próximas ocho semanas a partir del horario.
      No duplica los que ya existan, y puedes añadir o cancelar sesiones sueltas
      desde el calendario.
    </p>

    <!-- La lista solo tiene sentido cuando hay entre que elegir. Con una sola
         temporada repetia lo que el formulario de arriba acaba de enseñar, y
         parecia que eran dos cosas distintas cuando era la misma. -->
    ${lista.length > 1 ? crudo(html`
      <p class="eyebrow">Cambiar de temporada</p>
      <div class="lista">
        ${lista.map(t => html`
          <div class="fila">
            <div class="info">
              <div class="nom">${t.nombre}</div>
              <div class="meta">${fecha(t.fecha_inicio)} — ${fecha(t.fecha_fin)} · ${euros(t.importe_cuota)}</div>
            </div>
            <div class="dcha">
              ${t.activa
                ? crudo('<span class="tag ok">En curso</span>')
                : crudo(html`<button class="btn fantasma" data-activar="${t.id}"
                    style="padding:.4rem .7rem;min-height:auto">Activar</button>`)}
            </div>
          </div>`)}
      </div>`) : ''}

    <button class="btn ancho" id="nueva" style="margin-top:.7rem">+ Nueva temporada</button>
    <p class="ayuda" style="margin-top:.5rem;line-height:1.6">
      Una temporada nueva empieza las cuotas y la documentación de cero. La de
      ahora se queda guardada con todo su histórico.
    </p>

    <div id="avisos-movil"></div>
    <div id="cerrojo"></div>

    <p class="eyebrow">Tu cuenta</p>
    <div class="card">
      <div class="fila" style="background:transparent;border:none;padding:0">
        <div class="info">
          <div class="nom">${nombreCompleto(ctx.perfil)}</div>
          <div class="meta">${ctx.perfil.email} · ${ctx.perfil.rol}</div>
        </div>
      </div>
      <button class="btn fantasma ancho" id="salir" style="margin-top:.9rem">Cerrar sesión</button>
    </div>

    <p class="ayuda" style="margin-top:1.5rem;text-align:center;line-height:1.6">
      Consola de gestión · Coruña Atlantics<br>
      Los datos económicos solo los ve un administrador, y eso lo garantiza la
      base de datos, no esta pantalla.
    </p>
  `;

  pintarAvisosMovil($('#avisos-movil'), ctx.perfil);
  cerrojo.pintarAjuste($('#cerrojo'), ctx.perfil);

  $('#temporada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await db.guardarTemporada(ctx.temporada.id, {
        nombre: f.get('nombre'),
        fecha_inicio: f.get('fecha_inicio'),
        fecha_fin: f.get('fecha_fin'),
        importe_cuota: Number(f.get('importe_cuota')),
        permite_plazos: f.get('permite_plazos') === 'on'
      });
      avisar('Temporada guardada');
      ctx.recargar();
    } catch (err) { fallo(err); }
  });

  $$('[data-activar]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Cambiar de temporada',
      'La app pasará a mostrar las cuotas y la documentación de esa temporada. ' +
      'No se borra nada de la actual.', 'Activar')) return;
    try {
      await db.guardarTemporada(ctx.temporada.id, { activa: false });
      await db.guardarTemporada(b.dataset.activar, { activa: true });
      avisar('Temporada activada');
      ctx.recargar();
    } catch (err) { fallo(err); }
  }));

  $('#nueva').addEventListener('click', () => {
    const anio = new Date().getFullYear();
    const panel = hoja('Nueva temporada', html`
      <form id="crear">
        <div class="campo"><label>Nombre</label>
          <input name="nombre" value="${anio}-${String(anio + 1).slice(2)}" required></div>
        <div class="dos">
          <div class="campo"><label>Empieza</label>
            <input type="date" name="fecha_inicio" value="${anio}-09-01" required></div>
          <div class="campo"><label>Termina</label>
            <input type="date" name="fecha_fin" value="${anio + 1}-06-30" required></div>
        </div>
        <div class="campo"><label>Importe de la cuota</label>
          <input type="number" step="0.01" min="0" name="importe_cuota" value="0" inputmode="decimal"></div>
        <button class="btn primario ancho" type="submit">Crear</button>
        <p class="ayuda" style="margin-top:.8rem">
          Se crea sin activar. La activas cuando quieras empezar a trabajar con ella.
        </p>
      </form>`);

    $('#crear', panel).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await db.crearTemporada({
          nombre: f.get('nombre'),
          fecha_inicio: f.get('fecha_inicio'),
          fecha_fin: f.get('fecha_fin'),
          importe_cuota: Number(f.get('importe_cuota')),
          activa: false
        });
        avisar('Temporada creada');
        panel.cerrar();
        render(ctx, cont);
      } catch (err) { fallo(err); }
    });
  });

  $('#nuevo-horario').addEventListener('click', () => {
    const panel = hoja('Día de entreno', html`
      <form id="horario">
        <div class="dos">
          <div class="campo"><label>Día</label>
            <select name="dia_semana">
              ${DIAS.map((d, i) => html`<option value="${i + 1}" ${i === 1 ? crudo('selected') : ''}>${d}</option>`)}
            </select></div>
          <div class="campo"><label>Hora</label>
            <input type="time" name="hora" value="20:30" required></div>
        </div>
        <div class="dos">
          <div class="campo"><label>Duración (min)</label>
            <input type="number" name="duracion_min" value="90" min="15" step="15"></div>
          <div class="campo"><label>Unidad</label>
            <select name="unidad">
              <option value="todos">Todo el equipo</option>
              <option value="ataque">Ataque</option>
              <option value="defensa">Defensa</option>
              <option value="especiales">Equipos especiales</option>
            </select></div>
        </div>
        <div class="campo"><label>Lugar</label>
          <input name="lugar" placeholder="Campo de…"></div>
        <button class="btn primario ancho" type="submit">Añadir</button>
      </form>`);

    $('#horario', panel).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await db.crearHorario({
          temporada_id: ctx.temporada.id,
          dia_semana: Number(f.get('dia_semana')),
          hora: f.get('hora'),
          duracion_min: Number(f.get('duracion_min')),
          unidad: f.get('unidad'),
          lugar: f.get('lugar') || null
        });
        avisar('Día añadido');
        panel.cerrar();
        render(ctx, cont);
      } catch (err) { fallo(err); }
    });
  });

  $$('[data-borrar-horario]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Quitar del horario',
      'Deja de generar entrenos ese día. Los que ya estén creados se quedan.', 'Quitar')) return;
    try {
      await db.borrarHorario(b.dataset.borrarHorario);
      avisar('Quitado');
      render(ctx, cont);
    } catch (err) { fallo(err); }
  }));

  $('#generar').addEventListener('click', async () => {
    const hasta = enDiasISO(56);
    try {
      const n = await db.generarEntrenos(ctx.temporada.id, hasta);
      avisar(n ? n + (n === 1 ? ' entreno creado' : ' entrenos creados') : 'Ya estaban todos creados');
    } catch (err) { fallo(err); }
  });

  $('#salir').addEventListener('click', async () => {
    await db.salir();
    location.reload();
  });
}
