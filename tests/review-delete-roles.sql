begin;
do $$
declare moderator record; target bigint; removed bigint; owner uuid;
begin
    for moderator in
        select p.id, p.role, p.workplace_role from public.profiles p join auth.users u on u.id = p.id
        where lower(u.email) in ('gamingyoga14@gmail.com', 'kaylafisika24@gmail.com')
    loop
        assert moderator.role = 'admin' and moderator.workplace_role in ('founder', 'supervisor');
        insert into public.reviews(rating, comment, customer_name, service_id)
        values (5, 'Rollback-only moderator deletion check', 'Test', (select id from public.services limit 1)) returning id into target;
        perform set_config('request.jwt.claim.sub', moderator.id::text, true);
        set local role authenticated;
        delete from public.reviews where id = target returning id into removed;
        assert removed = target;
        reset role;
        perform set_config('request.jwt.claim.sub', '', true);
    end loop;
    assert (select count(*) from public.profiles p join auth.users u on u.id=p.id
        where lower(u.email) in ('gamingyoga14@gmail.com','kaylafisika24@gmail.com')) = 2;
    select id into owner from public.profiles where role='user' limit 1;
    insert into public.reviews(user_id, rating, comment, customer_name, service_id)
    values (owner, 5, 'Rollback-only customer restriction check', 'Test', (select id from public.services limit 1)) returning id into target;
    perform set_config('request.jwt.claim.sub', owner::text, true);
    set local role authenticated;
    removed := null;
    delete from public.reviews where id = target returning id into removed;
    assert removed is null;
    reset role;
end $$;
rollback;
select 'PASS: both named moderators can delete five-star reviews; customer cannot; all changes rolled back' as result;