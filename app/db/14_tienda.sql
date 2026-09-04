-- Coruña Atlantics — Equipación y merchandising
-- Ejecutar DESPUÉS de 13_permisos_funciones.sql.
--
-- No es una tienda con pasarela de pago: es la lista de lo que vende el club y
-- quién ha pedido qué. El dinero sigue entrando por Bizum, igual que las cuotas,
-- por las mismas razones que en su día (ver docs/decisiones.md).
--
-- Lo que resuelve es el lío de verdad: saber cuántas sudaderas hay que pedir,
-- de qué tallas, y quién ha pagado ya.

do $$ begin
  create type estado_pedido as enum ('pedido', 'entregado', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists productos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  precio       numeric(10,2) not null default 0,
  foto_url     text,
  tallas       text[] not null default '{}',   -- vacío = producto sin tallas
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists productos_actualizado on productos;
create trigger productos_actualizado before update on productos
  for each row execute function tocar_actualizado_en();

create table if not exists pedidos (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references productos(id) on delete cascade,
  jugador_id   uuid not null references perfiles(id) on delete cascade,
  talla        text,
  cantidad     int not null default 1 check (cantidad between 1 and 20),
  estado       estado_pedido not null default 'pedido',
  pagado       boolean not null default false,
  nota         text,
  creado_en    timestamptz not null default now()
);

create index if not exists pedidos_producto_idx on pedidos (producto_id);
create index if not exists pedidos_jugador_idx  on pedidos (jugador_id);

-- Resumen por producto: cuánto se ha pedido y cuánto queda por cobrar.
create or replace view pedidos_resumen
with (security_invoker = on) as
select
  p.producto_id,
  sum(p.cantidad)::int                                             as unidades,
  count(distinct p.jugador_id)::int                                as personas,
  sum(p.cantidad * pr.precio)                                      as total,
  sum(p.cantidad * pr.precio) filter (where p.pagado)              as cobrado
from pedidos p
join productos pr on pr.id = p.producto_id
where p.estado <> 'cancelado'
group by p.producto_id;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table productos enable row level security;
alter table pedidos   enable row level security;

drop policy if exists productos_leer on productos;
create policy productos_leer on productos
  for select to authenticated using (es_aprobado() or es_staff());

drop policy if exists productos_staff on productos;
create policy productos_staff on productos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Cada uno ve y hace sus pedidos; el staff los ve todos.
drop policy if exists pedidos_leer on pedidos;
create policy pedidos_leer on pedidos
  for select to authenticated using (jugador_id = mi_perfil_id() or es_staff());

drop policy if exists pedidos_propio on pedidos;
create policy pedidos_propio on pedidos
  for insert to authenticated with check (jugador_id = mi_perfil_id());

drop policy if exists pedidos_staff on pedidos;
create policy pedidos_staff on pedidos
  for all to authenticated using (es_staff()) with check (es_staff());

-- Un jugador puede cancelar lo suyo mientras no esté entregado, pero no
-- marcarse el pago a sí mismo: eso lo decide quien cobra.
create or replace function bloquear_pago_del_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not es_staff() then
    new.pagado     := old.pagado;
    new.producto_id := old.producto_id;
    new.jugador_id := old.jugador_id;
    if old.estado = 'entregado' then
      new.estado := old.estado;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_bloquear_pago on pedidos;
create trigger pedidos_bloquear_pago before update on pedidos
  for each row execute function bloquear_pago_del_jugador();

drop policy if exists pedidos_cambiar_propio on pedidos;
create policy pedidos_cambiar_propio on pedidos
  for update to authenticated
  using (jugador_id = mi_perfil_id()) with check (jugador_id = mi_perfil_id());

-- ---------------------------------------------------------------------------
-- Almacén de las fotos
--   Bucket público: una foto de una sudadera no es un dato sensible y así se
--   sirve directa, sin firmar cada URL. Subir y borrar, solo el staff.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists productos_foto_ver on storage.objects;
create policy productos_foto_ver on storage.objects
  for select to public using (bucket_id = 'productos');

drop policy if exists productos_foto_subir on storage.objects;
create policy productos_foto_subir on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and es_staff());

drop policy if exists productos_foto_cambiar on storage.objects;
create policy productos_foto_cambiar on storage.objects
  for update to authenticated using (bucket_id = 'productos' and es_staff());

drop policy if exists productos_foto_borrar on storage.objects;
create policy productos_foto_borrar on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and es_staff());
