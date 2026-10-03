alter table public.orders add column if not exists promo_campaign_id uuid;
alter table public.orders add column if not exists promo_redeemed boolean not null default false;

create or replace function private.guard_order_promo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare campaign jsonb;
begin
  if tg_op = 'UPDATE' and old.promo_campaign_id is not null then
    if new.promo_campaign_id is distinct from old.promo_campaign_id or new.user_id is distinct from old.user_id then
      raise exception 'PROMO_IDENTITY_CHANGED';
    end if;
    new.promo_redeemed := old.promo_redeemed;
  elsif tg_op = 'INSERT' and new.discount > 0 then
    if new.user_id is null then raise exception 'PROMO_LOGIN_REQUIRED'; end if;
    select value into campaign from public.site_settings where key='home_promo' for share;
    if coalesce((campaign->>'active')::boolean,false) is not true or
       now() < (campaign->>'starts_at')::timestamptz or now() >= (campaign->>'ends_at')::timestamptz or
       campaign->>'campaign_id' is null or campaign->>'starts_at' is null or campaign->>'ends_at' is null then raise exception 'PROMO_EXPIRED'; end if;
    new.promo_campaign_id := (campaign->>'campaign_id')::uuid;
    new.promo_redeemed := false;
  elsif tg_op = 'INSERT' then
    new.promo_campaign_id := null;
    new.promo_redeemed := false;
  end if;
  if new.promo_campaign_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text || new.promo_campaign_id::text,0));
    if exists (select 1 from public.orders where user_id=new.user_id and promo_campaign_id=new.promo_campaign_id
               and id is distinct from new.id and promo_redeemed) then raise exception 'PROMO_ALREADY_USED'; end if;
    if exists (select 1 from public.orders where user_id=new.user_id and promo_campaign_id=new.promo_campaign_id
               and id is distinct from new.id and upper(payment_status)='PENDING') then
      raise exception 'PROMO_PAYMENT_PENDING';
    end if;
    new.promo_redeemed := new.promo_redeemed or upper(new.payment_status)='PAID';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_order_promo() from public, anon, authenticated;
create trigger guard_order_promo before insert or update of user_id,promo_campaign_id,promo_redeemed,payment_status
on public.orders for each row execute function private.guard_order_promo();
create unique index orders_one_promo_per_account on public.orders(user_id,promo_campaign_id)
where promo_campaign_id is not null and (promo_redeemed or (upper(payment_status)='PENDING'));

create or replace function public.jokiin_promo_eligibility(p_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare campaign jsonb; actor uuid := auth.uid(); used boolean := false; reserved boolean := false; active boolean;
begin
  select value into campaign from public.site_settings where key='home_promo';
  active := coalesce((campaign->>'active')::boolean,false) and campaign->>'campaign_id' is not null
    and now() >= (campaign->>'starts_at')::timestamptz and now() < (campaign->>'ends_at')::timestamptz;
  if actor is not null and campaign->>'campaign_id' is not null then
    select coalesce(bool_or(promo_redeemed),false),
           coalesce(bool_or(upper(payment_status)='PENDING'),false)
    into used,reserved from public.orders where user_id=actor and promo_campaign_id=(campaign->>'campaign_id')::uuid;
  end if;
  return jsonb_build_object('promo',coalesce(campaign,'{}'::jsonb),'used',used,
    'valid',coalesce(active,false) and actor is not null and not used and not reserved
       and (p_code is null or upper(btrim(p_code))=campaign->>'coupon'),
    'discount_percent',case when active then (campaign->>'discount_percent')::integer else 0 end,
    'reason',case when not coalesce(active,false) then 'expired' when actor is null then 'login'
                 when used then 'used' when reserved then 'pending' else null end);
end;
$$;
revoke all on function public.jokiin_promo_eligibility(text) from public;
grant execute on function public.jokiin_promo_eligibility(text) to anon, authenticated, service_role;