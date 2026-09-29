-- Idempotent test fixtures. Zero amounts prevent adding fictitious admin revenue.
with fixtures(number,slug,status,quantity) as (
  values (1,'makalah','pending',10),(2,'ppt','pending',1),(3,'poster','pending',1),
         (4,'editing','completed',1),(5,'artikel','completed',1)
), admin as (
  select id from public.profiles where role='admin' order by id limit 1
)
insert into public.orders (
  order_code,service_id,items,customer,task,notes,payment_method,
  subtotal,discount,service_fee,payment_fee,total_price,payment_status,status,
  estimated_completion,assigned_to,assigned_at
)
select
  'NUG-20260929-DUMMY' || lpad(f.number::text,2,'0'),s.id,
  jsonb_build_array(jsonb_build_object('productId',s.slug,'serviceId',s.id,'name',s.name,'price',0,'quantity',f.quantity)),
  jsonb_build_object('name','Kayla DUMMY ' || lpad(f.number::text,2,'0'),'email','','whatsapp','','is_dummy',true),
  jsonb_build_object('title','DUMMY - ' || s.name,'notes','DATA UJI. Tidak ada pembayaran, pekerjaan, atau pengiriman file sungguhan.','deadline',to_char(now()+interval '3 days','YYYY-MM-DD'),'is_dummy',true),
  'DUMMY v1.03 - data uji tanpa transaksi uang.','DUMMY / Simulasi',
  0,0,0,0,0,'PAID',f.status,
  case when f.status='completed' then now() else now()+interval '3 days' end,
  case when f.status='completed' then (select id from admin) end,
  case when f.status='completed' then now()-interval '1 hour' end
from fixtures f join public.services s on s.slug=f.slug
on conflict (order_code) do nothing
returning order_code,payment_status,status,total_price;
