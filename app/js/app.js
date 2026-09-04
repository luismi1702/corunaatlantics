// Arranque, sesión y navegación.

import { estaConfigurado } from './config.js';
import { html, crudo, $, avisar, fallo, cargando } from './ui.js';
import * as cerrojo from './cerrojo.js';

// La app tiene dos caras y cada una tiene su propio mapa de pantallas: lo que
// ve el staff no se parece en nada a lo que ve un jugador, y no es cuestión de
// esconder botones sino de que son dos aplicaciones distintas.
//
// `tab: false` deja la vista fuera de la barra inferior. Con seis pestañas los
// objetivos se quedan en 60 px en un móvil estrecho, así que Ajustes vive en el
// engranaje de la cabecera.
const VISTAS_STAFF = {
  '/':              { titulo: 'Atlantics',     cargar: () => import('./vistas/menu.js') },
  '/panel':         { titulo: 'Resumen',       cargar: () => import('./vistas/panel.js'), tab: false },
  '/calendario':    { titulo: 'Calendario',    cargar: () => import('./vistas/calendario.js') },
  '/lista':         { titulo: 'Pasar lista',   cargar: () => import('./vistas/lista.js'), tab: false },
  '/disponibilidad':{ titulo: 'Disponibilidad',cargar: () => import('./vistas/disponibilidad.js'), tab: false },
  '/roster':        { titulo: 'Roster',        cargar: () => import('./vistas/roster.js') },
  '/cuotas':        { titulo: 'Cuotas',        cargar: () => import('./vistas/cuotas.js') },
  '/tesoreria':     { titulo: 'Tesorería',     cargar: () => import('./vistas/tesoreria.js'), tab: false },
  '/documentacion': { titulo: 'Papeles',       cargar: () => import('./vistas/documentacion.js') },
  '/solicitudes':   { titulo: 'Solicitudes',   cargar: () => import('./vistas/solicitudes.js'), tab: false },
  '/ajustes':       { titulo: 'Ajustes',       cargar: () => import('./vistas/ajustes.js'), tab: false }
};

const VISTAS_JUGADOR = {
  '/':        { titulo: 'Hoy',      cargar: () => import('./vistas/jug-hoy.js') },
  '/agenda':  { titulo: 'Agenda',   cargar: () => import('./vistas/jug-agenda.js') },
  '/equipo':  { titulo: 'Equipo',   cargar: () => import('./vistas/jug-equipo.js') },
  '/mificha': { titulo: 'Mi ficha', cargar: () => import('./vistas/jug-ficha.js') }
};

const ICONOS = {
  '/':              '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  '/panel':         '<path d="M3 12l9-8 9 8M5 10v10h14V10" stroke-linecap="round" stroke-linejoin="round"/>',
  '/calendario':    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/>',
  '/lista':         '<path d="M9 6h11M9 12h11M9 18h11" stroke-linecap="round"/><path d="M4 6l1.2 1.2L7.5 4.8M4 12l1.2 1.2L7.5 10.8M4 18l1.2 1.2L7.5 16.8" stroke-linecap="round" stroke-linejoin="round"/>',
  '/disponibilidad':'<path d="M12 3.5l7 3v5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9v-5z" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
  '/roster':        '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke-linecap="round"/><path d="M17 11.5a2.6 2.6 0 100-5.2M17.5 20c0-2.4-1-4-2.5-4.6" stroke-linecap="round"/>',
  '/cuotas':        '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/>',
  '/tesoreria':     '<path d="M4 20V9M9 20V5M14 20v-8M19 20V7" stroke-linecap="round"/>',
  '/documentacion': '<path d="M6 3h8l4 4v14H6z" stroke-linejoin="round"/><path d="M14 3v4h4M9 12h6M9 16h6" stroke-linecap="round"/>',
  '/ajustes':       '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" stroke-linecap="round"/>',
  '/agenda':        '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/>',
  '/equipo':        '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke-linecap="round"/><path d="M17 11.5a2.6 2.6 0 100-5.2M17.5 20c0-2.4-1-4-2.5-4.6" stroke-linecap="round"/>',
  '/mificha':       '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" stroke-linecap="round"/>',
  '/solicitudes':   '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.5 2.9-5.4 6.5-5.4 1.3 0 2.5.25 3.5.7" stroke-linecap="round"/><path d="M15.5 17.5h6M18.5 14.5v6" stroke-linecap="round"/>'
};

function rutaActual(vistas) {
  const bruto = location.hash.replace(/^#/, '') || '/';
  if (vistas[bruto]) return { ruta: bruto, param: null };
  const partes = bruto.split('/').filter(Boolean);
  const base = '/' + (partes[0] ?? '');
  if (vistas[base]) return { ruta: base, param: partes[1] ?? null };
  return { ruta: '/', param: null };
}

// ---------------------------------------------------------------------------

async function iniciar() {
  const app = $('#app');

  if (!estaConfigurado()) return pantallaSinConfigurar(app);

  // Se importa aquí y no arriba para que la pantalla de "sin configurar" pueda
  // salir sin que el cliente de Supabase reviente al construirse.
  const db = await import('./db.js');

  app.innerHTML = cargando();

  const sesion = await db.sesion();
  if (!sesion) return pantallaLogin(app, db);

  let perfil;
  try {
    perfil = await db.miPerfil();
  } catch (e) { return pantallaError(app, e, db); }

  if (!perfil) return pantallaError(app, new Error('Tu cuenta no tiene ficha asociada.'), db);

  const temporada = await db.temporadaActiva();
  if (!temporada) return pantallaSinTemporada(app, db);

  // El cerrojo va después de tener sesión: no sustituye al login, lo tapa.
  if (cerrojo.activo() && !await pantallaCerrojo(app, perfil, db)) return;

  // Registrarse es pedir entrar, no entrar. Hasta que el club aprueba, la app
  // no enseña nada del equipo.
  if (perfil.acceso === 'nuevo') {
    const alta = await import('./vistas/alta.js');
    return alta.render({ perfil, recargar: iniciar }, app);
  }
  if (perfil.acceso === 'pendiente')  return pantallaEspera(app, perfil, db);
  if (perfil.acceso === 'rechazado')  return pantallaRechazo(app, perfil, db);

  const esStaff = perfil.rol === 'admin' || perfil.rol === 'staff';

  // El dorsal viaja al CSS como texto para poder pintarlo de fondo. Sin dorsal
  // asignado no se pinta nada, en vez de un hueco raro.
  document.body.classList.toggle('jugador', !esStaff);
  document.documentElement.style.setProperty('--dorsal',
    !esStaff && perfil.dorsal != null ? JSON.stringify(String(perfil.dorsal)) : '""');
  const ctx = { perfil, temporada, esStaff, recargar: iniciar };
  pantallaApp(app, ctx, esStaff ? VISTAS_STAFF : VISTAS_JUGADOR);
}

// --- Pantallas de estado ---------------------------------------------------

function pantallaSinConfigurar(app) {
  app.innerHTML = html`
    <div class="login">
      <h1>Falta configurar</h1>
      <p>Abre <code>app/js/config.js</code> y pon la URL y la clave anon de tu
         proyecto de Supabase. Están en Project Settings → Data API.</p>
      <p class="ayuda">Antes hay que haber ejecutado los archivos de <code>app/db/</code>
         en el editor SQL de Supabase.</p>
    </div>`;
}

function pantallaLogin(app, db) {
  // Dos caminos desde la misma pantalla: el que ya está en el equipo y el que
  // quiere entrar. Por debajo los dos reciben un enlace por correo; lo que
  // cambia es lo que se encuentran después.
  const portada = () => {
    app.innerHTML = html`
      <div class="login">
        <img class="login-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
        <p>La app del equipo: entrenos, partidos y tu ficha.</p>
        <div style="width:100%;max-width:340px">
          <button class="btn primario ancho" id="ya">Ya estoy en el equipo</button>
          <button class="btn ancho" id="nuevo" style="margin-top:.7rem">Quiero unirme</button>
        </div>
      </div>`;
    $('#ya').addEventListener('click', () => correo(false));
    $('#nuevo').addEventListener('click', () => correo(true));
  };

  const correo = (esNuevo) => {
    app.innerHTML = html`
      <div class="login">
        <img class="login-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
        <h1>${esNuevo ? 'Únete' : 'Entrar'}</h1>
        <p>${esNuevo
          ? 'Escribe tu email y te mandamos un enlace. Después rellenas tu ficha y el club revisa tu solicitud.'
          : 'Escribe tu email y te llega un enlace para entrar. No hay contraseña que recordar.'}</p>
        <form id="entrar">
          <div class="campo">
            <label>Email</label>
            <input type="email" name="email" required autocomplete="email" placeholder="tu@email.com">
          </div>
          <button class="btn primario ancho" type="submit">Enviarme el enlace</button>
          <button class="btn fantasma ancho" type="button" id="atras" style="margin-top:.7rem">Atrás</button>
        </form>
      </div>`;
    $('#atras').addEventListener('click', portada);
    enganchar();
  };

  portada();

  function enganchar() {

  $('#entrar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button');
    const email = new FormData(e.target).get('email');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      await db.entrar(email);
      app.innerHTML = html`
        <div class="login">
          <h1>Mira tu correo</h1>
          <p>Te hemos enviado un enlace a <strong>${email}</strong>.
             Ábrelo en este mismo móvil y entrarás directo.</p>
          <p class="ayuda">Si no llega en un par de minutos, revisa la carpeta de spam.</p>
        </div>`;
    } catch (err) {
      fallo(err);
      boton.disabled = false;
      boton.textContent = 'Enviarme el enlace';
    }
  });
  }
}

function pantallaSinTemporada(app, db) {
  app.innerHTML = html`
    <div class="login">
      <h1>Sin temporada</h1>
      <p>No hay ninguna temporada activa. Créala ejecutando
         <code>app/db/03_arranque.sql</code> en Supabase, o actívala desde ahí.</p>
      <button class="btn fantasma" id="salir">Cerrar sesión</button>
    </div>`;
  $('#salir').addEventListener('click', async () => { await db.salir(); location.reload(); });
}

function pantallaError(app, error, db) {
  console.error(error);
  app.innerHTML = html`
    <div class="login">
      <h1>Algo ha fallado</h1>
      <p>${error.message}</p>
      <button class="btn fantasma" id="salir">Cerrar sesión</button>
    </div>`;
  $('#salir').addEventListener('click', async () => { await db.salir(); location.reload(); });
}

function pantallaEspera(app, perfil, db) {
  app.innerHTML = html`
    <div class="login">
      <img class="login-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
      <h1>Solicitud enviada</h1>
      <p>Ya la tenemos, ${perfil.nombre || 'crack'}. El club la revisa y te avisa
         en cuanto estés dentro. Puedes cerrar la app.</p>
      <p class="ayuda">Si tarda más de la cuenta, habla con alguien del staff.</p>
      <button class="btn fantasma" id="salir" style="margin-top:1rem">Cerrar sesión</button>
    </div>`;
  $('#salir').addEventListener('click', async () => { await db.salir(); location.reload(); });
}

function pantallaRechazo(app, perfil, db) {
  app.innerHTML = html`
    <div class="login">
      <img class="login-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
      <h1>Solicitud no aceptada</h1>
      <p>El club no ha dado curso a tu solicitud${perfil.motivo_rechazo ? ': ' + perfil.motivo_rechazo : '.'}</p>
      <p class="ayuda">Si crees que es un error, habla con alguien del club.</p>
      <button class="btn fantasma" id="salir" style="margin-top:1rem">Cerrar sesión</button>
    </div>`;
  $('#salir').addEventListener('click', async () => { await db.salir(); location.reload(); });
}

// --- Cerrojo ----------------------------------------------------------------

// Devuelve true cuando se ha abierto. Si no, se queda en la pantalla: la única
// salida es entrar por correo, para que nadie acabe encerrado fuera de su
// propia app si cambia de móvil o falla el sensor.
function pantallaCerrojo(app, perfil, db) {
  return new Promise((resolver) => {
    const pintar = (aviso = '') => {
      app.innerHTML = html`
        <div class="login">
          <img class="login-marca" src="./img/logo-principal.webp" alt="Coruña Atlantics">
          <h1>Hola de nuevo</h1>
          <p>Esta app está bloqueada en este dispositivo.</p>
          ${aviso ? crudo(html`<p class="aviso-cerrojo">${aviso}</p>`) : ''}
          <div style="width:100%;max-width:340px">
            <button class="btn primario ancho" id="abrir">Desbloquear</button>
            <button class="btn fantasma ancho" id="correo" style="margin-top:.7rem">
              Entrar con el correo</button>
          </div>
        </div>`;

      $('#abrir').addEventListener('click', async () => {
        try {
          if (await cerrojo.abrir()) { resolver(true); return; }
          pintar('No se ha podido comprobar. Inténtalo otra vez.');
        } catch (e) {
          console.error(e);
          pintar(e?.name === 'NotAllowedError'
            ? 'Se ha cancelado. Vuelve a intentarlo o entra con el correo.'
            : 'Este dispositivo no ha podido abrir el cerrojo. Entra con el correo.');
        }
      });

      $('#correo').addEventListener('click', async () => {
        cerrojo.desactivar();
        await db.salir();
        location.reload();
      });
    };

    pintar();
  });
}

// --- App -------------------------------------------------------------------

function pantallaApp(app, ctx, vistas) {
  app.innerHTML = html`
    <header class="topbar">
      <div id="cabecera"></div>
      <span class="spacer"></span>
      ${vistas['/ajustes'] ? crudo(html`
        <a class="btn-icono" href="#/ajustes" aria-label="Ajustes">
          <svg viewBox="0 0 24 24">${crudo(ICONOS['/ajustes'])}</svg>
        </a>`) : ''}
    </header>
    <nav class="tabbar">
      ${Object.entries(vistas).filter(([, v]) => v.tab !== false).map(([r, v]) => html`
        <a href="#${r}" data-ruta="${r}">
          <svg viewBox="0 0 24 24">${crudo(ICONOS[r])}</svg>
          <span>${v.titulo}</span>
        </a>`)}
    </nav>
    <main class="vista" id="vista"></main>`;

  async function navegar() {
    const { ruta: r, param } = rutaActual(vistas);
    const v = vistas[r];

    // En el menú manda el logotipo; en el resto, el nombre de la pantalla.
    $('#cabecera').innerHTML = ctx.esStaff && r === '/'
      ? html`<div class="sub">Consola de gestión</div>`
      : html`<h1>${v.titulo}</h1><div class="sub">${ctx.temporada.nombre}</div>`;
    document.querySelectorAll('.tabbar a').forEach(a =>
      a.dataset.ruta === r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));

    const cont = $('#vista');
    cont.innerHTML = cargando();
    try {
      const modulo = await v.cargar();
      await modulo.render(ctx, cont, param);
    } catch (e) {
      fallo(e);
      cont.innerHTML = html`<p class="vacio">No se ha podido cargar esta pantalla.<br>${e.message}</p>`;
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', navegar);
  navegar();
}

iniciar().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML =
    '<div class="login"><h1>Algo ha fallado</h1><p>' + e.message + '</p></div>';
});

// En la demo no se registra: cachearía el armazón de la app real y confundiría
// una pantalla con la otra.
if ('serviceWorker' in navigator && !location.pathname.endsWith('demo.html')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
