# JOKIIN-WEBSITE

Dokumentasi utama website. Paket ini hanya memiliki satu README.

## Fitur dan Perbaikan

- Invoice read-only tersedia pada Detail Pesanan setelah pembayaran PAID. Cetak menggunakan halaman /invoice/ pada domain yang sama dan dibuka terpisah tanpa print otomatis.
- Invoice memakai identitas dua kolom, tanggal DD/MM/YYYY, tabel rincian, dan Total Akhir. Biaya dan diskon yang tidak nol tetap ditampilkan.
- Popup detail mobile tidak lagi tertutup oleh history.back() yang terlambat. Scroll halaman dikunci hanya selama popup terbuka.
- Promo mobile: Promo Terbatas dan X di atas; diskon kiri dan timer kanan pada baris tengah; running text kiri dan Klaim Promo kanan pada baris bawah.
- Running text hanya berisi pesan promo, tanpa menambahkan kupon atau diskon otomatis. Loop menggunakan dua grup identik dan mendukung reduced motion.
- Ikon menggunakan aset lokal dengan URL berdasarkan lokasi script. Ikon gagal dimuat disembunyikan tanpa menghilangkan teks status.
- Katalog menggunakan foto berbeda per layanan. Desain Poster memakai foto proses desain. Layanan editing bernama Edit & Revisi Karya Ilmiah dengan ikon dokumen dan pena.
- Bentuk navbar dipertahankan; alignment indikator diperbaiki.

## Pesanan Uji

Tiga pesanan PAID/pending:
- NUG-20260929-676767670001
- NUG-20260929-676767670002
- NUG-20260929-676767670003

Dua pesanan PAID/completed yang ditugaskan ke admin masih bernomor NUG-20260929-DUMMY04 dan NUG-20260929-DUMMY05. Trigger kepemilikan admin menolak perubahan nomor melalui koneksi pengelolaan yang digunakan. Format DUMMY tidak diterima pelacakan publik.

Semua nominal pesanan uji Rp0. Tidak ada transaksi, pekerjaan, email pelanggan, atau hasil file sungguhan.

## Google Drive

Untuk My Drive pribadi, gunakan OAuth pemilik folder: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN. Service account hanya digunakan untuk Shared Drive yang memberinya izin upload. OAuth diprioritaskan jika keduanya tersedia. Simpan secret di server, bukan frontend.

## Batas Verifikasi

Tes browser lokal mencakup katalog, ikon, checkout, invoice, popup mobile, navbar, dan promo. Dialog printer sistem serta upload Google Drive produksi belum diuji langsung menggunakan konfigurasi pemilik. Paket tidak otomatis memperbarui deployment produksi. Header/footer bawaan browser dapat dinonaktifkan melalui pengaturan print jika masih muncul.

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


---

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


---

# Produk Workplace v1.5.0

Deploy `index.html` dan `src/worker.js` bersama setelah persetujuan pengguna. Perubahan backend Supabase sudah diterapkan. Katalog dan worker checkout menghitung harga dari `price`, `sale_percent`, `sale_amount` yang sama. Sakelar promo membaca `site_settings.home_promo.active` lewat `/api/promo`. Wrangler memakai `src/worker.js` sebagai satu-satunya sumber Worker. Jangan menerbitkan hanya salah satu bagian: situs lama tidak memahami diskon nominal dan worker lama mengabaik nominal di checkout.


---

# Promo mingguan JOKI.IN

Sumber ini menyiapkan promo satu kampanye untuk setiap periode berjalan tujuh hari. Perubahan belum diterapkan ke server atau dipublikasikan.

## Urutan aktivasi setelah persetujuan publikasi

1. Tinjau dan jalankan `workplace/supabase/promo-weekly.sql` pada proyek Supabase yang benar. Skrip menormalkan promo lama, membatasi perubahan promo ke RPC admin, dan menghitung ulang diskon produk serta kode promo pada checkout reguler.
2. Perbarui Edge Function `jokiin-api` dari `website/supabase/functions/jokiin-api/index.ts`. Perubahan ini memberikan pesan jelas ketika promo kedaluwarsa.
3. Publikasikan Worker dari `src/worker.js` serta website `website/index.html` dalam satu rilis. Worker adalah sumber validasi kode untuk tampilan dan checkout Mayar.
4. Bangun dan bagikan aplikasi Android versi 1.5.3 dari folder `workplace` setelah langkah di atas.

Jangan membalik urutan: Worker baru memerlukan `starts_at` yang dibuat migrasi; aplikasi baru memerlukan RPC `jokiin_manage_promo`. Website lama memiliki kode promo tetap yang bisa menampilkan diskon berbeda dari backend baru.

Saat admin memilih **Buat promo**, promonya disimpan sebagai draft. Mengaktifkannya memulai tujuh hari hitung mundur. Admin dapat mengedit dan menonaktifkan kampanye yang sama selama periode ini. Database menolak pembuatan kampanye lain sampai tujuh hari berlalu. Website hanya menampilkan kampanye aktif yang belum kedaluwarsa. Potongan kode berlaku atas subtotal setelah diskon produk, diperiksa ulang oleh server ketika checkout.

Pengujian lokal: `node --test website/tests/*.test.cjs`. Gradle dan Android SDK diperlukan untuk membangun APK; APK belum dibuat di lingkungan ini.


---

# JOKIIN payment security setup

1. Copy `.env.example` to `.env`, then put the real values only on the PHP server.
2. Confirm that the PHP host has the `pdo_sqlite`, `sqlite3`, `curl`, and `openssl` extensions enabled and that `storage/` is writable by PHP.
3. The database initializes from `database/schema.sql` on first request. It may also be applied manually with the SQLite CLI.
4. Replace the sample IDs/prices in `SERVICE_CATALOG` inside `api/create-mayar-payment.php` with JOKIIN's official price list. Frontend requests must send only `service_id`.
5. Copy the exact webhook signature header, HMAC algorithm, payload paths, transaction-detail path, and paid status from Mayar's current V2 documentation/dashboard into `.env`. Until every mapping is present, successful webhooks are rejected or cannot mark an order as `PAID`.
6. Configure Mayar's return URL through the payment request as `/status-pesanan?order_id=<opaque-order-id>` and register the HTTPS endpoint `/api/mayar-webhook.php` in the Mayar dashboard.

## Hosting requirement

These PHP files and `.htaccess` rules require an Apache-compatible PHP host. Cloudflare Workers does not execute PHP and does not process `.htaccess`; if JOKIIN remains on Workers, port the server endpoints to a Worker and use D1 or another database before deploying.


---

# Lampiran pesanan ke Google Drive

Perubahan kode ini belum aktif sampai Worker dan aset situs di-deploy. Link yang disimpan pada `site_settings.task_upload_drive_folder` harus berupa folder utama penampung, bukan folder tanggal tertentu.

## Aktivasi

1. Siapkan Google Drive API OAuth milik akun pemilik folder. Izin OAuth harus dapat membuat file di folder tujuan; simpan refresh token dari akun tersebut di server. URL folder saja tidak memberikan izin unggah. Jangan masukkan kredensial atau refresh token ke source, HTML, APK, atau chat.
2. Cara yang direkomendasikan: buat Google Cloud **Service Account**, buat JSON key-nya, lalu tambahkan seluruh isi JSON itu sebagai secret Cloudflare `GOOGLE_SERVICE_ACCOUNT_JSON`. Bagikan folder utama Drive tujuan ke email service account sebagai **Editor**. Metode ini tidak memerlukan OAuth Playground atau refresh token.
3. Metode OAuth lama tetap didukung dengan tiga secret: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`.
4. Deploy `src/worker.js`, lalu deploy `index.html` beserta file web terkait. Jalur checkout akan membuat pesanan dan mengunggah lampiran ke Drive sebelum membuka halaman pembayaran. Jika Drive gagal, checkout menampilkan error dan tidak menganggap lampiran terkirim.
5. Buka halaman `admin/`, pilih tab **Folder Lampiran**, lalu simpan link folder utama. Sistem akan membuat atau memakai subfolder tanggal hari ini otomatis memakai zona waktu WIB, sehingga link tidak perlu diganti setiap hari. Menu tersebut membaca dan menyimpan `site_settings.task_upload_drive_folder`, yang dibatasi untuk admin.

File maksimal 10 dengan ukuran gabungan 50 MB. Endpoint Worker mengulangi pemeriksaan jumlah dan ukuran. Nama dan link hasil unggah disimpan dalam `payment_orders.task.attachments` dan akan tersalin ke `orders.task` ketika pembayaran berubah menjadi PAID. Pada transaksi yang sudah PAID sebelum perubahan ini, lampiran lama yang tidak pernah diunggah tidak dapat dipulihkan dari browser.

**Batasan operasional:** unggah 50 MB dari jaringan seluler perlu pengujian langsung pada akun dan batas paket Cloudflare. Jika akun Google OAuth atau service account tidak diberi akses tulis ke folder utama, Worker mengembalikan kegagalan yang menjelaskan tindakan perbaikannya. Uji dengan file kecil terlebih dahulu sebelum transaksi nyata.

