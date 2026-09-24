-- Payment rows are private. Only verified PAID rows become operational orders.
-- Apply once to Supabase after checking the current public.orders schema.
alter table public.payment_orders
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create or replace function private.sync_paid_mayar_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric;
  v_items jsonb;
  v_service_id bigint;
begin
  if new.payment_status <> 'PAID' then
    return new;
  end if;

  select coalesce(sum((item->>'unit_price')::numeric * (item->>'quantity')::numeric), 0)
    into v_subtotal
    from jsonb_array_elements(new.items) as item;

  select (item->>'service_id')::bigint into v_service_id
    from jsonb_array_elements(new.items) as item limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'productId', item->>'product_id',
    'serviceId', (item->>'service_id')::bigint,
    'name', item->>'name',
    'price', (item->>'unit_price')::numeric,
    'quantity', (item->>'quantity')::integer
  )), '[]'::jsonb) into v_items
    from jsonb_array_elements(new.items) as item;

  insert into public.orders (
    order_code, user_id, service_id, items, customer, task, notes,
    payment_method, subtotal, discount, service_fee, payment_fee,
    total_price, payment_status, status, created_at
  ) values (
    new.order_code, new.user_id, v_service_id, v_items, new.customer,
    new.task, new.task->>'notes', 'Mayar', v_subtotal,
    greatest(0, v_subtotal - new.total_price), 0, 0,
    new.total_price, 'PAID', 'pending', new.created_at
  )
  on conflict (order_code) do update
    set payment_status = 'PAID'
    where public.orders.payment_status is distinct from 'PAID';

  return new;
end;
$$;

revoke all on function private.sync_paid_mayar_order() from public, anon, authenticated;

drop trigger if exists sync_paid_mayar_order on public.payment_orders;
create trigger sync_paid_mayar_order
  after insert or update of payment_status on public.payment_orders
  for each row execute function private.sync_paid_mayar_order();

-- Repair existing successful payments without touching unsuccessful ones.
update public.payment_orders
   set payment_status = 'PAID'
 where payment_status = 'PAID';
