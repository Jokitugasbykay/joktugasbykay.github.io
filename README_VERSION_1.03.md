# JOKIIN-WEBSITE version 1.03

## Perbaikan gambar

- Ikon kategori menggunakan PNG lokal terpisah, bukan sprite yang bergantung pada background CSS.
- Ikon alur status menggunakan SVG lokal, termasuk Sedang Dikerjakan dan Hasil Dikirim.
- Ikon dinamis memiliki fallback SVG lokal.
- Foto katalog dipetakan berdasarkan slug layanan. Semua 19 layanan aktif menggunakan foto berbeda.
- Desain Poster menggunakan portfolio-13.jpg: proses desain dengan tablet dan swatch warna, bukan buku.
- Cache versi stylesheet dan script perbaikan diperbarui. Bentuk navbar tidak diubah.

## Pesanan dummy Supabase

Lima pesanan berikut sudah dimasukkan dan dibaca kembali untuk verifikasi:

| Nomor pesanan | Pembayaran | Pengerjaan |
| --- | --- | --- |
| NUG-20260929-DUMMY01 | PAID | pending |
| NUG-20260929-DUMMY02 | PAID | pending |
| NUG-20260929-DUMMY03 | PAID | pending |
| NUG-20260929-DUMMY04 | PAID | completed, ditugaskan ke admin |
| NUG-20260929-DUMMY05 | PAID | completed, ditugaskan ke admin |

Semua nominal Rp0 dan ditandai is_dummy. Ini simulasi status, bukan transaksi pembayaran atau pekerjaan sungguhan. Tidak ada email pelanggan, kontak pelanggan, atau file hasil nyata. Pesanan dibuat sebagai tamu; gunakan nomor pesanan untuk pelacakan, bukan daftar pesanan akun pribadi.

SQL tersedia di database/dummy_orders_v1.03.sql. Menjalankan ulang tidak menggandakan nomor pesanan yang sama.

## Verifikasi

Pengujian browser memakai fixture 19 layanan aktif: aset ikon berhasil dimuat, foto katalog tersedia dan unik, serta foto poster sesuai. Pengujian regresi meliputi checkout rekomendasi, invoice Paid/read-only/cetak, penguncian scroll modal, navbar pada 1440/375/320 px dalam kedua tema, popup welcome, dan promo aktif/kosong/kedaluwarsa.

Upload Google Drive produksi belum diverifikasi menggunakan kredensial server. Perbaikan sebelumnya tetap disertakan.
