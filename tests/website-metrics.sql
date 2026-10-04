begin;
do $$
declare a bigint; b bigint; slug text; order_id bigint; review_id bigint;
    baseline jsonb; actual jsonb; version bigint;
begin
    select id into a from public.services order by id limit 1;
    select id, services.slug into b, slug from public.services where id <> a order by id limit 1;
    select stats, revision into baseline, version from public.website_metrics;
    insert into public.orders(service_id, items, payment_status)
    values (a, jsonb_build_array(
        jsonb_build_object('serviceId', a, 'quantity', 3),
        jsonb_build_object('serviceId', a, 'quantity', 1),
        jsonb_build_object('productId', slug, 'quantity', 2)
    ), 'PENDING') returning id into order_id;
    assert (select revision from public.website_metrics) = version;
    update public.orders set payment_status = 'PAID' where id = order_id;
    select stats into actual from public.website_metrics;
    assert (actual#>>array['services',a::text,'transactions'])::int
        = (baseline#>>array['services',a::text,'transactions'])::int + 1;
    assert (actual#>>array['services',b::text,'transactions'])::int
        = (baseline#>>array['services',b::text,'transactions'])::int + 1;
    insert into public.reviews(service_id, rating, comment, customer_name)
    values (a, 2, 'Rollback-only metrics check', 'Test') returning id into review_id;
    select stats into actual from public.website_metrics;
    assert (actual->>'reviewCount')::int = (baseline->>'reviewCount')::int + 1;
    assert (actual->>'rating')::numeric = (select avg(rating) from public.reviews);
    assert (actual#>>array['services',a::text,'score'])::int
        = (baseline#>>array['services',a::text,'score'])::int + 2;
    update public.reviews set rating = 5 where id = review_id;
    assert (select (stats->>'rating')::numeric from public.website_metrics)
        = (select avg(rating) from public.reviews);
    delete from public.reviews where id = review_id;
    delete from public.orders where id = order_id;
    assert (select stats from public.website_metrics) = baseline;
    assert not has_table_privilege('anon', 'public.website_metrics', 'UPDATE');
    assert not has_table_privilege('authenticated', 'public.website_metrics', 'INSERT');
    assert not has_function_privilege('anon', 'private.refresh_website_metrics()', 'EXECUTE');
    set local role anon;
    assert (select count(*) from public.website_metrics) = 1;
    reset role;
end $$;
rollback;
select 'PASS: PAID counts, multi-service deduplication, rating updates, deletion, read-only public access; rolled back' as result;