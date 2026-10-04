begin;
do $$
declare masked text; owner uuid; intruder uuid; target bigint; deleted bigint;
begin
assert public.censor_review_comment('anjing anjing goblok!')='an**g an**g go**k!';
assert public.censor_review_comment('Hasilnya buruk dan perlu diperbaiki.')='Hasilnya buruk dan perlu diperbaiki.';
select id into owner from public.profiles where role='user' limit 1;
insert into public.reviews(user_id,rating,comment,customer_name,service_id) values(owner,4,'Rollback-only test','Test',(select id from public.services limit 1)) returning id into target;
select id into intruder from public.profiles where id<>owner and role='user' limit 1;
perform set_config('request.jwt.claim.sub',intruder::text,true);
set local role authenticated;
delete from public.reviews where id=target returning id into deleted;
assert deleted is null;
reset role;
perform set_config('request.jwt.claim.sub',owner::text,true);
set local role authenticated;
delete from public.reviews where id=target returning id into deleted;
assert deleted=target;
reset role;
insert into public.reviews(user_id,rating,comment,customer_name,service_id) values(owner,5,'Rollback-only five-star test','Test',(select id from public.services limit 1)) returning id into target;
set local role authenticated;
delete from public.reviews where id=target returning id into deleted;
assert deleted is null;
reset role;
end $$;
rollback;
select 'PASS: server masking and owner-only low-rating deletion; all data rolled back' as result;