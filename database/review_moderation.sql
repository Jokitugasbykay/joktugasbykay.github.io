create or replace function public.has_review_profanity(value text)
returns boolean language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select translate(
    lower(regexp_replace(normalize(coalesce(value, ''), NFKD),
      U&'[\0300-\036f\200b-\200d\feff]', '', 'g')),
    '@01345789', 'aoieastbg'
  ) ~ '(^|[^a-z0-9])(a+[^a-z0-9]*n+[^a-z0-9]*j+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*g+|b+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*g+[^a-z0-9]*s+[^a-z0-9]*a+[^a-z0-9]*t+|b+[^a-z0-9]*a+[^a-z0-9]*j+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*g+[^a-z0-9]*a+[^a-z0-9]*n+|g+[^a-z0-9]*o+[^a-z0-9]*b+[^a-z0-9]*l+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*o+[^a-z0-9]*l+|b+[^a-z0-9]*e+[^a-z0-9]*g+[^a-z0-9]*o+|k+[^a-z0-9]*o+[^a-z0-9]*n+[^a-z0-9]*t+[^a-z0-9]*o+[^a-z0-9]*l+|m+[^a-z0-9]*e+[^a-z0-9]*m+[^a-z0-9]*e+[^a-z0-9]*k+|n+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*n+[^a-z0-9]*t+[^a-z0-9]*o+[^a-z0-9]*t+|j+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*c+[^a-z0-9]*o+[^a-z0-9]*k+|j+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*c+[^a-z0-9]*u+[^a-z0-9]*k+|a+[^a-z0-9]*s+[^a-z0-9]*u+|k+[^a-z0-9]*a+[^a-z0-9]*m+[^a-z0-9]*p+[^a-z0-9]*r+[^a-z0-9]*e+[^a-z0-9]*t+|b+[^a-z0-9]*a+[^a-z0-9]*b+[^a-z0-9]*i+|t+[^a-z0-9]*a+[^a-z0-9]*i+|f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+|b+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*c+[^a-z0-9]*h+|a+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+)($|[^a-z0-9])';
$$;

create or replace function public.reject_review_profanity()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if public.has_review_profanity(new.comment) then
    raise exception using errcode = '23514',
      message = 'Ulasan mengandung kata kasar. Gunakan bahasa yang sopan.';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_review_profanity on public.reviews;
create trigger reject_review_profanity before insert or update of comment on public.reviews
for each row execute function public.reject_review_profanity();
