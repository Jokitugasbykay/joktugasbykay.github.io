-- Jalankan sekali di Supabase SQL Editor.
-- Hanya admin JOKIIN Workplace yang dapat mengubah promo.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
grant select, insert, update on public.site_settings to authenticated;

drop policy if exists "admin reads site settings" on public.site_settings;
create policy "admin reads site settings"
on public.site_settings for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role in ('admin', 'super_admin')));

drop policy if exists "admin edits site settings" on public.site_settings;
create policy "admin edits site settings"
on public.site_settings for insert to authenticated
with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role in ('admin', 'super_admin')));

drop policy if exists "admin updates site settings" on public.site_settings;
create policy "admin updates site settings"
on public.site_settings for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role in ('admin', 'super_admin')))
with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role in ('admin', 'super_admin')));

insert into public.site_settings (key, value)
values ('home_promo', '{"label":"PROMO TERBATAS","text":"Diskon s.d 30% semua pengerjaan tugas & makalah kuliah.","coupon":"JOKIHEMAT","ends_at":"2026-12-31T23:59:59+07:00"}'::jsonb)
on conflict (key) do nothing;

-- Diskon per layanan. JOKI.IN Workplace cukup mengubah sale_percent dan sale_label
-- pada tabel services; harga final tetap dihitung ulang oleh Worker saat membuat pembayaran.
alter table public.services
  add column if not exists sale_percent numeric(5,2) not null default 0,
  add column if not exists sale_label text;

alter table public.services
  drop constraint if exists services_sale_percent_range;

alter table public.services
  add constraint services_sale_percent_range
  check (sale_percent >= 0 and sale_percent <= 100);
