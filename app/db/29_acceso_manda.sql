-- Coruña Atlantics — Quitar el acceso se lo quita también a la API
-- Ejecutar DESPUÉS de 28_push_dirigido.sql.
--
-- El agujero: `es_staff()` y `es_admin()` miraban el rol y no el acceso.
-- Quitarle el acceso a alguien pone su `acceso` en 'rechazado' y le echa de la
-- app, pero si su rol era 'staff' o 'admin' esas dos funciones seguían diciendo
-- que sí. Su cuenta de correo sigue viva, así que podía volver a entrar y
-- pedirle a la API la plantilla entera: teléfonos, DNI, fechas de nacimiento y
-- las notas del staff. La interfaz le tapaba todo; la base de datos, no.
--
-- A los jugadores no les afectaba —para ellos el corte sí funcionaba— así que
-- solo dejaba expuesto lo de la persona de la que uno se querría proteger si la
-- cosa acaba mal: alguien que llevaba algo del club.
--
-- La rama de `permisos` de es_staff() ya comprobaba el acceso desde el primer
-- día. Lo que faltaba era comprobarlo también en la rama del rol.

-- ---------------------------------------------------------------------------
-- Antes de apretar, reparar
--   Un admin nombrado a mano con 03_arranque.sql puede tener el rol puesto y
--   el acceso en 'nuevo', porque aquel script solo tocaba el rol. Si se
--   apretara sin arreglar eso primero, ese admin se quedaría fuera de su propio
--   club y sin manera de volver desde la app.
--
--   Se reparan solo 'nuevo' y 'pendiente'. A 'rechazado' no se le toca: ese
--   estado significa que alguien le quitó el acceso a propósito, y es justo el
--   caso que este archivo viene a cerrar.
-- ---------------------------------------------------------------------------

update perfiles
set    acceso = 'aprobado'
where  rol in ('admin', 'staff')
  and  acceso in ('nuevo', 'pendiente');

-- ---------------------------------------------------------------------------
-- Ahora sí: sin acceso no hay nada, sea cual sea el rol
-- ---------------------------------------------------------------------------

create or replace function es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' and acceso = 'aprobado'
                   from perfiles where user_id = auth.uid()), false);
$$;

comment on function es_admin is
  'Manda en el club: rol admin Y acceso aprobado. Quitarle el acceso a un admin le quita todo.';

create or replace function es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('staff','admin') and acceso = 'aprobado'
                   from perfiles where user_id = auth.uid()), false)
      or exists (
        select 1 from permisos p
        join perfiles pe on pe.id = p.perfil_id
        where pe.user_id = auth.uid() and pe.acceso = 'aprobado');
$$;

comment on function es_staff is
  'Lleva algo del club y sigue teniendo acceso. Abre las lecturas generales, nunca el dinero ni los documentos.';

-- Comprobación. Tiene que salir al menos una fila, y una de ellas tienes que
-- ser tú: son las personas que mandan en el club después del cambio.
select nombre, email, rol, acceso
from   perfiles
where  rol in ('admin', 'staff') and acceso = 'aprobado';
