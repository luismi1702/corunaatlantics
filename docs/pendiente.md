# Pendiente — lo que tienes que hacer tú

Lo que no se puede hacer desde el código: pasos en el panel de Supabase, pruebas
con el móvil en la mano y decisiones del club. Al hacer algo, se tacha y se
borra de aquí.

Última revisión: 19 de septiembre de 2026.

## Ahora mismo: probarlo con el equipo dentro

Hecho el 19 de septiembre: los dos SQL ejecutados —el `select` de control
devolvió `Luis Miguel · admin · aprobado`—, la función `enviar-push`
desplegada y respondiendo `version: 4` con sus secretos en orden, el código
publicado en GitHub Pages y **la app comprobada**: se entra con normalidad, o
sea que la librería de Supabase bajada a `app/js/vendor/` y la CSP están bien.

Queda comprobarlo con gente y con datos de verdad, **desde el móvil con la app
instalada** en la pantalla de inicio: en iPhone, sin instalar no llegan las
notificaciones.

1. **Cancelar un entreno de prueba** y ver que suena «Cancelado · Entreno».
   Desmarcar *Cancelado* y guardar otra vez lo deja como estaba y manda
   «Vuelve · Entreno».
2. **Avisar a quien no ha respondido**, desde la pantalla de un entreno
   próximo. Necesita gente que haya entrado y no haya confirmado.
3. **Avisar a quien debe la cuota**, en Cuotas. Necesita que haya cuotas
   abiertas, o sea el importe de la temporada puesto en Ajustes.

Los tres avisos dicen a cuántos de la lista ha llegado. Que el número sea bajo
al principio es normal: solo cuenta a quien tenga las notificaciones activadas.

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
