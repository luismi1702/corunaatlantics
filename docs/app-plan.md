# App del equipo — Plan de proyecto

App interna para la plantilla y el staff del Coruña Atlantics. No es un escaparate:
la web pública (corunaatlantics.com) sigue cumpliendo esa función. Esto es la
herramienta de trabajo diario del equipo, y **la consola de gestión del club**.

## 1. Objetivo

La app tiene dos caras que resuelven problemas distintos:

**Cara jugador** — que el equipo funcione sin caos:

1. **Saber quién viene a entrenar** antes de llegar al campo.
2. **Que todo el mundo se entere** de cambios de hora, campo y convocatorias.
3. **Que los jugadores aprendan las jugadas** sin depender de un PDF que nadie abre.

**Cara gestión** — que el club se administre desde el móvil:

4. **Saber quién ha pagado la cuota** y quién no, sin revisar el banco a mano.
5. **Tener el roster completo** con licencias, seguros y documentación al día.
6. **Controlar el material** del club: quién tiene qué casco, qué hombreras, qué jersey.

Esta separación importa porque **la cara de gestión aporta valor aunque ningún jugador
llegue a instalar la app.** Es la parte que no depende de la adopción de nadie.

Criterio de éxito de la fase 1: que dejes de mantener el Excel y el cuaderno, y que el
70 % de la plantilla marque su asistencia sin recordatorio por WhatsApp.

## 2. Decisiones de arquitectura

| Decisión | Elección | Motivo |
|---|---|---|
| Formato | PWA instalable | 0 € y sin tiendas de apps. Icono en pantalla de inicio, pantalla completa, offline. |
| Front | HTML + CSS + JS vanilla | Mismo stack que la web. Sin build, sin dependencias que caduquen. |
| Backend | Supabase (plan free) | Postgres + auth + storage + push, todo gratis y de sobra para 60 personas. |
| Login | Magic link por email | Nadie recuerda una contraseña de una app que abre dos veces por semana. Cero soporte técnico. |
| Alojamiento | `corunaatlantics.com/app/` | Mismo repo, mismo deploy, mismo dominio. Sin infraestructura nueva. |
| Cobros | **Fuera de la app** | Ver §7. Se registra el pago, no se procesa. |
| Identidad | Teal #4ECDC4 · Gold #D4A843 · Ink #040d12 | Anton + Barlow Condensed + Barlow. Poseidón como icono de la app. |

### Límites del plan gratuito de Supabase

500 MB de base de datos, 1 GB de archivos, 50.000 usuarios activos al mes. Para una
plantilla de 60 personas sobra con enorme margen. **La única restricción que importa:
los proyectos free se pausan tras 7 días sin actividad.** Con uso semanal real no
ocurre nunca, pero conviene saberlo si el equipo para en verano.

## 3. Roles

- **jugador** — ve su ficha, marca asistencia, lee avisos, estudia su playbook, consulta
  su propio estado de cuota y material.
- **staff** — todo lo anterior, más crear eventos y avisos, y ver el estado de la plantilla.
- **admin** — la consola de gestión completa: cuotas, documentación, material, altas y bajas.

Los permisos se aplican en la base de datos con Row Level Security de Postgres, no solo
en la interfaz. Un jugador no puede leer los datos de otro aunque manipule la app desde
el navegador. **Los datos económicos de la plantilla solo los ve el rol admin** — quién
debe dinero es la información más sensible del club.

## 4. Modelo de datos

```
temporadas
  id · nombre ("2026-27") · fecha_inicio · fecha_fin · activa
  importe_cuota · plazos_permitidos

perfiles
  id · nombre · apellidos · apodo · dorsal · posiciones[] · rol
  telefono · email · fecha_nacimiento · dni · talla_equipacion
  contacto_emergencia_nombre · contacto_emergencia_telefono
  foto_url · estado (activo | lesionado | baja_temporal | baja) · alta_en · baja_en

eventos
  id · tipo (entreno | partido | evento) · fecha_hora · lugar
  unidad (ataque | defensa | especiales | todos) · rival · notas
  convocatoria_publicada · creado_por

asistencias
  id · evento_id · jugador_id · estado (voy | no_voy | duda)
  motivo · actualizado_en
  -> único por (evento_id, jugador_id)

avisos
  id · autor_id · titulo · cuerpo · prioridad (normal | urgente)
  destinatarios (todos | unidad | lista) · fijado · creado_en

lecturas_aviso
  aviso_id · jugador_id · leido_en
```

### Gestión económica

```
cuotas
  id · jugador_id · temporada_id · importe_total · importe_pagado
  estado (al_dia | parcial | pendiente | exento) · exento_motivo
  -> importe_pagado y estado se calculan desde los pagos, no se escriben a mano

pagos
  id · cuota_id · importe · fecha · metodo (bizum | transferencia | efectivo)
  referencia · registrado_por · nota

movimientos          (ver §7)
  id · temporada_id · tipo (ingreso | gasto) · concepto · categoria
  importe · fecha · metodo · justificante_url · nota · registrado_por
  -> NO guarda las cuotas: esas salen de `pagos`, o se contarian dos veces
```

### Documentación y licencias

```
documentacion
  jugador_id · temporada_id
  licencia_estado · licencia_caduca_en
  seguro_estado · seguro_caduca_en
  reconocimiento_medico_estado · reconocimiento_caduca_en
  dni_entregado · foto_entregada
  consentimiento_rgpd_en · notas_staff
```

Los campos `_caduca_en` son lo que permite que la app te avise **antes** de que algo
venza, en vez de descubrirlo el día del partido.

### Material del club

```
material
  id · tipo (casco | hombreras | jersey | pantalon | otro)
  identificador · talla · estado (nuevo | bueno | usado | retirado)
  fecha_compra · coste · notas

prestamos_material
  id · material_id · jugador_id · entregado_en · devuelto_en
  estado_entrega · estado_devolucion · fianza · notas
```

En fútbol americano el material es el activo caro del club y el que más se pierde.
Saber que el casco 14 lo tiene un jugador que se dio de baja en marzo vale dinero real.

### Playbook

```
jugadas
  id · nombre · unidad · formacion · imagen_url · notas · tags[]

asignaciones_jugada
  jugada_id · posicion · descripcion

progreso_playbook
  jugador_id · jugada_id · aciertos · fallos · ultima_revision
```

### Preparado para menores

```
tutores
  id · nombre · telefono · email · relacion

tutorias
  tutor_id · jugador_id · consentimiento_en · consentimiento_imagen
```

## 5. Pantallas del jugador

**Hoy** (inicio) — el próximo entreno o partido con el botón de asistencia bien grande,
el recuento de confirmados, y los avisos sin leer. Todo lo demás es secundario: si el
jugador solo abre esta pantalla, la app ya ha cumplido.

**Calendario** — entrenos y partidos, con su asistencia y su convocatoria.

**Avisos** — tablón cronológico, los urgentes fijados arriba.

**Mi ficha** — datos personales editables por él, y en solo lectura el semáforo de su
papeleo, su cuota y el material que tiene en préstamo. Que cada uno vea su propio estado
elimina la mitad de las preguntas que te llegan por privado.

**Playbook** — jugadas filtradas por su unidad y su posición, con modo flashcards.

## 6. Consola de gestión (tu parte)

Esta es la mitad de la app que usas tú, y está pensada para el móvil, no para el
escritorio: la mayoría de estas consultas las vas a hacer de pie en el campo.

**Panel** — la pantalla que abres cada día. Solo lo que requiere acción:
- cuántos han confirmado el próximo entreno, y quién falta por responder;
- cuánto dinero hay pendiente de cobro y de cuántos jugadores;
- licencias, seguros o reconocimientos médicos que caducan en menos de 30 días;
- jugadores dados de alta que aún no han completado su ficha;
- material sin devolver de jugadores que ya no están.

**Roster** — la plantilla completa en una lista filtrable por posición, unidad, estado
y dorsal. Cada jugador abre su ficha con todo: datos, asistencia histórica, cuota,
documentación y material. Control de dorsales duplicados al asignarlos. Altas y bajas
con fecha, para que el histórico de temporadas anteriores no se pierda.

**Cuotas** — la lista de la temporada con tres números arriba: cobrado, pendiente y
número de morosos. Registras un pago en dos toques (jugador, importe, método). Admite
pagos a plazos y jugadores exentos con motivo. Genera la lista de a quién reclamar y
un mensaje listo para enviar. Histórico por temporada.

**Documentación** — el semáforo de toda la plantilla en una cuadrícula: quién tiene la
licencia, el seguro, el reconocimiento médico y el DNI. Filtro por "lo que falta", que
es como se usa de verdad. Exportación a CSV para la federación.

**Material** — inventario del club y quién tiene cada cosa. Entrega y devolución con
un toque, con estado del material en ambos momentos.

**Tesorería** — saldo de la temporada, de dónde viene el dinero (cuotas frente a
patrocinios, subvenciones o merchandising) y un desglose de gastos por categoría ordenado
de mayor a menor, que es la lectura que contesta "¿en qué se nos va el dinero?".
Exportable a CSV para la junta.

**Asistencia** — el histórico por jugador en porcentaje, ordenable. Es el dato con el
que se justifican las convocatorias sin discusión: quien viene al 30 % de los entrenos
no juega, y ahora está por escrito.

**Comunicación** — desde cualquier lista filtrada (los que deben la cuota, los que no
han confirmado, los que no han entregado el DNI) sale un aviso dirigido solo a ellos.
Esta es la función que más tiempo te va a ahorrar: hoy eso son veinte mensajes privados.

## 7. Cobros: qué hace y qué no hace la app

**La app registra pagos, no los procesa.** Los jugadores siguen pagando por Bizum o
transferencia como hasta ahora, y tú apuntas el pago. Esta decisión es deliberada:

- Cobrar dentro de la app exige una pasarela (Stripe cobra ~1,5 % + 0,25 € por
  operación), y ahí se acabó el coste cero.
- Implica manejar dinero de terceros, con las obligaciones fiscales y legales que eso
  arrastra para el club.
- No resuelve tu problema real. Tu problema no es *cobrar*, es **saber quién ha pagado**,
  y eso se arregla con un registro decente y una lista de morosos.

Si algún día el volumen lo justifica, se añade la pasarela sin rehacer nada: el modelo
de datos ya separa la cuota (lo que se debe) del pago (lo que ha entrado).

**Tesorería general** (la tabla `movimientos`): registrar también los gastos del club
—arbitrajes, campo, material, federación— convierte la app en la contabilidad básica de
la sección. Decidido incluirla (2026-09-04).

Hay una trampa que condiciona el diseño: **las cuotas cobradas ya están en `pagos`**. Si
además se apuntasen como ingreso en `movimientos`, ese dinero se contaría dos veces y el
saldo mentiría. Por eso `movimientos` guarda todo *menos* las cuotas, una restricción de
la base de datos impide crear un movimiento en la categoría `cuotas`, y el resumen suma
las dos fuentes por separado.

El riesgo real de esta parte no es técnico: si no se apuntan *todos* los gastos, los
números mienten y se acaba volviendo al Excel. Vale más un saldo incompleto y sabido que
uno que aparenta ser exacto.

## 8. Fases

### Fase 1A — Consola de gestión — CONSTRUIDA (2026-09-04)

Roster · cuotas y pagos · tesorería completa · documentación con caducidades · panel.
Código en `app/`, puesta en marcha en `app/README.md`. Pendiente de conectar a
Supabase; mientras tanto se puede ver con datos inventados en `app/demo.html`.

Va primero por una razón concreta: **te sirve desde el primer día aunque ningún jugador
entre en la app.** Sustituye tu Excel y tu cuaderno, y el único usuario que tiene que
adoptarla eres tú. Es la parte del proyecto sin riesgo.

### Fase 1B — Lo del jugador

Login con magic link · perfiles · calendario · asistencia · avisos · PWA instalable.

Es el mínimo que sustituye una rutina real del equipo. Aquí sí se pone a prueba la
adopción: si esto no lo abre la gente, la fase 3 no se construye.

### Fase 2 — Cerrar el círculo

Material y préstamos · notificaciones push · comunicación segmentada desde las listas ·
exportación a CSV para la federación · vista del jugador de su propia cuota y material.

### Fase 3 — Playbook

Subida de jugadas por el staff · vista filtrada por posición · modo flashcards ·
progreso por jugador. Solo si la fase 1B demostró adopción.

### Fase 4 — Opcional

Convocatorias de partido · estadísticas de partido · editor de jugadas con rutas
animadas · subida de justificantes a Supabase Storage (hoy se guarda un enlace).

El editor de jugadas es vistoso y es mucho trabajo. Queda deliberadamente al final.

## 9. Notificaciones push

Funcionan vía Web Push (service worker + VAPID), enviadas desde una Edge Function de
Supabase. Sin coste.

**La restricción importante:** en Android funcionan sin fricción, pero **en iPhone solo
llegan si el jugador ha instalado la PWA en su pantalla de inicio.** Safari no permite
push desde una pestaña normal.

Consecuencia práctica: la instalación no es opcional, es un paso obligatorio del
onboarding. Se resuelve haciéndolo en grupo, en un entreno, con un QR proyectado y dos
minutos de explicación. Intentarlo por WhatsApp uno a uno no funciona.

Plan B para los que no instalen: los avisos urgentes se siguen viendo al abrir la app,
y el staff ve quién no lo ha leído para avisar por otro canal.

**Pendiente de medir:** no sabemos el reparto Android/iPhone de la plantilla. Se
registra automáticamente al darse de alta y se decide con el dato real.

## 10. Protección de datos

La app almacena datos personales (contacto, fecha de nacimiento, DNI, contacto de
emergencia, estado de pagos), así que necesita:

- Política de privacidad accesible desde la app.
- Consentimiento explícito en el alta, con registro de fecha.
- Derecho de acceso, rectificación y supresión — que en la práctica se cubre con la
  pantalla "Mi ficha" y un borrado real a petición.
- Datos alojados en la región europea de Supabase (Frankfurt).

**El dato económico es el más delicado.** Que un jugador pueda ver quién debe la cuota
sería un problema serio dentro de un vestuario: cada uno ve solo lo suyo, y el conjunto
solo el admin. Esto se garantiza en la base de datos, no en la interfaz.

El DNI y los justificantes son datos de categoría reforzada: se guardan solo mientras
la federación los exija y se borran al cerrar la temporada.

Esto enlaza con `docs/legal-reactivacion.md`.

### Menores de edad

Hoy la plantilla es sénior, pero se prevé abrir categoría base. **El modelo de datos se
diseña preparado desde el principio**, porque migrarlo después es mucho más caro:

- Campo `es_menor` derivado de la fecha de nacimiento.
- Tabla de tutores legales vinculada al perfil del menor.
- El consentimiento de un menor lo otorga el tutor, no el jugador.
- Los menores de 14 años no pueden crear cuenta por sí mismos según la normativa
  española; la cuenta la gestiona el tutor.
- Ninguna foto de un menor sale de la app sin consentimiento específico y separado.
- La cuota de un menor se reclama al tutor, no al jugador.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| El equipo no adopta la app y sigue en WhatsApp | La fase 1A ya te sirve a ti sin depender de nadie. Alta en grupo durante un entreno, no por mensaje. El staff deja de responder por WhatsApp lo que ya está en la app. |
| Los datos económicos se filtran dentro del vestuario | RLS en base de datos: el jugador solo lee su propia fila. No es una decisión de interfaz. |
| Los datos de cuotas se quedan a medias y dejan de ser fiables | Registrar el pago tiene que costar dos toques. Si cuesta más, se abandona y la app miente. |
| Dependencia de Supabase | Es Postgres estándar y los datos se exportan enteros cuando se quiera. Sin bloqueo real. |
| El proyecto free se pausa por inactividad | Solo ocurre tras 7 días sin uso. Revisar al parar en verano. |
| Mantenimiento en una sola persona | Todo en el repo, documentado, sin build ni dependencias que caduquen. |

## 12. Decisiones pendientes

- Tamaño real de la plantilla y reparto Android/iPhone.
- Importe de la cuota y si se admite fraccionarla en plazos.
- ¿Hay jugadores exentos de cuota, y por qué motivos? (Afecta al modelo.)
- ¿Alguien más del club tendrá rol admin, o la gestión económica es solo tuya?
- ¿Los avisos permiten respuesta de los jugadores o son unidireccionales?
  (Recomendación: unidireccionales — si se pueden contestar, se reinventa WhatsApp.)
- Nombre e icono de la app en la pantalla de inicio.
