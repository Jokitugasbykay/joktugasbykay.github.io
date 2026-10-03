begin;
do $$
declare actor uuid; other_actor uuid; service public.services%rowtype; amount numeric; result jsonb; oid bigint; campaign uuid := gen_random_uuid(); rejected boolean; request_id uuid:=gen_random_uuid();
begin
select id into actor from public.profiles where role='user' limit 1;
select id into other_actor from public.profiles where role='user' and id<>actor limit 1;
assert actor is not null and other_actor is not null;
select * into service from public.services where status='active' and price>0 limit 1;
amount:=greatest(1,round(service.price-case when service.sale_amount>0 then service.sale_amount else service.price*service.sale_percent/100 end))*10;
update public.site_settings set value=jsonb_build_object('campaign_id',campaign,'active',true,'coupon','PROMOTEST','discount_percent',5,'starts_at',now()-interval '1 hour','ends_at',now()+interval '1 day') where key='home_promo';
result:=public.jokiin_create_order(actor,request_id,repeat('a',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','PROMOTEST',amount-round(amount*0.05));
oid:=(result->>'id')::bigint;
assert (result->>'promo_campaign_id')::uuid=campaign;
assert public.jokiin_create_order(actor,request_id,repeat('a',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','PROMOTEST',amount-round(amount*0.05))->>'id'=oid::text;
rejected:=false;
begin
perform public.jokiin_create_order(actor,gen_random_uuid(),repeat('b',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','PROMOTEST',amount-round(amount*0.05));
exception when others then if sqlerrm<>'PROMO_PAYMENT_PENDING' then raise; end if; rejected:=true;
end; assert rejected;
rejected:=false;
begin
perform public.jokiin_create_order(null,gen_random_uuid(),repeat('c',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','PROMOTEST',amount-round(amount*0.05));
exception when others then if sqlerrm<>'PROMO_LOGIN_REQUIRED' then raise; end if; rejected:=true;
end; assert rejected;
update public.orders set payment_status='PAID' where id=oid;
assert (select promo_redeemed from public.orders where id=oid);
perform set_config('request.jwt.claim.sub',actor::text,true);
result:=public.jokiin_promo_eligibility('PROMOTEST');
assert (result->>'used')::boolean and not (result->>'valid')::boolean;
rejected:=false;
begin
perform public.jokiin_create_order(actor,gen_random_uuid(),repeat('d',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','PROMOTEST',amount-round(amount*0.05));
exception when others then if sqlerrm<>'PROMO_ALREADY_USED' then raise; end if; rejected:=true;
end; assert rejected;
perform set_config('request.jwt.claim.sub',other_actor::text,true);
assert (public.jokiin_promo_eligibility('PROMOTEST')->>'valid')::boolean;
perform set_config('request.jwt.claim.sub',actor::text,true);
update public.site_settings set value=jsonb_set(value,'{coupon}','"EDITEDTEST"') where key='home_promo';
assert (public.jokiin_promo_eligibility('EDITEDTEST')->>'used')::boolean;
update public.site_settings set value=jsonb_set(value,'{campaign_id}',to_jsonb(gen_random_uuid())) where key='home_promo';
assert (public.jokiin_promo_eligibility('EDITEDTEST')->>'valid')::boolean;
perform set_config('request.jwt.claim.sub','',true);
perform public.jokiin_create_order(actor,gen_random_uuid(),repeat('e',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','EDITEDTEST',amount-round(amount*0.05));
perform public.jokiin_create_order(null,gen_random_uuid(),repeat('f',64),'{}','{}',jsonb_build_array(jsonb_build_object('productId',service.slug,'quantity',10)),'mayar','',amount);
end $$;
rollback;
select 'PASS: pending lock, paid redemption, reuse denial, account isolation, edited/new campaign, guest rules and idempotency' as result;