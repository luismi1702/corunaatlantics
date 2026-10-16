-- Coruña Atlantics — El documento de identidad y la foto, subidos desde la app
-- Ejecutar DESPUÉS de 29_acceso_manda.sql.
--
-- Hasta ahora "DNI entregado" era una casilla que marcaba el staff a mano
-- cuando le llegaba la copia por WhatsApp. Ahora cada jugador sube desde su
-- ficha la cara y el dorso de su documento y la foto de carnet, y quien lleva
-- los documentos lo baja todo de una vez para mandarlo a la federación.
--
-- Documento y no DNI: el reglamento de FEFAPA (art. 27) acepta DNI, NIE o
-- pasaporte, y con gente de Erasmus en el equipo no todos tienen DNI.
--
-- Es lo más delicado que guarda la app, así que:
--   - Bucket PRIVADO. Nada de URLs públicas: cada imagen se sirve con una URL
--     firmada que caduca en minutos.
--   - Cada jugador lee y escribe solo su carpeta, que se llama como su ficha.
--   - Ve las de todos solo quien tiene la llave de 'documentos'.
--   - Solo se admiten tres nombres de archivo y solo JPEG de hasta 3 MB: el
--     bucket no sirve para subir cualquier otra cosa.
--   - Se borran desde la app en cuanto la federación los tiene.

-- ---------------------------------------------------------------------------
-- Qué documento es
--   Lo elige el propio jugador. El número va en `perfiles.dni`, que ya existía
--   y ya salía en el CSV de documentación.
-- ---------------------------------------------------------------------------

alter table perfiles
  add column if not exists documento_tipo text;

do $$
begin
  alter table perfiles add constraint perfiles_documento_tipo_valido
    check (documento_tipo in ('dni', 'nie', 'pasaporte'));
exception when duplicate_object then null;
end $$;

comment on column perfiles.documento_tipo is
  'dni, nie o pasaporte. El pasaporte no lleva dorso.';

-- ---------------------------------------------------------------------------
-- Lo que hay subido
--   La API no deja leer storage.objects directamente, y listar carpeta por
--   carpeta serían veinte peticiones para pintar una lista. Esta función lo
--   devuelve de una vez, con el mismo filtro que las políticas: lo tuyo, o
--   todo si llevas los documentos.
-- ---------------------------------------------------------------------------

create or replace function identidad_subida()
returns table (jugador_id uuid, archivo text, subido_en timestamptz)
language sql stable security definer set search_path = public as $$
  select (storage.foldername(o.name))[1]::uuid,
         storage.filename(o.name),
         coalesce(o.updated_at, o.created_at)
  from   storage.objects o
  where  o.bucket_id = 'identidad'
    and  (storage.foldername(o.name))[1] ~ '^[0-9a-f-]{36}$'
    and  ((storage.foldername(o.name))[1] = mi_perfil_id()::text
          or puede('documentos'));
$$;

comment on function identidad_subida is
  'Archivos de identidad subidos: los propios, o todos para quien lleva los documentos.';

revoke execute on function identidad_subida() from public, anon;
grant  execute on function identidad_subida() to authenticated;

-- ---------------------------------------------------------------------------
-- El almacén
--   En un bloque que atrapa el error, como el de la tienda: según el proyecto,
--   el editor SQL puede no tener permiso sobre storage.objects, y sin el bloque
--   un fallo aquí desharía también la columna de arriba.
-- ---------------------------------------------------------------------------

do $bloque$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('identidad', 'identidad', false, 3145728, array['image/jpeg'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- Ver: lo tuyo, o todo si llevas los documentos.
  execute $p$ drop policy if exists identidad_ver on storage.objects $p$;
  execute $p$ create policy identidad_ver on storage.objects
    for select to authenticated using (
      bucket_id = 'identidad'
      and ((storage.foldername(name))[1] = mi_perfil_id()::text or puede('documentos'))) $p$;

  -- Subir y reemplazar: solo en tu carpeta (o en la de cualquiera si llevas
  -- los documentos, para subir lo que alguien mande por WhatsApp) y solo con
  -- uno de los tres nombres. Nada de subcarpetas.
  execute $p$ drop policy if exists identidad_subir on storage.objects $p$;
  execute $p$ create policy identidad_subir on storage.objects
    for insert to authenticated with check (
      bucket_id = 'identidad'
      and array_length(storage.foldername(name), 1) = 1
      and storage.filename(name) in ('documento_cara.jpg', 'documento_dorso.jpg', 'foto.jpg')
      and ((storage.foldername(name))[1] = mi_perfil_id()::text or puede('documentos'))) $p$;

  execute $p$ drop policy if exists identidad_cambiar on storage.objects $p$;
  execute $p$ create policy identidad_cambiar on storage.objects
    for update to authenticated
    using (
      bucket_id = 'identidad'
      and ((storage.foldername(name))[1] = mi_perfil_id()::text or puede('documentos')))
    with check (
      bucket_id = 'identidad'
      and array_length(storage.foldername(name), 1) = 1
      and storage.filename(name) in ('documento_cara.jpg', 'documento_dorso.jpg', 'foto.jpg')
      and ((storage.foldername(name))[1] = mi_perfil_id()::text or puede('documentos'))) $p$;

  execute $p$ drop policy if exists identidad_borrar on storage.objects $p$;
  execute $p$ create policy identidad_borrar on storage.objects
    for delete to authenticated using (
      bucket_id = 'identidad'
      and ((storage.foldername(name))[1] = mi_perfil_id()::text or puede('documentos'))) $p$;

exception when others then
  raise notice 'No se ha podido configurar el almacen de documentos (%). La columna SI se ha creado. Crea el bucket "identidad" a mano desde Storage, PRIVADO, y avisa: las politicas hay que ponerlas desde el panel.', sqlerrm;
end
$bloque$;

-- Comprobación: tiene que salir una fila con public = false.
select id, public, file_size_limit, allowed_mime_types
from   storage.buckets where id = 'identidad';
