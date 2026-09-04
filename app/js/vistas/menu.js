// Menú — la primera pantalla.
//
// La preside el logotipo principal del club, no una marca de agua: es la cara
// de la app y lo primero que se ve al abrirla.
//
// Deliberadamente sin cifras de dinero: es la pantalla que queda abierta en el
// móvil y la que ve de reojo quien tengas al lado en el campo. El saldo y lo
// que debe cada uno están a un toque, pero no de entrada.

import * as db from '../db.js';
import { DIAS_AVISO_CADUCIDAD } from '../config.js';
import { html, crudo, diasHasta, cuando, cargando } from '../ui.js';

const ICONOS = {
  calendario:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/>',
  disponible:'<path d="M12 3.5l7 3v5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9v-5z" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
  solicitudes:'<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.5 2.9-5.4 6.5-5.4 1.3 0 2.5.25 3.5.7" stroke-linecap="round"/><path d="M15.5 17.5h6M18.5 14.5v6" stroke-linecap="round"/>',
  panel:    '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" stroke-linejoin="round"/>',
  roster:   '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke-linecap="round"/><path d="M17 11.5a2.6 2.6 0 100-5.2M17.5 20c0-2.4-1-4-2.5-4.6" stroke-linecap="round"/>',
  cuotas:   '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/>',
  tesoreria:'<path d="M4 20V9M9 20V5M14 20v-8M19 20V7" stroke-linecap="round"/>',
  papeles:  '<path d="M6 3h8l4 4v14H6z" stroke-linejoin="round"/><path d="M14 3v4h4M9 12h6M9 16h6" stroke-linecap="round"/>',
  ajustes:  '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" stroke-linecap="round"/>'
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [plantilla, cuotas, docs, agenda, apt, pendientes] = await Promise.all([
    db.roster(),
    db.cuotasDe(ctx.temporada.id),
    db.documentacionDe(ctx.temporada.id),
    db.eventos(ctx.temporada.id, { desde: new Date().toISOString().slice(0, 10) }),
    db.aptitud(ctx.temporada.id),
    db.solicitudes()
  ]);

  const proximo = agenda.find(e => !e.cancelado);
  const noPuedenJugar = apt.filter(a => a.apto === 'no').length;

  const porId = new Map(plantilla.map(p => [p.id, p]));
  const vivo = (id) => porId.get(id) && porId.get(id).estado !== 'baja';

  const activos = plantilla.filter(p => p.estado === 'activo').length;
  const morosos = cuotas.filter(c => vivo(c.jugador_id) && !c.exento && Number(c.importe_pendiente) > 0).length;

  const papelesPendientes = docs.filter(d => vivo(d.jugador_id) && (
    d.licencia_estado !== 'validado' ||
    d.seguro_estado !== 'validado' ||
    d.reconocimiento_estado !== 'validado' ||
    !d.dni_entregado
  )).length;

  const caducan = docs.filter(d => vivo(d.jugador_id) &&
    ['licencia_caduca_en', 'seguro_caduca_en', 'reconocimiento_caduca_en'].some(c => {
      const dias = diasHasta(d[c]);
      return dias !== null && dias <= DIAS_AVISO_CADUCIDAD;
    })).length;

  const fichasAMedias = plantilla.filter(p => p.estado !== 'baja' &&
    (!p.telefono || !p.fecha_nacimiento)).length;

  const avisos = morosos + caducan + fichasAMedias;

  // El área tiñe la baldosa: oro para dinero, teal para personas y papeles.
  const baldosa = (ruta, icono, titulo, pie, alerta = 0, area = 'equipo') => html`
    <a class="baldosa" data-area="${area}" href="#${ruta}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${crudo(ICONOS[icono])}</svg>
      <span class="t">${titulo}</span>
      <span class="b">${pie}</span>
      ${alerta > 0 ? crudo(html`<span class="chincheta">${alerta}</span>`) : ''}
    </a>`;

  cont.innerHTML = html`
    <div class="menu">
      <div class="menu-portada">
        <img src="./img/logo-principal.webp" alt="Coruña Atlantics" width="900" height="756">
      </div>

      <div class="menu-saludo">
        <p class="eyebrow" style="margin:0">Temporada ${ctx.temporada.nombre}</p>
        <p class="frase">
          ${avisos === 0 ? 'Nada pendiente hoy.'
            : avisos === 1 ? 'Hay 1 cosa que mirar.'
            : 'Hay ' + avisos + ' cosas que mirar.'}
        </p>
      </div>

      <div class="rejilla">
        ${baldosa('/calendario', 'calendario', 'Calendario',
          proximo ? cuando(proximo.fecha) + (proximo.tipo === 'partido' ? ' · partido' : ' · entreno')
                  : 'Sin nada programado')}
        ${baldosa('/panel', 'panel', 'Resumen', avisos ? 'Lo que requiere acción' : 'Todo al día', avisos)}
        ${baldosa('/roster', 'roster', 'Roster', activos + (activos === 1 ? ' activo' : ' activos'))}
        ${baldosa('/disponibilidad', 'disponible', 'Disponibilidad',
          noPuedenJugar ? noPuedenJugar + ' no pueden jugar' : 'Todos listos')}
        ${baldosa('/cuotas', 'cuotas', 'Cuotas', morosos ? morosos + ' sin pagar' : 'Todas al día', morosos, 'dinero')}
        ${baldosa('/tesoreria', 'tesoreria', 'Tesorería', 'Ingresos y gastos', 0, 'dinero')}
        ${baldosa('/documentacion', 'papeles', 'Papeles',
          papelesPendientes ? papelesPendientes + ' con algo pendiente' : 'Todo en regla', caducan)}
        ${baldosa('/solicitudes', 'solicitudes', 'Solicitudes',
          pendientes.length ? (pendientes.length === 1 ? 'Uno quiere entrar' : pendientes.length + ' quieren entrar')
                            : 'Nadie esperando', pendientes.length)}
        ${baldosa('/ajustes', 'ajustes', 'Ajustes', 'Temporada y cuenta', 0, 'ajuste')}
      </div>

      <p class="ayuda menu-pie">#WeAreAtlantics</p>
    </div>`;
}
