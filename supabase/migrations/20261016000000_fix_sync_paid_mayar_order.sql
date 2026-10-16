-- Fix sync_paid_mayar_order to include tipe column and prevent orders_tipe_order_code_format_check violation
CREATE OR REPLACE FUNCTION private.sync_paid_mayar_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare 
  v_subtotal numeric; 
  v_items jsonb; 
  v_service_id bigint;
  v_tipe text;
begin
 if new.payment_status <> 'PAID' then return new; end if;
 
 v_tipe := coalesce(new.tipe, case when new.order_code like 'SPCL%' then 'SPESIAL' else 'REGULER' end);
 
 select coalesce(sum((item->>'unit_price')::numeric * (item->>'quantity')::numeric), 0) into v_subtotal from jsonb_array_elements(new.items) as item;
 select (item->>'service_id')::bigint into v_service_id from jsonb_array_elements(new.items) as item limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('productId', item->>'product_id', 'serviceId', (item->>'service_id')::bigint, 'name', item->>'name', 'price', (item->>'unit_price')::numeric, 'quantity', (item->>'quantity')::integer)), '[]'::jsonb) into v_items from jsonb_array_elements(new.items) as item;
 
 insert into public.orders (order_code, user_id, service_id, items, customer, task, notes, payment_method, subtotal, discount, service_fee, payment_fee, total_price, payment_status, status, created_at, tipe)
 values (new.order_code, new.user_id, v_service_id, v_items, new.customer, new.task, new.task->>'notes', coalesce(new.payment_method, 'Mayar'), v_subtotal, greatest(0, v_subtotal - new.total_price), 0, 0, new.total_price, 'PAID', 'pending', new.created_at, v_tipe)
 on conflict (order_code) do update set payment_status = 'PAID', payment_method = coalesce(excluded.payment_method, public.orders.payment_method) where public.orders.payment_status is distinct from 'PAID';
 return new;
end; $function$;
