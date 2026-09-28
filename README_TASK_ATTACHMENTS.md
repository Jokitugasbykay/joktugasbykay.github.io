# Lampiran pesanan ke Google Drive

Perubahan kode ini belum aktif sampai Worker dan aset situs di-deploy. Link yang disimpan pada `site_settings.task_upload_drive_folder` harus berupa folder utama penampung, bukan folder tanggal tertentu.

## Aktivasi

1. Siapkan Google Drive API OAuth milik akun pemilik folder. Izin OAuth harus dapat membuat file di folder tujuan; simpan refresh token dari akun tersebut di server. URL folder saja tidak memberikan izin unggah. Jangan masukkan kredensial atau refresh token ke source, HTML, APK, atau chat.
2. Untuk folder di **My Drive** akun Google pribadi, gunakan OAuth akun pemilik dengan tiga secret Cloudflare: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`. Refresh token harus memiliki izin Drive yang sesuai. Worker memilih OAuth jika ketiganya tersedia.
3. Service account dengan secret `GOOGLE_SERVICE_ACCOUNT_JSON` hanya cocok untuk folder di **Shared Drive** yang memberi akses tulis. Membagikan folder My Drive ke email service account sebagai Editor tidak memberi service account kuota untuk membuat file atau subfolder.
4. Deploy `src/worker.js`, lalu deploy `index.html` beserta file web terkait. Jalur checkout akan membuat pesanan dan mengunggah lampiran ke Drive sebelum membuka halaman pembayaran. Jika Drive gagal, checkout menampilkan error dan tidak menganggap lampiran terkirim.
5. Buka halaman `admin/`, pilih tab **Folder Lampiran**, lalu simpan link folder utama. Sistem akan membuat atau memakai subfolder tanggal hari ini otomatis memakai zona waktu WIB, sehingga link tidak perlu diganti setiap hari. Menu tersebut membaca dan menyimpan `site_settings.task_upload_drive_folder`, yang dibatasi untuk admin.

File maksimal 10 dengan ukuran gabungan 50 MB. Endpoint Worker mengulangi pemeriksaan jumlah dan ukuran. Nama dan link hasil unggah disimpan dalam `payment_orders.task.attachments` dan akan tersalin ke `orders.task` ketika pembayaran berubah menjadi PAID. Pada transaksi yang sudah PAID sebelum perubahan ini, lampiran lama yang tidak pernah diunggah tidak dapat dipulihkan dari browser.

**Batasan operasional:** unggah 50 MB dari jaringan seluler perlu pengujian langsung pada akun dan batas paket Cloudflare. Jika akun Google OAuth atau service account tidak diberi akses tulis ke folder utama, Worker mengembalikan kegagalan yang menjelaskan tindakan perbaikannya. Uji dengan file kecil terlebih dahulu sebelum transaksi nyata.
