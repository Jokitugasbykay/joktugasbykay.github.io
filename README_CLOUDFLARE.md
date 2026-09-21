# JOKI.IN Cloudflare Worker

ZIP ini memakai aset website dari revisi Mayar dan menambahkan backend Cloudflare Worker.

## File baru

- `src/worker.js`: endpoint Mayar dan webhook.
- `wrangler.jsonc`: mengubah deployment static menjadi Worker + static assets.
- `database/payment_orders.sql`: tabel order pembayaran di Supabase.

## Deploy

1. Jalankan SQL di `database/payment_orders.sql` pada Supabase SQL Editor.
2. Commit `src/worker.js` dan `wrangler.jsonc` ke root repository GitHub yang terhubung ke Cloudflare.
3. Tunggu deployment selesai.
4. Buka Worker `jokiin-payment-api` → Settings → Variables and secrets.
5. Tambahkan sebagai Secret: `MAYAR_API_KEY`, `MAYAR_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Daftarkan webhook Mayar ke `https://jokiin-payment-api.gamingyoga14.workers.dev/api/mayar-webhook`.

Jangan memasukkan nilai secret ke GitHub, `index.html`, atau file `.env` yang dipublikasikan.
