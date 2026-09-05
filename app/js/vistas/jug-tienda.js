// Equipación — lo que el jugador puede pedir.
//
// Pedir es un toque y elegir la talla. El pago va aparte, por Bizum, y aquí
// solo ve si el club ya lo ha dado por cobrado.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

const ESTADO = {
  pedido:    { txt: 'Pedido',    clase: 'warn' },
  entregado: { txt: 'Entregado', clase: 'ok' },
  cancelado: { txt: 'Cancelado', clase: 'n' }
};

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const yo = ctx.perfil;
  const [lista, mios] = await Promise.all([db.productos(), db.misPedidos(yo.id)]);
  const alaVenta = lista.filter(p => p.activo);
  const vivos = mios.filter(p => p.estado !== 'cancelado');

  const aDeber = vivos.filter(p => !p.pagado).reduce((s, p) => {
    const prod = lista.find(x => x.id === p.producto_id);
    return s + (prod ? Number(prod.precio) * p.cantidad : 0);
  }, 0);

  cont.innerHTML = html`
    ${vivos.length ? crudo(html`
      <p class="eyebrow">Lo que has pedido</p>
      <div class="lista">
        ${vivos.map(p => {
          const prod = lista.find(x => x.id === p.producto_id);
          return html`
            <div class="fila">
              ${prod?.foto_url ? crudo(html`<img class="miniatura" src="${prod.foto_url}" alt="">`) : ''}
              <div class="info">
                <div class="nom">${prod?.nombre ?? 'Producto'}</div>
                <div class="meta">
                  ${p.talla ? 'Talla ' + p.talla : ''}${p.cantidad > 1 ? ' · ' + p.cantidad + ' uds' : ''}
                  ${prod ? ' · ' + euros(Number(prod.precio) * p.cantidad) : ''}
                </div>
              </div>
              <div class="dcha">
                ${p.estado === 'entregado' ? crudo('<span class="tag ok">Entregado</span>')
                  : p.pagado ? crudo('<span class="tag teal">Pagado</span>')
                  : crudo(html`<span class="tag ${ESTADO[p.estado].clase}">${ESTADO[p.estado].txt}</span>`)}
              </div>
            </div>`;
        })}
      </div>
      ${aDeber > 0 ? crudo(html`
        <p class="ayuda" style="margin-top:.7rem;line-height:1.6">
          Te quedan <strong>${euros(aDeber)}</strong> por pagar. Se paga por Bizum
          al club, igual que la cuota, y el staff lo marca aquí cuando lo recibe.
        </p>`) : ''}`) : ''}

    <p class="eyebrow">A la venta</p>
    <div id="catalogo" class="catalogo"></div>
  `;

  $('#catalogo').innerHTML = alaVenta.length ? alaVenta.map(prod => html`
    <button class="tarjeta-producto" data-id="${prod.id}">
      ${prod.foto_url ? crudo(html`<img src="${prod.foto_url}" alt="">`)
                      : crudo('<div class="sin-foto"></div>')}
      <div class="cuerpo">
        <div class="nom">${prod.nombre}</div>
        <div class="precio">${euros(prod.precio)}</div>
      </div>
    </button>`).join('') : vacio('El club no tiene nada a la venta ahora mismo.');

  $$('#catalogo .tarjeta-producto').forEach(b => b.addEventListener('click', () =>
    abrirProducto(ctx, alaVenta.find(p => p.id === b.dataset.id), mios, () => render(ctx, cont))));
}

// --- Pedir --------------------------------------------------------------

function abrirProducto(ctx, prod, mios, alPedir) {
  const yaPedido = mios.find(p => p.producto_id === prod.id && p.estado === 'pedido');

  const panel = hoja(prod.nombre, html`
    ${prod.foto_url ? crudo(html`<img class="foto-producto" src="${prod.foto_url}" alt="">`) : ''}
    ${prod.descripcion ? crudo(html`<p style="line-height:1.6">${prod.descripcion}</p>`) : ''}
    <p class="precio-grande">${euros(prod.precio)}</p>

    ${yaPedido ? crudo(html`
      <div class="card" style="text-align:center">
        <p style="margin:0;line-height:1.6">
          Ya lo has pedido${yaPedido.talla ? ' en talla ' + yaPedido.talla : ''}${yaPedido.cantidad > 1 ? ', ' + yaPedido.cantidad + ' unidades' : ''}.
          ${yaPedido.pagado ? 'Y está pagado; queda que te lo den.' : 'Queda pagarlo por Bizum.'}
        </p>
      </div>
      <button class="btn peligro ancho" id="cancelar" style="margin-top:1rem">
        Cancelar mi pedido</button>`) : crudo(html`
      <form id="pedir">
        ${prod.tallas.length ? crudo(html`
          <div class="campo">
            <label>Tu talla</label>
            <div class="filtros" id="tallas" style="flex-wrap:wrap;overflow:visible">
              ${prod.tallas.map(t => html`
                <button type="button" data-t="${t}" aria-pressed="false">${t}</button>`)}
            </div>
          </div>`) : ''}

        <div class="campo"><label>Cuántas</label>
          <input type="number" name="cantidad" value="1" min="1" max="20" inputmode="numeric"></div>

        <button class="btn primario ancho" type="submit">Pedir</button>
        <p class="ayuda" style="margin-top:.8rem;line-height:1.6">
          Esto avisa al club de que lo quieres. El pago va por Bizum, aparte.
        </p>
      </form>`)}`);

  let talla = null;
  $$('#tallas button', panel).forEach(b => b.addEventListener('click', () => {
    talla = b.dataset.t;
    $$('#tallas button', panel).forEach(o => o.setAttribute('aria-pressed', o === b));
  }));

  $('#pedir', panel)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (prod.tallas.length && !talla) { avisar('Elige una talla', 'error'); return; }
    try {
      await db.crearPedido({
        producto_id: prod.id,
        jugador_id: ctx.perfil.id,
        talla,
        cantidad: Number(new FormData(e.target).get('cantidad')) || 1
      });
      avisar('¡Pedido hecho!');
      panel.cerrar();
      alPedir();
    } catch (err) { fallo(err); }
  });

  $('#cancelar', panel)?.addEventListener('click', async () => {
    if (!await confirmar('Cancelar el pedido', '¿Seguro que ya no lo quieres?', 'Cancelar el pedido')) return;
    try {
      await db.guardarPedido(yaPedido.id, { estado: 'cancelado' });
      avisar('Pedido cancelado');
      panel.cerrar();
      alPedir();
    } catch (err) { fallo(err); }
  });
}
