-- Skema instalasi baru. File ini juga dijalankan ulang (idempoten) oleh api/bootstrap.php
-- setiap kali versi skema naik, jadi ini satu-satunya sumber definisi tabel.
-- Database lama otomatis dilengkapi kolom yang kurang sebelum file ini dijalankan.

CREATE TABLE IF NOT EXISTS orders (
    order_id             TEXT PRIMARY KEY,
    idempotency_key      TEXT,
    mayar_transaction_id TEXT,
    mayar_payment_id     TEXT,
    service_id           TEXT NOT NULL DEFAULT 'custom',
    amount               INTEGER NOT NULL CHECK (amount > 0),
    payment_status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'CANCELED')),
    customer_name        TEXT NOT NULL,
    customer_email       TEXT NOT NULL,
    customer_nim         TEXT,
    customer_whatsapp    TEXT,
    task_title           TEXT,
    task_deadline        TEXT,
    task_notes           TEXT,
    task_drive_url       TEXT,
    items_json           TEXT,
    promo                TEXT,
    payment_link         TEXT,
    expires_at           TEXT,
    last_checked_at      TEXT,
    created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at              TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mayar_transaction ON orders(mayar_transaction_id) WHERE mayar_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(mayar_payment_id);

CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT NOT NULL,
    ts     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(bucket, ts);
