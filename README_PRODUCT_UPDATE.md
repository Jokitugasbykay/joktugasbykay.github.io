# Produk Workplace v1.5.0

Deploy `index.html` dan `src/worker.js` bersama setelah persetujuan pengguna. Perubahan backend Supabase sudah diterapkan. Katalog dan worker checkout menghitung harga dari `price`, `sale_percent`, `sale_amount` yang sama. Sakelar promo membaca `site_settings.home_promo.active` lewat `/api/promo`. `worker.js` di akar juga disinkronkan, tetapi Wrangler memakai `src/worker.js`. Jangan menerbitkan hanya salah satu bagian: situs lama tidak memahami diskon nominal dan worker lama mengabaik nominal di checkout.
