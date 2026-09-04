-- Coruña Atlantics — Aplicar el importe de la cuota a posteriori
-- Ejecutar DESPUÉS de 10_material.sql.
--
-- El caso real: se monta la app antes de saber cuánto va a costar la cuota, así
-- que la temporada arranca con importe 0. La gente se va registrando y a cada
-- uno se le abre su cuota... a 0. Cuando semanas después se fija el precio,
-- cambiar el importe de la temporada NO toca las cuotas ya creadas, y quedan
-- sesenta fichas a cero que habría que editar a mano.
--
-- Esta función las pone al día de una vez. Solo toca las que están a cero, sin
-- ningún pago y sin exención: una cuota con un importe distinto es una decisión
-- que alguien tomó, y no se pisa.

create or replace function aplicar_importe_cuota(p_temporada uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t temporadas%rowtype; n int;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede cambiar los importes';
  end if;

  select * into t from temporadas where id = p_temporada;
  if not found then raise exception 'Temporada no encontrada'; end if;

  update cuotas c
  set    importe_total = t.importe_cuota
  where  c.temporada_id = p_temporada
    and  c.importe_total = 0
    and  not c.exento
    and  not exists (select 1 from pagos p where p.cuota_id = c.id);

  get diagnostics n = row_count;
  return n;
end $$;

comment on function aplicar_importe_cuota is
  'Pone al importe vigente las cuotas que quedaron a cero. No toca las que ya tienen pagos, un importe propio o exención.';
