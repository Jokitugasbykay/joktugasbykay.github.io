# JOKIIN payment security setup

1. Copy `.env.example` to `.env`, then put the real values only on the PHP server.
2. Confirm that the PHP host has the `pdo_sqlite`, `sqlite3`, `curl`, and `openssl` extensions enabled and that `storage/` is writable by PHP.
3. The database initializes from `database/schema.sql` on first request. It may also be applied manually with the SQLite CLI.
4. Replace the sample IDs/prices in `SERVICE_CATALOG` inside `api/create-mayar-payment.php` with JOKIIN's official price list. Frontend requests must send only `service_id`.
5. Copy the exact webhook signature header, HMAC algorithm, payload paths, transaction-detail path, and paid status from Mayar's current V2 documentation/dashboard into `.env`. Until every mapping is present, successful webhooks are rejected or cannot mark an order as `PAID`.
6. Configure Mayar's return URL through the payment request as `/status-pesanan?order_id=<opaque-order-id>` and register the HTTPS endpoint `/api/mayar-webhook.php` in the Mayar dashboard.

## Hosting requirement

These PHP files and `.htaccess` rules require an Apache-compatible PHP host. Cloudflare Workers does not execute PHP and does not process `.htaccess`; if JOKIIN remains on Workers, port the server endpoints to a Worker and use D1 or another database before deploying.
