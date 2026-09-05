// Menú — la primera pantalla.
//
// La preside el logotipo principal del club, no una marca de agua: es la cara
// de la app y lo primero que se ve al abrirla.
//
// Absorbe lo que antes era la pantalla "Resumen". Tener un sitio que enseñaba
// "lo que requiere acción" y otro con chinchetas que decían lo mismo era una
// duplicación; ahora lo urgente está aquí, encima de las baldosas.
//
// Deliberadamente sin cifras de dinero: es la pantalla que queda abierta en el
// móvil y la que ve de reojo quien tengas al lado en el campo. Lo que hay en
// caja y lo que debe cada uno están a un toque, pero no de entrada.

import * as db from '../db.js';
import { DIAS_AVISO_CADUCIDAD } from '../config.js';
import { html, crudo, diasHasta, cuando, hoyISO, conRespaldo, cargando } from '../ui.js';

const ICONOS = {
  calendario:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/>',
  roster:    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke-linecap="round"/><path d="M17 11.5a2.6 2.6 0 100-5.2M17.5 20c0-2.4-1-4-2.5-4.6" stroke-linecap="round"/>',
  dinero:    '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/>',
  papeles:   '<path d="M6 3h8l4 4v14H6z" stroke-linejoin="round"/><path d="M14 3v4h4M9 12h6M9 16h6" stroke-linecap="round"/>',
  avisos:    '<path d="M12 3.5a5.5 5.5 0 015.5 5.5c0 5 2 6.5 2 6.5H4.5s2-1.5 2-6.5A5.5 5.5 0 0112 3.5z" stroke-linejoin="round"/><path d="M10 19.5a2 2 0 004 0" stroke-linecap="round"/>',
  liga:      '<path d="M7 4h10v4a5 5 0 01-10 0z" stroke-linejoin="round"/><path d="M7 5.5H4.5v1.5a3 3 0 003 3M17 5.5h2.5v1.5a3 3 0 01-3 3" stroke-linecap="round"/><path d="M12 13v4M9 20h6" stroke-linecap="round"/>',
  material:  '<path d="M12 3.5l7.5 3.2v5.6c0 4.3-3 7.3-7.5 8.2-4.5-.9-7.5-3.9-7.5-8.2V6.7z" stroke-linejoin="round"/><path d="M4.5 10h15" stroke-linecap="round"/>',
  tienda:    '<path d="M4.5 8h15l-1.2 11.5a1.5 1.5 0 01-1.5 1.3H7.2a1.5 1.5 0 01-1.5-1.3z" stroke-linejoin="round"/><path d="M8.8 8V6.2a3.2 3.2 0 016.4 0V8" stroke-linecap="round"/>',
  ajustes:   '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" stroke-linecap="round"/>'
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  // Cada consulta con su respaldo: si una falla, esa baldosa sale sin número y
  // el menú se pinta igual.
  const [plantilla, cuotas, docs, agenda, pendientes, tablon, piezas,
         catalogo, encargos, ligas] = await Promise.all([
    conRespaldo(db.roster(), []),
    conRespaldo(db.cuotasDe(ctx.temporada.id), []),
    conRespaldo(db.documentacionDe(ctx.temporada.id), []),
    conRespaldo(db.eventos(ctx.temporada.id, { desde: hoyISO() }), []),
    conRespaldo(db.solicitudes(), []),
    conRespaldo(db.avisos(ctx.temporada.id), []),
    conRespaldo(db.material(), []),
    conRespaldo(db.productos(), []),
    conRespaldo(db.pedidos(), []),
    conRespaldo(db.competiciones(ctx.temporada.id), [])
  ]);

  const proximo = agenda.find(e => !e.cancelado);
  const porId = new Map(plantilla.map(p => [p.id, p]));
  const vivo = (id) => porId.get(id) && porId.get(id).estado !== 'baja';

  const activos = plantilla.filter(p => p.estado === 'activo').length;
  const morosos = cuotas.filter(c => vivo(c.jugador_id) && !c.exento && Number(c.importe_pendiente) > 0).length;
  const enBajas = piezas.filter(m => m.jugador_id && !vivo(m.jugador_id)).length;
  // Un pedido da trabajo hasta que se entrega, no hasta que se cobra: la
  // chincheta cuenta todo lo que sigue abierto.
  const abiertos  = encargos.filter(p => p.estado !== 'cancelado' && p.estado !== 'entregado');
  const sinCobrar = abiertos.filter(p => !p.pagado).length;

  const papelesPendientes = docs.filter(d => vivo(d.jugador_id) && (
    d.licencia_estado !== 'validado' || !d.dni_entregado
  )).length;

  const caducan = docs.filter(d => vivo(d.jugador_id) &&
    ['licencia_caduca_en'].some(c => {
      const dias = diasHasta(d[c]);
      return dias !== null && dias <= DIAS_AVISO_CADUCIDAD;
    })).length;

  const fichasAMedias = plantilla.filter(p => p.estado !== 'baja' &&
    (!p.telefono || !p.fecha_nacimiento)).length;

  // Lo urgente, en cuentas y nunca en euros.
  const urgente = [
    pendientes.length && { que: pendientes.length === 1 ? 'Una solicitud por resolver'
                                : pendientes.length + ' solicitudes por resolver', a: '#/roster' },
    caducan && { que: caducan === 1 ? 'Un documento caduca pronto'
                     : caducan + ' documentos caducan pronto', a: '#/documentacion' },
    morosos && { que: morosos === 1 ? 'Uno sin pagar la cuota'
                     : morosos + ' sin pagar la cuota', a: '#/dinero' },
    enBajas && { que: enBajas === 1 ? 'Una pieza de material en una baja'
                     : enBajas + ' piezas de material en bajas', a: '#/material' },
    fichasAMedias && { que: fichasAMedias === 1 ? 'Una ficha a medias'
                          : fichasAMedias + ' fichas a medias', a: '#/roster' },
    ctx.temporada.importe_cuota <= 0 && { que: 'Falta fijar el importe de la cuota', a: '#/ajustes' }
  ].filter(Boolean);

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
          ${urgente.length === 0 ? 'Nada pendiente hoy.'
            : urgente.length === 1 ? 'Hay 1 cosa que mirar.'
            : 'Hay ' + urgente.length + ' cosas que mirar.'}
        </p>
      </div>

      ${urgente.length ? crudo(html`
        <div class="pendiente">
          ${urgente.map(u => html`
            <a class="pendiente-fila" href="${u.a}">
              <span>${u.que}</span>
              <span class="flecha">→</span>
            </a>`)}
        </div>`) : ''}

      <div class="rejilla">
        ${baldosa('/calendario', 'calendario', 'Calendario',
          proximo ? cuando(proximo.fecha) + (proximo.tipo === 'partido' ? ' · partido' : ' · entreno')
                  : 'Sin nada programado')}
        ${baldosa('/roster', 'roster', 'Roster',
          activos + (activos === 1 ? ' activo' : ' activos'), pendientes.length)}
        ${baldosa('/dinero', 'dinero', 'Tesorería',
          morosos ? morosos + ' sin pagar' : 'Cuotas, ingresos y gastos', morosos, 'dinero')}
        ${baldosa('/documentacion', 'papeles', 'Documentos',
          papelesPendientes ? papelesPendientes + ' con algo pendiente' : 'Todo en regla', caducan)}
        ${baldosa('/avisos', 'avisos', 'Avisos',
          tablon.length ? 'Último: ' + tablon[0].titulo : 'Nada publicado')}
        ${baldosa('/liga', 'liga', 'Liga',
          ligas.length ? (ligas.find(l => l.activa)?.nombre ?? ligas[0].nombre) : 'Ninguna añadida')}
        ${baldosa('/material', 'material', 'Material',
          piezas.length ? piezas.filter(m => m.jugador_id).length + ' de ' + piezas.length + ' prestadas'
                        : 'Sin inventariar', enBajas)}
        ${baldosa('/tienda', 'tienda', 'Tienda',
          !catalogo.length ? 'Nada a la venta'
            : sinCobrar ? sinCobrar + ' sin cobrar'
            : abiertos.length ? abiertos.length + ' por entregar'
            : 'Todo entregado', abiertos.length, 'dinero')}
        ${baldosa('/ajustes', 'ajustes', 'Ajustes', 'Temporada y cuenta', 0, 'ajuste')}
      </div>

      <p class="ayuda menu-pie">#WeAreAtlantics</p>
    </div>`;
}
