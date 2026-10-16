// Documento de identidad y foto de carnet: las casillas para subirlos.
//
// Lo usan la ficha del jugador (sube lo suyo) y la consola de documentación
// (ve lo de cualquiera y puede subir lo que le manden por WhatsApp). Quién ve
// qué no lo decide esto, sino las políticas del bucket en 30_identidad.sql.

import * as db from '../db.js';
import { html, crudo, $, $$, avisar, fallo } from '../ui.js';

export const TIPOS_DOCUMENTO = { dni: 'DNI', nie: 'NIE', pasaporte: 'Pasaporte' };

export const ARCHIVOS = [
  { clave: 'documento_cara',  etiqueta: 'Cara',           corto: 'cara' },
  { clave: 'documento_dorso', etiqueta: 'Dorso',          corto: 'dorso' },
  { clave: 'foto',            etiqueta: 'Foto de carnet', corto: 'foto' }
];

// El pasaporte se presenta por la página de la foto: no tiene dorso.
export const llevaDorso = (tipo) => tipo !== 'pasaporte';

export const rutaDe = (jugadorId, clave) => `${jugadorId}/${clave}.jpg`;

// Map jugador_id -> Set de claves subidas ('documento_cara', 'foto', ...)
export async function subidosPorJugador() {
  const filas = await db.archivosIdentidad();
  const m = new Map();
  for (const f of filas) {
    if (!m.has(f.jugador_id)) m.set(f.jugador_id, new Set());
    m.get(f.jugador_id).add(f.archivo.replace(/\.jpg$/, ''));
  }
  return m;
}

export const documentoCompleto = (tipo, subidos) =>
  subidos.has('documento_cara') && (!llevaDorso(tipo) || subidos.has('documento_dorso'));

// Pinta las casillas en `cont`. Devuelve { tipo(t) } para cambiar el tipo de
// documento sin recargar (al elegir pasaporte desaparece el dorso).
export function pintarSubidas(cont, { jugadorId, tipo, alCambiar }) {
  let tipoActual = tipo;
  let subidos = new Set();

  async function cargar() {
    const todos = await subidosPorJugador();
    subidos = todos.get(jugadorId) ?? new Set();
    const urls = await db.verIdentidad([...subidos].map(c => rutaDe(jugadorId, c)));
    pintar(urls);
  }

  function pintar(urls) {
    const visibles = ARCHIVOS.filter(a => a.clave !== 'documento_dorso' || llevaDorso(tipoActual));
    cont.innerHTML = html`
      <div class="identidad-rejilla">
        ${visibles.map(a => {
          const url = urls[rutaDe(jugadorId, a.clave)];
          return html`
            <div class="identidad-casilla">
              <button type="button" class="subir-foto ${a.clave === 'foto' ? 'retrato' : ''}" data-subir="${a.clave}"
                      aria-label="${(url ? 'Cambiar ' : 'Subir ') + a.etiqueta}">
                ${url ? crudo(html`<img src="${url}" alt="">`)
                      : crudo(html`<span class="pista">Subir<br>${a.etiqueta}</span>`)}
              </button>
              <div class="identidad-pie">
                <span>${a.etiqueta}</span>
                ${url ? crudo('<span class="tag ok">Subida</span>') : crudo('<span class="tag bad">Falta</span>')}
              </div>
            </div>`;
        })}
      </div>
      <input type="file" accept="image/*" hidden id="identidad-archivo">`;

    const input = $('#identidad-archivo', cont);
    let cual = null;

    $$('[data-subir]', cont).forEach(b => b.addEventListener('click', () => {
      cual = b.dataset.subir;
      input.value = '';
      input.click();
    }));

    input.addEventListener('change', async () => {
      const archivo = input.files[0];
      if (!archivo || !cual) return;
      const boton = $(`[data-subir="${cual}"]`, cont);
      boton.innerHTML = '<div class="spinner"></div>';
      try {
        await db.subirIdentidad(jugadorId, archivo, cual);
        avisar('Subida');
        await cargar();
        alCambiar?.();
      } catch (err) {
        fallo(err);
        await cargar();
      }
    });
  }

  cargar().catch(fallo);

  return {
    tipo(t) {
      tipoActual = t;
      cargar().catch(fallo);
    }
  };
}
