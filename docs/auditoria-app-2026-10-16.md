# Auditoría de la app — 16 de octubre de 2026

**Estado:** los puntos 1, 2 (la parte del código), 4, 5, 6, 7, 8 y 9 se arreglaron el mismo día
(`32_privacidad.sql`, ver CHANGELOG). Quedan en manos del club fijar la cuota (2) y comprobar
el SMTP (3).

Hecha con la app ya repartida al equipo. Qué se miró y cómo:

- **Desde fuera, contra el Supabase real**, con la clave pública y sin sesión: las 24 tablas,
  las 13 vistas, el almacén de documentos y la configuración de acceso.
- **Las políticas de seguridad (RLS)** en su estado final, después de los 31 SQL.
- **Las 31 funciones que se saltan las políticas** (`security definer`), una por una.
- **El JavaScript**: inyección de código, el service worker, la CSP y que la demo y la real
  tengan las mismas funciones.
- **Todas las pantallas** (11 de staff y 8 de jugador) abiertas en la demo a 390 px.

No se pudo mirar: lo que ve un jugador con sesión contra la base real (haría falta una
cuenta de prueba) ni la configuración del correo de Supabase (solo se ve desde el panel).

## Lo que está bien

- **Desde fuera no se lee nada.** Todas las tablas y vistas devuelven cero filas sin sesión,
  menos `plantilla_publica`, que es a propósito: la web enseña nombre de camiseta, dorsal,
  posición y capitán de los 10 aprobados. El almacén de documentos no lista nada.
- **Las escrituras van cada una con su llave** (`puede('tesoreria')`, `puede('documentos')`…).
- **Las 31 funciones especiales comprueban quién llama**, o son internas y tienen quitado el
  permiso de ejecutarlas.
- **Lo que escriben los usuarios se escapa** al pintarlo. No hay hueco de inyección.
- **Service worker**: primero red, caché solo sin conexión. No falta ningún archivo en su lista.
- **CSP** correcta: deja cargar las imágenes y subidas de Supabase y nada más.
- **19 pantallas sin un error** y ninguna se sale de ancho en el móvil.

## Problemas, de más a menos grave

### 1. Quien lleva cualquier sección lee la ficha completa de todos — ALTA
Ya estaba apuntado el 17 de septiembre. Con el documento de identidad es más grave.
`perfiles_leer` deja leer todas las fichas a `es_staff()`, y eso incluye a cualquier jugador
con una llave (material, tienda, calendario…). Se lleva teléfono, correo, fecha de
nacimiento, **número de DNI/NIE/pasaporte** y notas del staff de toda la plantilla. No se ve
en ninguna pantalla, pero sí desde la API con su sesión.
**Arreglo:** que la ficha entera la lean solo admin, roster y documentos. Los demás
delegados trabajarían con una vista que lleve solo lo que necesitan sus pantallas (nombre,
dorsal, teléfono para llamar).

### 2. Sin importe de cuota, a todos les sale "Al día" — ALTA
Mi ficha pinta "Al día" cuando no queda nada pendiente, y una cuota a 0 € no tiene nada
pendiente. Mientras no se fije el importe en Ajustes y se pulse *Aplicar el importe a la
plantilla*, toda la plantilla ve "Al día" y el botón *Ya he pagado* no sale.
**Arreglo:** él, fijar 170 € y aplicar. En el código, decir "Cuota por fijar" en vez de
"Al día" cuando el importe es 0.

### 3. ¿Llegan los códigos de acceso? — POR COMPROBAR
Sin un SMTP propio, Supabase manda muy pocos correos por hora. Con todo el equipo
entrando el mismo día, el primero que pide código lo recibe y los siguientes no. Mirar en
Supabase → Authentication → Emails → SMTP Settings si está puesto (Brevo es gratis).

### 4. El jugador puede leer las notas que el staff escribe sobre él — MEDIA
`perfiles.notas_staff` y `documentacion.notas_staff` van en filas que el propio jugador lee.
No salen en sus pantallas, pero sí en la API.
**Arreglo:** pasar las notas a una tabla aparte que solo lean roster y documentos.

### 5. RGPD al pedir documentos de identidad — MEDIA
El consentimiento del alta es una frase. Para guardar copias de documentos hay que decir
quién los trata, para qué (licencia federativa), cuánto tiempo (hasta mandarlos) y cómo
pedir que se borren. Si entra algún menor de 14 años, el consentimiento lo da su tutor.
**Arreglo:** un texto corto en la sección de subida y en el alta. Ya existe la tabla `tutores`.

### 6. Quien lleva la tesorería sin ser admin no ve los pagos por validar en Hoy — MEDIA
El aviso "N pagos por validar" sale en el menú del admin. Un tesorero que no es admin solo
los ve si entra en Tesorería.
**Arreglo:** contarlos en su bloque "Del club" de Hoy.

### 7. Las fuentes vienen de Google — BAJA (ya apuntado)
Cada apertura de la app le pasa a Google la IP del jugador. Se arregla sirviéndolas desde el
repositorio.

### 8. Las fotos de la tienda las puede cambiar cualquier delegado — BAJA
Las políticas del almacén `productos` piden `es_staff()` en vez de `puede('tienda')`.

### 9. La pantalla de error pinta el mensaje sin escapar — BAJA
`app.js`, en el `catch` de `iniciar()`. El mensaje sale de la propia app, así que no es
explotable, pero es el único sitio que no usa `html```.
