PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    mayar_transaction_id TEXT UNIQUE,
    service_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'CANCELED')),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    payment_link TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    transaction_id TEXT PRIMARY KEY,
    event_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,
    locked_until TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);
