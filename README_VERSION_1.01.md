# JOKIIN-WEBSITE version 1.01

Invoice dan Cetak Invoice tersedia di Detail Pesanan setelah status pembayaran PAID. Data berasal dari pesanan, tanpa form edit manual. Layout mengikuti template invoice yang diberikan. Total dibayar mengikuti transaksi termasuk diskon dan biaya; PPN tidak ditambahkan tanpa data pajak transaksi. Cetak tidak berjalan otomatis ketika status berubah: pelanggan memilih Cetak Invoice.

Perbaikan: klik rekomendasi tidak lagi ditangkap sebagai swipe, popup layanan dapat digulir, halaman belakang terkunci saat popup terbuka, promo mobile mempertahankan seluruh pesan, panduan pemesanan dan informasi diperbarui, ikon utama menggunakan Lucide lokal.

## Google Drive

Deploy backend `src/worker.js` dengan `wrangler.jsonc`. Salinan `worker.js` disamakan agar tidak memakai backend lama yang belum mendukung upload. Secret tetap di Cloudflare, bukan di frontend.

Untuk My Drive pribadi, isi GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN dari OAuth akun pemilik folder dengan scope https://www.googleapis.com/auth/drive. Aktifkan Drive API dan simpan folder tujuan melalui pengaturan admin. Refresh token harus memiliki akses offline; aplikasi OAuth mode Testing dapat memiliki token yang kedaluwarsa.

Untuk Shared Drive organisasi, GOOGLE_SERVICE_ACCOUNT_JSON dapat digunakan jika service account memiliki izin menambah file pada Shared Drive. Membagikan folder My Drive pribadi kepada service account saja tidak menyediakan kuota storage.

Jika OAuth dan service account sama-sama tersedia, OAuth diprioritaskan. Backend memeriksa akses folder, jenis penyimpanan dan ukuran file. Maksimal 10 file dengan total 50 MB. Pelanggan tidak perlu login Google.

Dokumentasi: https://developers.google.com/workspace/drive/api/guides/about-shareddrives

Upload produksi tetap memerlukan secret dan folder server yang benar. Paket ini tidak mengubah konfigurasi akun Cloudflare/Google atau menerbitkan website.
