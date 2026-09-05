// Tienda — lo que vende el club y quién ha pedido qué.
//
// No cobra: el dinero entra por Bizum como las cuotas. Lo que resuelve es el
// lío de verdad — cuántas sudaderas hay que encargar, de qué tallas, quién ha
// pagado y a quién se la has dado ya.
//
// El pedido recorre tres pasos: pedido, cobrado y entregado. Hasta el último
// sigue apareciendo como pendiente, porque hasta el último queda algo por
// hacer. Y lo cobrado se pasa a la caja de una vez por producto: mientras no
// lo hagas, ese dinero no existe para la tesorería.

import * as db from '../db.js';
import {
  html, crudo, $, $$, euros, fecha, hoyISO, nombreCompleto,
  hoja, confirmar, avisar, fallo, cargando, vacio
} from '../ui.js';

export async function render(ctx, cont) {
  cont.innerHTML = cargando();

  const [lista, todos, plantilla] = await Promise.all([
    db.productos(), db.pedidos(), db.roster()
  ]);
  const porId = new Map(plantilla.map(p => [p.id, p]));
  const vivos = todos.filter(p => p.estado !== 'cancelado');

  const deProducto = (id) => vivos.filter(p => p.producto_id === id);
  const importe = (pedido, prod) => Number(prod.precio) * pedido.cantidad;

  const total = vivos.reduce((s, p) => {
    const prod = lista.find(x => x.id === p.producto_id);
    return s + (prod ? importe(p, prod) : 0);
  }, 0);
  const cobrado = vivos.filter(p => p.pagado).reduce((s, p) => {
    const prod = lista.find(x => x.id === p.producto_id);
    return s + (prod ? importe(p, prod) : 0);
  }, 0);

  const porEntregar = vivos.filter(p => p.estado !== 'entregado').length;

  cont.innerHTML = html`
    <div class="cifras">
      <div class="cifra"><div class="n">${vivos.reduce((s, p) => s + p.cantidad, 0)}</div><div class="l">Pedidas</div></div>
      <div class="cifra ok"><div class="n">${euros(cobrado)}</div><div class="l">Cobrado</div></div>
      <div class="cifra ${total - cobrado > 0 ? 'gold' : ''}"><div class="n">${euros(total - cobrado)}</div><div class="l">Pendiente</div></div>
    </div>
    ${porEntregar ? crudo(html`
      <p class="ayuda" style="text-align:center;margin:.7rem 0 0">
        ${porEntregar === 1 ? 'Queda 1 pedido por entregar' : 'Quedan ' + porEntregar + ' pedidos por entregar'}
      </p>`) : ''}

    <div id="lista" style="margin-top:1rem"></div>

    <button class="btn primario ancho" id="nuevo" style="margin-top:1rem">+ Añadir producto</button>
    <p class="ayuda" style="text-align:center;margin-top:.5rem;line-height:1.6">
      Los jugadores lo ven en la app y hacen su pedido con su talla.
      El cobro sigue siendo por Bizum: aquí solo marcas quién ha pagado.
    </p>
  `;

  $('#lista').innerHTML = lista.length ? lista.map(prod => {
    const suyos = deProducto(prod.id);
    const unidades = suyos.reduce((s, p) => s + p.cantidad, 0);
    const sinPagar = suyos.filter(p => !p.pagado).length;
    const sinEntregar = suyos.filter(p => p.estado !== 'entregado').length;
    return html`
      <button class="fila producto ${prod.activo ? '' : 'inactivo'}" data-id="${prod.id}">
        ${prod.foto_url
          ? crudo(html`<img class="miniatura" src="${prod.foto_url}" alt="">`)
          : crudo('<div class="miniatura sin"></div>')}
        <div class="info">
          <div class="nom">${prod.nombre}</div>
          <div class="meta">
            ${euros(prod.precio)}${prod.tallas.length ? ' · ' + prod.tallas.join(' ') : ''}
            ${prod.activo ? '' : ' · no se muestra'}
          </div>
          <div class="meta">
            ${unidades ? unidades + (unidades === 1 ? ' pedida' : ' pedidas') : 'Sin pedidos'}
            ${sinPagar ? ' · ' + sinPagar + ' sin pagar' : ''}
            ${!sinPagar && sinEntregar ? ' · ' + sinEntregar + ' por entregar' : ''}
          </div>
        </div>
        <div class="dcha">
          ${sinPagar ? crudo(html`<span class="tag warn">${sinPagar}</span>`)
            : sinEntregar ? crudo(html`<span class="tag teal">${sinEntregar}</span>`) : ''}
        </div>
      </button>`;
  }).join('') : vacio('Todavía no has puesto nada a la venta.');

  $$('#lista .fila').forEach(b => b.addEventListener('click', () =>
    abrirProducto(ctx, lista.find(p => p.id === b.dataset.id), deProducto(b.dataset.id), porId,
                  () => render(ctx, cont))));

  $('#nuevo').addEventListener('click', () => editarProducto(ctx, {}, () => render(ctx, cont)));
}

// --- Un producto y sus pedidos --------------------------------------------

function abrirProducto(ctx, prod, suyos, porId, alGuardar) {
  // Lo entregado sale de la lista de trabajo: ya no hay nada que hacer con
  // ello, pero se queda a la vista por si te confundes de persona.
  const abiertos   = suyos.filter(p => p.estado !== 'entregado');
  const entregados = suyos.filter(p => p.estado === 'entregado');

  // Cobrado y todavia fuera de la caja. El apunte lo hace la base de datos de
  // una vez, y marca los pedidos para que no entre dos veces.
  const porApuntar = suyos
    .filter(p => p.pagado && !p.movimiento_id)
    .reduce((s, p) => s + Number(prod.precio) * p.cantidad, 0);

  const porTalla = {};
  for (const p of suyos) {
    const t = p.talla || '—';
    porTalla[t] = (porTalla[t] ?? 0) + p.cantidad;
  }

  const panel = hoja(prod.nombre, html`
    ${prod.foto_url ? crudo(html`<img class="foto-producto" src="${prod.foto_url}" alt="">`) : ''}
    ${prod.descripcion ? crudo(html`<p style="line-height:1.6">${prod.descripcion}</p>`) : ''}
    <p class="precio-grande">${euros(prod.precio)}</p>

    ${Object.keys(porTalla).length ? crudo(html`
      <p class="eyebrow">Cuántas encargar</p>
      <div class="tallas-resumen">
        ${Object.entries(porTalla).sort().map(([t, n]) => html`
          <div class="talla-cuenta"><span class="t">${t}</span><span class="n">${n}</span></div>`)}
      </div>`) : ''}

    <p class="eyebrow">Pendientes${abiertos.length ? crudo(html`<span class="cuenta">${abiertos.length}</span>`) : ''}</p>
    <div class="lista">
      ${abiertos.length ? abiertos.map(p => {
        const quien = porId.get(p.jugador_id);
        return html`
          <div class="fila">
            <div class="info">
              <div class="nom">${quien ? nombreCompleto(quien) : 'Alguien'}</div>
              <div class="meta">
                ${p.talla ? 'Talla ' + p.talla : 'Sin talla'}
                ${p.cantidad > 1 ? ' · ' + p.cantidad + ' uds' : ''}
                · ${euros(Number(prod.precio) * p.cantidad)}
              </div>
            </div>
            <div class="dcha" style="display:flex;gap:.4rem">
              <button class="btn ${p.pagado ? 'fantasma' : 'oro'}" data-pago="${p.id}"
                      style="padding:.45rem .7rem;min-height:auto">
                ${p.pagado ? 'Pagado' : 'Cobrar'}
              </button>
              <button class="btn ${p.pagado ? 'primario' : ''}" data-entregar="${p.id}"
                      style="padding:.45rem .7rem;min-height:auto">Entregar</button>
            </div>
          </div>`;
      }) : vacio(entregados.length ? 'Todo entregado.' : 'Nadie lo ha pedido todavía.')}
    </div>

    ${porApuntar > 0 ? crudo(html`
      <div class="card" style="margin-top:.9rem">
        <p style="margin:0 0 .8rem;line-height:1.6">
          Quedan <strong>${euros(porApuntar)}</strong> cobrados de este producto
          fuera de la caja: de antes, o marcados por alguien que no lleva las
          cuentas.
        </p>
        <button class="btn oro ancho" id="apuntar">Apuntar en tesorería</button>
      </div>`) : ''}

    ${entregados.length ? crudo(html`
      <p class="eyebrow">Entregados<span class="cuenta">${entregados.length}</span></p>
      <div class="lista">
        ${entregados.map(p => {
          const quien = porId.get(p.jugador_id);
          return html`
            <div class="fila" style="opacity:.62">
              <div class="info">
                <div class="nom">${quien ? nombreCompleto(quien) : 'Alguien'}</div>
                <div class="meta">
                  ${p.talla ? 'Talla ' + p.talla : 'Sin talla'}
                  ${p.entregado_en ? ' · ' + fecha(p.entregado_en) : ''}
                </div>
              </div>
              <div class="dcha">
                <button class="btn fantasma" data-devolver="${p.id}"
                        style="padding:.45rem .7rem;min-height:auto">Deshacer</button>
              </div>
            </div>`;
        })}
      </div>`) : ''}

    <div style="display:flex;gap:.6rem;margin-top:1.4rem">
      <button class="btn peligro" id="borrar">Borrar</button>
      <button class="btn primario" style="flex:1" id="editar">Editar</button>
    </div>`);

  $$('[data-pago]', panel).forEach(b => b.addEventListener('click', async () => {
    const pedido = suyos.find(p => p.id === b.dataset.pago);
    try {
      // Cobrar apunta el dinero en la caja de paso: son el mismo hecho.
      const mov = await db.cobrarPedido(pedido.id, !pedido.pagado, ctx.temporada.id);
      avisar(pedido.pagado ? 'Marcado como no pagado'
             : mov ? 'Cobrado y apuntado en la caja' : 'Cobrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  }));

  $$('[data-entregar]', panel).forEach(b => b.addEventListener('click', async () => {
    const pedido = abiertos.find(p => p.id === b.dataset.entregar);
    if (!pedido.pagado && !await confirmar('Entregar sin cobrar',
      'Este pedido no está marcado como pagado. ¿Se la das igual?', 'Entregar')) return;
    try {
      await db.guardarPedido(pedido.id, { estado: 'entregado', entregado_en: hoyISO() });
      avisar('Entregado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  }));

  $$('[data-devolver]', panel).forEach(b => b.addEventListener('click', async () => {
    try {
      await db.guardarPedido(b.dataset.devolver, { estado: 'pedido', entregado_en: null });
      avisar('Vuelve a pendientes');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  }));

  $('#apuntar', panel)?.addEventListener('click', async () => {
    if (!await confirmar('Apuntar en tesorería',
      'Se crea un ingreso de ' + euros(porApuntar) + ' en la caja, como merchandising. ' +
      'Estos pedidos ya no se volverán a contar.', 'Apuntar')) return;
    try {
      await db.apuntarTiendaEnTesoreria(prod.id, ctx.temporada.id);
      avisar('En la caja');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });

  $('#editar', panel).addEventListener('click', () => {
    panel.cerrar();
    editarProducto(ctx, prod, alGuardar);
  });

  $('#borrar', panel).addEventListener('click', async () => {
    if (!await confirmar('Borrar el producto',
      'Desaparece de la app y con él todos los pedidos que haya recibido.', 'Borrar')) return;
    try {
      await db.borrarProducto(prod.id);
      avisar('Borrado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}

// --- Alta y edición -------------------------------------------------------

function editarProducto(ctx, prod, alGuardar) {
  const esNuevo = !prod.id;
  let fotoUrl = prod.foto_url ?? null;

  const panel = hoja(esNuevo ? 'Nuevo producto' : 'Editar producto', html`
    <form id="producto">
      <div class="campo">
        <label>Foto</label>
        <div class="subir-foto" id="zona-foto">
          ${fotoUrl ? crudo(html`<img src="${fotoUrl}" alt="">`)
                    : crudo('<span class="pista">Toca para elegir una foto</span>')}
        </div>
        <input type="file" id="archivo" accept="image/*" hidden>
        <p class="ayuda">Se sube a tu propio almacenamiento. Cuanto más cuadrada, mejor se ve.</p>
      </div>

      <div class="campo"><label>Nombre</label>
        <input name="nombre" required value="${prod.nombre ?? ''}" placeholder="Sudadera Atlantics"></div>

      <div class="campo"><label>Descripción</label>
        <textarea name="descripcion" placeholder="Color, material, lo que haga falta">${prod.descripcion ?? ''}</textarea></div>

      <div class="campo"><label>Precio</label>
        <input name="precio" type="number" step="0.01" min="0" inputmode="decimal"
               value="${prod.precio ?? ''}" required></div>

      <div class="campo"><label>Tallas</label>
        <input name="tallas" value="${(prod.tallas ?? []).join(' ')}" placeholder="S M L XL XXL">
        <p class="ayuda">Separadas por espacios. Déjalo vacío si no lleva tallas.</p></div>

      <div class="check">
        <input type="checkbox" id="activo" name="activo" ${prod.activo !== false ? crudo('checked') : ''}>
        <label for="activo" style="margin:0;letter-spacing:0;text-transform:none;font-size:1rem;color:var(--text)">
          Se muestra a los jugadores</label>
      </div>

      <button class="btn primario ancho" type="submit" style="margin-top:1rem">Guardar</button>
    </form>`);

  const zona = $('#zona-foto', panel);
  const archivo = $('#archivo', panel);

  zona.addEventListener('click', () => archivo.click());

  archivo.addEventListener('change', async () => {
    const f = archivo.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      avisar('La foto pesa más de 5 MB. Haz una más pequeña.', 'error');
      return;
    }
    zona.innerHTML = '<div class="spinner"></div>';
    try {
      fotoUrl = await db.subirFotoProducto(f);
      zona.innerHTML = '';
      const img = document.createElement('img');
      img.src = fotoUrl;
      zona.appendChild(img);
      avisar('Foto subida');
    } catch (err) {
      zona.innerHTML = '<span class="pista">No se pudo subir. Toca para reintentar.</span>';
      fallo(err);
    }
  });

  $('#producto', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const datos = {
      nombre: f.get('nombre'),
      descripcion: f.get('descripcion') || null,
      precio: Number(f.get('precio')),
      tallas: (f.get('tallas') || '').split(/\s+/).filter(Boolean),
      activo: f.get('activo') === 'on',
      foto_url: fotoUrl
    };
    try {
      if (esNuevo) await db.crearProducto(datos);
      else await db.guardarProducto(prod.id, datos);
      avisar('Guardado');
      panel.cerrar();
      alGuardar();
    } catch (err) { fallo(err); }
  });
}
