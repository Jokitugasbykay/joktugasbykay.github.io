create table public.website_metrics (
    id boolean primary key default true check (id),
    revision bigint not null default 1,
    stats jsonb not null
);
alter table public.website_metrics enable row level security;
revoke all on public.website_metrics from anon, authenticated;
grant select on public.website_metrics to anon, authenticated;
create policy "Public aggregate metrics" on public.website_metrics
    for select to anon, authenticated using (true);

create function private.refresh_website_metrics() returns void
language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
    -- ponytail: serialize small aggregate rebuilds; use incremental counters if order volume grows.
    perform pg_advisory_xact_lock(20261004, 1);
    with paid_services as (
        select o.id as order_id, o.service_id from public.orders o
        where upper(o.payment_status) = 'PAID' and o.service_id is not null
        union
        select o.id, s.id from public.orders o
        cross join lateral jsonb_array_elements(
            case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end
        ) item
        join public.services s on s.id::text = item->>'serviceId'
            or (item->>'serviceId' is null and s.slug = item->>'productId')
        where upper(o.payment_status) = 'PAID'
    ), transactions as (
        select service_id, count(*) as total from paid_services group by service_id
    ), reviews as (
        select service_id, count(*) as total from public.reviews group by service_id
    )
    select jsonb_build_object(
        'reviewCount', (select count(*) from public.reviews),
        'rating', (select avg(rating) from public.reviews),
        'services', coalesce(jsonb_object_agg(s.id::text, jsonb_build_object(
            'transactions', coalesce(t.total, 0), 'reviews', coalesce(r.total, 0),
            'score', coalesce(t.total, 0) + coalesce(r.total, 0)
        )), '{}'::jsonb)
    ) into payload
    from public.services s
    left join transactions t on t.service_id = s.id
    left join reviews r on r.service_id = s.id;
    insert into public.website_metrics(id, stats) values (true, payload)
    on conflict (id) do update set stats = excluded.stats,
        revision = public.website_metrics.revision + 1
    where public.website_metrics.stats is distinct from excluded.stats;
end $$;
revoke all on function private.refresh_website_metrics() from public, anon, authenticated;

create function private.website_metrics_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    perform private.refresh_website_metrics();
    return null;
end $$;
revoke all on function private.website_metrics_changed() from public, anon, authenticated;
create trigger website_metrics_orders after insert or delete or update of payment_status, items, service_id
    on public.orders for each statement execute function private.website_metrics_changed();
create trigger website_metrics_reviews after insert or delete or update of rating, service_id
    on public.reviews for each statement execute function private.website_metrics_changed();
create trigger website_metrics_services after insert or delete or update of slug
    on public.services for each statement execute function private.website_metrics_changed();
select private.refresh_website_metrics();
alter publication supabase_realtime add table public.website_metrics;