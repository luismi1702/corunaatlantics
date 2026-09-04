# App del equipo — puesta en marcha

Consola de gestión del Coruña Atlantics (fase 1A). PWA estática + Supabase.
Coste: 0 €. Plan del proyecto completo en `docs/app-plan.md`.

## Verla antes de montar nada

```
python -m http.server 8765
```

y abrir <http://127.0.0.1:8765/app/demo.html>.

Es la app entera con una plantilla inventada de 18 jugadores: sirve para juzgar
la interfaz sin crear cuenta en ningún sitio. No guarda nada; cualquier botón de
guardar avisa de que está en modo demo.

## Montarla de verdad

### 1. Crear el proyecto en Supabase

En <https://supabase.com>, plan Free. **Elegir la región de Fráncfort**: los
datos son personales y deben quedarse en la UE.

### 2. Crear las tablas

SQL Editor → New query → pegar `app/db/00_instalar.sql` entero → Run.

Ese archivo es la unión de los numerados en el orden correcto, así que basta
una pegada. Los sueltos siguen ahí para leerlos por partes:

| Archivo | Qué monta |
|---|---|
| `01_schema.sql` | Tablas, vistas y automatismos |
| `02_rls.sql` | Permisos. Sin esto los datos quedan al descubierto |
| `04_tesoreria.sql` | Ingresos, gastos y resumen de caja |
| `05_calendario.sql` | Entrenos, partidos, asistencia y disponibilidad |
| `06_jugador.sql` | Confirmaciones y vista de compañeros |
| `07_registro.sql` | Registro de jugadores con aprobación |
| `08_dorsales.sql` | El jugador elige su dorsal |

`00_instalar.sql` está **generado**: si tocas un archivo suelto, vuelve a
generarlo con `python generar_instalador.py` desde `app/db`.

Después, `03_arranque.sql` con tu email (apartado 4).

### 3. Conectar la app

Project Settings → Data API. Copiar la URL y la clave `anon` a `app/js/config.js`.

La clave `anon` es pública por diseño y puede subirse al repositorio: lo que
protege los datos son las políticas RLS, no esconderla. La que **nunca** debe
salir de Supabase es la `service_role`.

### 4. Nombrarte administrador

1. Abrir la app y entrar con tu email (llega un enlace al correo).
2. Eso te crea la cuenta y la ficha, con rol `jugador`.
3. En el SQL Editor, ejecutar `03_arranque.sql` con **tu email** en el `update`.
4. Recargar: ya ves la consola.

El primer admin se nombra desde SQL a propósito. Si la app pudiera crear
administradores, cualquiera que se registrase podría hacerse uno.

### 5. Publicar

Todo es estático: entra en GitHub Pages con el resto del repo, en
`corunaatlantics.com/app/`. No hay nada que compilar.

## Cómo entra la gente

Repartes el enlace de la app (hay un botón para compartirlo en Solicitudes).
Al abrirla, dos caminos: **ya estoy en el equipo** o **quiero unirme**. Los dos
reciben un enlace por correo; lo que cambia es lo que se encuentran después.

Quien es nuevo rellena su ficha completa y queda **pendiente**: no ve calendario,
ni plantilla, ni compañeros. Tú lo ves en Solicitudes y apruebas o rechazas. Al
aprobar entra en el roster y se le abre la cuota de la temporada.

Registrarse es pedir entrar, no entrar, y eso lo impone la base de datos: sin
`acceso = 'aprobado'` las políticas no devuelven nada del club. Un disparador
permite al jugador un único movimiento, pasar de `nuevo` a `pendiente`; el resto
de estados solo los cambia un administrador.

Aprobar y rechazar es **solo del rol admin**, no del staff.

## Cargar la plantilla

Hay dos vías y se pueden mezclar: que se registren ellos (recomendado, porque
rellenan sus propios datos) o darles de alta tú desde Roster.

Un jugador **no necesita cuenta** para tener ficha. Si le das de alta con su
email, el día que entre en la app su cuenta se enlaza sola con esa ficha y entra
ya aprobado, sin pasar por solicitud. Da igual el orden.

Al dar de alta a alguien se le crea automáticamente la cuota de la temporada
activa y su ficha de documentación.

## Estructura

```
app/
  index.html              la app
  demo.html               la app con datos inventados
  manifest.webmanifest    para instalarla en el móvil
  sw.js                   caché del armazón (nunca de los datos)
  css/app.css
  js/
    config.js             URL y clave de Supabase
    db.js                 todo el acceso a datos
    ui.js                 plantillas, formato, hoja modal, avisos
    app.js                sesión, rutas, pantallas de estado
    vistas/               staff: menú · resumen · calendario · lista · roster
                          cuotas · tesorería · papeles · disponibilidad · ajustes
                          jugador: jug-hoy · jug-agenda · jug-equipo · jug-ficha
    db-demo.js            datos falsos para demo.html
    config-demo.js
  db/                     SQL, en orden de ejecución
  img/                    logo principal (menú y login) y tridente (filigrana)
  icons/                  iconos de la PWA
```

## Qué hace y qué no

La primera pantalla es un **menú** presidido por el logotipo principal del club,
no un panel de cifras: el saldo y las deudas están a un toque, pero no a la vista
de quien tengas al lado en el campo.

Las imágenes de `app/img/` se generan desde los PNG **sin fondo** de la raíz del
repo. Si hace falta rehacerlas o añadir otra, es recortar el margen transparente
y guardar en WebP.

**Hace:** roster con altas y bajas, control de dorsales, cuotas con pagos
fraccionados y exentos, lista de morosos lista para pegar en WhatsApp,
documentación con fechas de caducidad y aviso a 30 días, tesorería con ingresos,
gastos por categoría y saldo, calendario de entrenos y partidos, pasar lista en
el campo con un toque por jugador, disponibilidad para jugar cruzando lesiones y
papeles, contacto por teléfono y WhatsApp desde la ficha, y exportación a CSV.

**No hace:** cobrar. La gente paga por Bizum o transferencia como siempre y
aquí se apunta el pago. El motivo está en `docs/app-plan.md` §7.

**Ojo con la tesorería:** las cuotas cobradas entran solas desde la pantalla de
Cuotas. No se apuntan como ingreso a mano — la base de datos lo impide — porque
si no, el mismo dinero se contaría dos veces. Los justificantes se guardan como
enlace (a Drive, por ejemplo); subir el archivo a la propia app queda pendiente.

## Las dos caras de la app

El rol del perfil decide qué aplicación se monta al entrar. No son las mismas
pantallas con botones escondidos: son dos mapas de pantallas distintos.

- **staff / admin** → la consola de gestión.
- **jugador** → Hoy, Agenda, Equipo y Mi ficha.

Un jugador ve su ficha, su papeleo, su cuota y su asistencia; de sus compañeros
solo lo que se ve en una camiseta (nombre, dorsal, posición), a través de la
vista `companeros`. No puede ver teléfonos ajenos, documentación ajena, cuotas
ajenas ni nada de tesorería, y eso lo impone Postgres, no la interfaz.

**El dorsal lo elige él**, desde Mi ficha y solo una vez aprobado: si se pudiera
al registrarse, cualquiera con el enlace se reservaría un número sin ser del
equipo. Quien lo coge primero se lo queda, y el bloqueo real lo hace el índice
único `perfiles_dorsal_activo`, no la interfaz — eso resuelve también el caso de
dos jugadores tocando el mismo número a la vez. El club puede cambiarlo siempre.

Sus pantallas llevan su dorsal en hueco de fondo, y la app le avisa cuando la
sesión es de otra unidad (un receptor no tiene que ir a un entreno de defensa).
La unidad se deduce de sus posiciones con `unidadDe()` de `ui.js`.

Confirmar si va (`confirmacion`) y la lista que pasa el staff (`estado`) son dos
columnas distintas a propósito: si fueran la misma, no se podría saber quién
dijo que iba y luego no apareció. Un disparador impide que un jugador escriba la
segunda.

**Sobre los mensajes:** la app abre WhatsApp con el texto ya escrito, pero el
envío lo haces tú. No manda nada por su cuenta.

**Todavía no:** avisos y playbook. Son las fases siguientes.

## Sacar a alguien del equipo

Tres cosas distintas, de menos a más definitiva:

**Baja** (Roster → ficha → Estado: Baja). Lo normal. Sale del roster, libera su
dorsal y conserva todo su histórico: pagos, asistencia y documentación.
Reversible.

**Quitar el acceso** (Roster → ficha → Acceso a la app). Deja de poder entrar en
la app, pero su ficha y su histórico siguen intactos. Es lo que se quiere casi
siempre al pensar "quiero eliminar a este". Reversible con un toque.

**Borrar la ficha.** Se lleva en cascada sus cuotas, sus pagos, su asistencia y
su documentación. Sin vuelta atrás, y descuadra la tesorería de la temporada
porque desaparecen ingresos ya registrados. Rara vez es lo que hace falta.

### Borrar la cuenta de verdad (RGPD)

La ficha y la cuenta de acceso son cosas separadas: la ficha vive en la tabla
`perfiles`, la cuenta en el sistema de autenticación de Supabase. Borrar la
ficha **no** borra la cuenta.

Si alguien ejerce su derecho de supresión, hay que hacer las dos:

1. Roster → su ficha → *Borrar la ficha entera*.
2. Panel de Supabase → Authentication → Users → buscar su email → Delete user.

El segundo paso no se puede hacer desde la app: exige la clave `service_role`,
que nunca debe estar en un navegador.

Si solo se borra la ficha, esa persona puede seguir entrando y se encontrará una
pantalla explicándole que el club no tiene nada suyo. No ve datos de nadie.

## Bloqueo con Face ID

Opcional y por dispositivo. Se activa en Ajustes (staff) o en Mi ficha (jugador),
y usa WebAuthn contra el sensor del propio aparato.

La cara o la huella **nunca salen del teléfono**: el navegador le pregunta al
sistema y la app solo recibe un sí o un no. No se guarda ningún dato biométrico
ni aquí ni en Supabase.

Es un **cerrojo local, no un segundo factor**: no hay servidor verificando la
firma, así que protege de que alguien coja el móvil desbloqueado, no de un
ataque contra la cuenta. La salida de emergencia es "Entrar con el correo", que
borra el cerrojo y vuelve al login por magic link — así nadie se queda fuera de
su propia app por cambiar de móvil o por un sensor que falla.

Necesita HTTPS. En `corunaatlantics.com` lo hay; en la vista previa incrustada
puede que el navegador no lo permita.

## Seguridad

Los datos económicos de la plantilla los ve solo el rol `admin`, y eso lo
impone Postgres con Row Level Security, no la interfaz: trastear con el
navegador no lo salta. Cada jugador puede leer su propia ficha y su propia
cuota, nunca las de otro.
