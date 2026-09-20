# JOKI.IN: panduan deploy (Mayar + PHP + SQLite)

Butuh PHP 8.1+ dengan ekstensi `pdo_sqlite` dan `curl`, di hosting Apache (pakai `.htaccess`).

## Alur pembayaran

1. Pelanggan menekan Beli. Browser mengirim ke `api/create-mayar-payment.php`: data pelanggan, detail tugas, dan **hanya `productId` + `quantity`** per layanan.
2. Server mengambil harga dari tabel `services` di Supabase, menghitung total sendiri (termasuk promo), lalu membuat link di Mayar. Angka total dari browser tidak dipercaya; kalau beda lebih dari Rp1, server menjawab 409 "harga berubah".
3. Pesanan lengkap (termasuk detail tugas) disimpan di SQLite dengan ID acak `ord_<32 hex>`. `transactionId` dari Mayar ikut disimpan.
4. Mayar dibuka di tab baru. Tab asli memantau `api/check-status.php` tiap beberapa detik.
5. Status **PAID** hanya bisa ditetapkan oleh `reconcile_order()` setelah server bertanya langsung ke API Mayar (`GET /transactions/{id}`) dan mendapat status `paid` dengan nominal minimal sama dengan pesanan. Isi webhook tidak pernah dipercaya begitu saja.
6. Webhook (`api/mayar-webhook.php`) hanya mempercepat langkah 5. Kalau webhook terlambat atau tidak pernah datang, pemantauan dari halaman sukses tetap menyelesaikannya.

## Langkah deploy

1. Upload seluruh folder. Salin `.env.example` menjadi `.env` di server dan isi nilainya (komentar ditulis di baris sendiri).
2. Sangat disarankan: taruh database **di luar `public_html`**, mis. `DB_PATH=/home/USER/data/jokiin.sqlite`. Folder itu harus bisa ditulis PHP. Tanpa ini database ada di `storage/` (sudah diblokir oleh `.htaccess` dan `storage/.htaccess`, tapi lebih aman di luar webroot).
3. Mulai dengan `MAYAR_ENV=sandbox` dan API key sandbox. Ganti ke `production` hanya setelah semua uji di bawah lolos.
4. Isi `ADMIN_TOKEN` (acak, minimal 24 karakter). Halaman admin: `https://DOMAIN/admin/`.
5. Daftarkan webhook di dashboard Mayar: `https://DOMAIN/api/mayar-webhook.php`. Bila `MAYAR_WEBHOOK_TOKEN` diisi, tambahkan `?token=NILAI` di URL itu.
6. Skema database dibuat/diperbarui otomatis dari `database/schema.sql`. Database versi lama dimigrasi tanpa kehilangan data.

## Uji di sandbox sebelum production

Hal-hal ini bergantung pada perilaku Mayar yang tidak bisa diuji dari luar. Cek satu per satu:

- [ ] Bayar satu pesanan sandbox sampai selesai. Halaman sukses harus berubah sendiri menjadi "Pembayaran Berhasil" dan pesanan muncul di `/admin/`.
- [ ] `redirectUrl`: dokumentasi Mayar menyebut payment request bisa menolaknya (400). Kode sudah mengulang tanpa `redirectUrl` bila itu terjadi, jadi checkout tetap jalan. Cek `error_log`; kalau ditolak, tombol "kembali" di Mayar tidak akan mengarah ke situs, tapi pemantauan otomatis tetap bekerja.
- [ ] Tombol "Test URL Hook" di Mayar harus dijawab 200 (`matched:false`). Lalu bayar pesanan sandbox dan lihat di log apakah webhook menemukan pesanan (`matched:true`). Bila tidak, tidak masalah: pemantauan tetap menandai PAID, tapi laporkan ID mana yang dikirim Mayar di webhook.
- [ ] Bila Mayar ternyata mengirim tanda tangan HMAC, isi `MAYAR_WEBHOOK_SIGNATURE_HEADER` dan `MAYAR_WEBHOOK_SECRET`.

## Keamanan

- `.htaccess` memblokir isi `database/`, `storage/`, `.git`, `.env*`, semua `*.md`, `*.sql`, `*.sqlite*`, dan file pustaka `api/*-lib.php`, `bootstrap.php`, `mayar-config.php`.
- Anon key Supabase di `index.html` memang publik (publishable), **asal RLS aktif** di semua tabel. Pastikan tabel `services` hanya bisa dibaca (bukan ditulis) oleh anon.
- `Strict-Transport-Security` dengan `includeSubDomains` di `.htaccess` mengunci semua subdomain ke HTTPS. Hapus opsi itu bila ada subdomain yang belum HTTPS.
- Jangan pernah menaruh `MAYAR_API_KEY` atau `ADMIN_TOKEN` di file yang ada di webroot selain `.env` (yang diblokir).

## Menyalakan routing URL bersih (opsional)

`assets/js/jokiin-spa.js` (rute seperti `/layanan`) sengaja **tidak** dipasang di `index.html` karena mengubah seluruh navigasi situs. Kalau ingin dicoba, pasang setelah skrip modul utama dan uji menyeluruh di browser.
