# joki.in — panduan unggah hosting

## Isi folder

- `index.html` — halaman utama joki.in.
- `api/create-mayar-payment.php` — membuat tautan pembayaran Mayar dari checkout.
- `api/mayar-webhook.php` — menerima webhook Mayar secara aman.
- `api/mayar-config.example.php` — contoh konfigurasi rahasia; jangan dipakai langsung.

## Mengaktifkan Mayar

1. Unggah seluruh isi folder ini ke `public_html` untuk domain `jokiin.my.id`.
2. Pada folder `api`, salin `mayar-config.example.php` menjadi `mayar-config.php`.
3. Isi `api_key`, `webhook_token`, dan `website_url` pada `mayar-config.php` langsung melalui File Manager hosting.
4. Di dashboard Mayar, daftarkan URL webhook ini:

   `https://jokiin.my.id/api/mayar-webhook.php`

5. Pastikan hosting mendukung PHP dan ekstensi cURL.

Jangan menaruh API key atau webhook token di `index.html`, dan jangan mengunggah `mayar-config.php` ke repositori publik.

## Catatan status pembayaran

Checkout Mayar kini membuat tautan pembayaran dan mengarahkan pelanggan ke Mayar. Untuk memperbarui status pesanan di Supabase secara otomatis setelah webhook masuk, endpoint backend Supabase perlu menangani payload webhook Mayar. Isi `webhook_forward_url` pada konfigurasi setelah endpoint tersebut tersedia.
