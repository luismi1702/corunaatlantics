# Pendiente — lo que tienes que hacer tú

Lo que no se puede hacer desde el código: pasos en el panel de Supabase, pruebas
con el móvil en la mano y decisiones del club. Al hacer algo, se tacha y se
borra de aquí.

Última revisión: 18 de septiembre de 2026.

## Ahora mismo: poner en marcha lo de esta sesión

Hay que hacerlo **en este orden**. El paso 1 y el 2 juntos, en la misma tarde:
con el SQL puesto y la función vieja todo sigue como antes, pero al revés no
suena ninguna notificación.

1. **SQL Editor de Supabase → `app/db/28_push_dirigido.sql`.**
   Avisos al móvil dirigidos a una lista de personas.
2. **SQL Editor → `app/db/29_acceso_manda.sql`.**
   Sin acceso aprobado no hay nada, tampoco para el staff. Empieza reparando a
   los admin que tuvieran el acceso en `nuevo`.
   **Comprueba el `select` del final: tiene que salir tu fila.** Si no sales
   ahí, no sigas y dilo.
3. **Volver a desplegar la función `enviar-push`** con el `index.ts` nuevo.
   Para comprobarlo, abre la URL de la función en el navegador: `version: 4`.
4. **Publicar la web** (es GitHub Pages, con subir el repo vale) y **entrar en
   la app con tu correo**. Es lo primero que hay que mirar: la librería de
   Supabase ya no viene del CDN, viene de `app/js/vendor/`.
5. **Probarlo con la app instalada en el móvil**, no en Safari:
   - cancela un entreno de prueba y mira que llega la notificación;
   - en un entreno próximo, el botón de avisar a quien no ha respondido;
   - en Cuotas, el de avisar a quien debe.

## Seguridad: lo que quedó del análisis del 17 de septiembre

- **Los delegados leen el DNI y las notas del staff de todos.** Quien lleva el
  material no necesita eso. Se arregla dejando esos dos campos solo para quien
  lleva roster o documentos. Decidir si se hace.
- **Las fuentes vienen de Google.** Cada jugador que abre la app le manda su IP
  a Google. Es asunto de RGPD, no de seguridad: se quita sirviéndolas desde el
  repositorio.
- **Verificación en dos pasos en el correo del administrador.** La cuenta se
  abre con un enlace o un código al correo, así que ese correo es la llave del
  club. Esto no es del código: es de tu cuenta de Gmail.

## Del club, no del código

- **Guardar `vapid.txt` fuera del ordenador.** Está en `.gitignore` y no se ha
  subido nunca (comprobado en todo el historial), pero si se pierde ese fichero
  hay que rehacer las notificaciones y todos los móviles tienen que volver a
  activarlas.
- **Fijar el importe de la cuota y el horario de entrenos** en Ajustes, y darle
  a *Aplicar el importe a la plantilla*.
- **Probar con un correo ajeno** que alguien registrado y sin aprobar no ve
  nada del club.
- **Alta en grupo en un entreno**, con el QR de Solicitudes: en iPhone las
  notificaciones solo llegan si la app está instalada en la pantalla de inicio.

## Cosas del código que quedaron a medias

- **`app/js/instalar.js`** está escrito y sin enganchar a ninguna pantalla.
  Ofrecería un botón "Instalar en este móvil" en Android y las instrucciones en
  iPhone. Hoy la app no dice en ningún sitio cómo instalarse.
- **Impedir borrar un producto de la tienda** que ya tenga pedidos cobrados.
- **Subir los justificantes a Supabase Storage**: hoy se guarda un enlace.
