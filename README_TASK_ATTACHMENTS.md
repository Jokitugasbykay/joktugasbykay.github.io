# Lampiran pesanan ke Google Drive

Perubahan kode ini belum aktif di situs dan APK sampai masing-masing di-deploy. Folder tujuan awal tanggal 25 September 2026 sudah tersimpan di `site_settings.task_upload_drive_folder` pada proyek Supabase produksi.

## Aktivasi

1. Siapkan Google Drive API OAuth milik akun pemilik folder. Izin OAuth harus dapat membuat file di folder tujuan; simpan refresh token dari akun tersebut di server. URL folder saja tidak memberikan izin unggah. Jangan masukkan kredensial atau refresh token ke source, HTML, APK, atau chat.
2. Tambahkan ketiga **secret** berikut di Cloudflare Worker `jokiin-payment-api`: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`. Pastikan token memiliki izin Drive yang sesuai dan akun tersebut dapat menulis ke folder tujuan.
3. Deploy `src/worker.js`, lalu deploy `index.html` beserta file web terkait. Jalur checkout akan membuat pesanan dan mengunggah lampiran ke Drive sebelum membuka halaman pembayaran. Jika Drive gagal, checkout menampilkan error dan tidak menganggap lampiran terkirim.
4. Build dan pasang aplikasi Android baru setelah perubahan di source `jokiin-admin-android`. Buka menu **Folder Lampiran** untuk mengubah link setiap hari. Menu tersebut membaca dan menyimpan `site_settings.task_upload_drive_folder`, yang dibatasi RLS untuk admin.

File maksimal 10 dengan ukuran gabungan 50 MB. Endpoint Worker mengulangi pemeriksaan jumlah dan ukuran. Nama dan link hasil unggah disimpan dalam `payment_orders.task.attachments` dan akan tersalin ke `orders.task` ketika pembayaran berubah menjadi PAID. Pada transaksi yang sudah PAID sebelum perubahan ini, lampiran lama yang tidak pernah diunggah tidak dapat dipulihkan dari browser.

**Batasan operasional:** unggah 50 MB dari jaringan seluler perlu pengujian langsung pada akun dan batas paket Cloudflare. Jika akun Google OAuth tidak diberi akses tulis ke folder, Worker mengembalikan kegagalan dan pembeli perlu menghubungi admin. Uji dengan file kecil terlebih dahulu sebelum transaksi nyata.
