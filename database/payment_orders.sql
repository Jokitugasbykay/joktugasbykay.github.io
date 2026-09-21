create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer jsonb not null,
  items jsonb not null,
  total_price bigint not null check (total_price >= 0),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','CANCELED')),
  status text not null default 'pending',
  payment_url text,
  mayar_transaction_id text unique,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_orders enable row level security;
