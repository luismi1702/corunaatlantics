// Instalar la app en la pantalla de inicio.
//
// Hasta ahora la app no le decía a nadie cómo instalarse, y eso se traducía en
// "por internet no se puede bajar": la gente busca una tienda de aplicaciones,
// no encuentra nada, y se queda usándola en una pestaña del navegador. Que se
// quede en el navegador no es un detalle estético:
//
//   - En iPhone los avisos push SOLO llegan con la app instalada. Desde Safari
//     la API ni existe.
//   - Una pestaña se cierra sin querer y no vuelve; un icono en la pantalla de
//     inicio se abre igual que el WhatsApp.
//
// Android y iPhone se resuelven de forma distinta y no hay más remedio:
//
//   - En Android, Chrome avisa con `beforeinstallprompt` cuando la app cumple
//     los requisitos, y deja abrir el diálogo del sistema cuando queramos. Ahí
//     no hay que explicar nada: hay un botón y se instala.
//   - En iPhone no existe esa API y Apple no piensa añadirla, así que lo único
//     posible son las instrucciones exactas: Compartir → Añadir a pantalla de
//     inicio.

import { html, crudo, $, avisar } from './ui.js';

// El evento llega una sola vez y muy pronto, antes de que ninguna pantalla haya
// tenido tiempo de pedirlo. Por eso se escucha aquí arriba, al cargar el
// módulo, y se guarda: si se espera a pintar el botón, ya ha pasado.
let peticion = null;
const suscritos = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  // Sin esto Chrome enseña su propia barra, que compite con la nuestra y que
  // además no se puede volver a sacar si el usuario la descarta.
  e.preventDefault();
  peticion = e;
  suscritos.forEach(f => f());
});

window.addEventListener('appinstalled', () => {
  peticion = null;
  suscritos.forEach(f => f());
});

export const instalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const iOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ¿Hay un botón que instale de verdad, o solo se pueden dar instrucciones?
export const sePuedeInstalarSolo = () => peticion !== null;

export async function instalar() {
  if (!peticion) return false;
  peticion.prompt();
  const { outcome } = await peticion.userChoice;
  // Un prompt gastado no se puede reutilizar: Chrome manda otro evento si el
  // usuario dice que no y luego cumple las condiciones otra vez.
  peticion = null;
  suscritos.forEach(f => f());
  return outcome === 'accepted';
}

// Pinta el bloque, o nada si la app ya está instalada. Se vuelve a pintar solo
// cuando Chrome dice que ya se puede instalar, porque ese aviso suele llegar
// unos segundos después de abrir la pantalla.
export function pintarInstalar(cont) {
  if (!cont) return;

  const pintar = () => {
    // Al cambiar de pantalla el bloque viejo queda suelto: se da de baja.
    if (!cont.isConnected) { suscritos.delete(pintar); return; }
    if (instalada()) { cont.innerHTML = ''; return; }

    const conBoton = sePuedeInstalarSolo();

    cont.innerHTML = html`
      <p class="eyebrow">Instalar la app</p>
      <div class="card">
        <p style="margin:0 0 .9rem;line-height:1.6" class="muted">
          No está en ninguna tienda de aplicaciones: se instala desde aquí, y
          ocupa lo que una foto. Con el icono en la pantalla de inicio se abre
          como cualquier otra app${iOS() ? ' y es la única forma de que te lleguen los avisos' : ''}.
        </p>

        ${crudo(conBoton ? boton() : instrucciones())}
      </div>`;

    $('#instalar-ya', cont)?.addEventListener('click', async () => {
      const puesta = await instalar();
      if (puesta) avisar('Instalada. Ábrela desde el icono.');
      pintar();
    });
  };

  suscritos.add(pintar);
  pintar();
}

const boton = () => html`
  <button class="btn primario ancho" id="instalar-ya">Instalar en este móvil</button>`;

// En iPhone no hay boton posible: solo el camino, con los nombres exactos de
// los menus para que no haya que adivinar cual es.
const instrucciones = () => iOS() ? html`
  <ol class="pasos-instalar">
    <li>Dale al botón <strong>Compartir</strong>, el cuadrado con la flecha hacia arriba.</li>
    <li>Baja y elige <strong>Añadir a pantalla de inicio</strong>.</li>
    <li>Ábrela desde el icono nuevo, no desde Safari.</li>
  </ol>` : html`
  <ol class="pasos-instalar">
    <li>Abre el menú del navegador, los <strong>tres puntos</strong> de arriba.</li>
    <li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>
    <li>Ábrela desde el icono nuevo.</li>
  </ol>`;
