create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  request_key text unique,
  customer jsonb not null,
  task jsonb not null default '{}'::jsonb,
  promo text not null default '',
  items jsonb not null,
  total_price bigint not null check (total_price >= 0),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','CANCELED')),
  status text not null default 'pending',
  payment_url text,
  mayar_transaction_id text unique,
  expires_at timestamptz,
  paid_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_orders add column if not exists task jsonb not null default '{}'::jsonb;
alter table public.payment_orders add column if not exists request_key text;
create unique index if not exists payment_orders_request_key_unique on public.payment_orders (request_key);
alter table public.payment_orders add column if not exists promo text not null default '';
alter table public.payment_orders add column if not exists last_verified_at timestamptz;
alter table public.payment_orders enable row level security;
