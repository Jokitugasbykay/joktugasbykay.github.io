# JOKIIN-WEBSITE version 1.02

## Revisi UI

- Bentuk, urutan tab, dan perilaku navbar pill dipertahankan. Perhitungan posisi indikator aktif memperhitungkan border dan titik awal indikator. Ukuran diperbarui setelah font selesai dimuat dan navbar berubah ukuran. Tab aktif yang berada di luar area scroll dibawa kembali ke area terlihat.
- Tombol X welcome popup disembunyikan khusus viewport maksimal 760px. Tombol desktop tetap tersedia. Popup mobile tetap dapat ditutup lewat CTA, area luar popup, atau navigasi kembali. Konten kanan dapat digulir jika ruang sempit.
- Promo lebih ringkas, tanpa tombol neon dan kotak hitung mundur besar. Seluruh pesan tetap tampil. Diskon 0%, kupon kosong, dan promo kedaluwarsa tidak ditampilkan.
- Dua belas ikon ilustrasi baru disimpan sebagai sprite PNG transparan lokal di assets/service-icons.png. Dipakai pada kategori beranda, Bantuan, kartu testimoni, dan detail layanan. Bintang dekoratif/fallback sparkles dihapus; rating ulasan asli tetap berfungsi.
- Popup Lihat Detail layanan memakai heading dengan ilustrasi, nama dan harga. Deskripsi, cakupan, pengecualian, estimasi, revisi dan Checkout dipertahankan. Pengecualian kosong tidak meninggalkan heading kosong.

## Validasi

Playwright dengan fixture API lokal: posisi indikator navbar di 1440/375/320px dalam kedua tema, welcome mobile/desktop, kondisi promo aktif/kosong/kedaluwarsa, ilustrasi kategori/testimoni, popup layanan, penguncian scroll, checkout rekomendasi, invoice Paid/Pending dan jendela cetak. Tidak ada pageerror pada pengujian ini.

Pengujian ini bukan transaksi pembayaran atau upload Google Drive produksi. Ketentuan konfigurasi Drive versi 1.01 masih berlaku.

## Catatan Penerusan

Basis: versi 1.01. Perubahan terpusat di index.html, assets/order-improvements.js, assets/ui-refinements.js, assets/ui-refinements.css dan assets/service-icons.png. Tidak ada migrasi database atau perubahan protokol realtime pada revisi UI ini. Navbar tidak boleh diganti keseluruhan. Secret Google/Cloudflare tetap dikonfigurasi di server.

Jika meneruskan: gunakan assets/service-icons.png untuk ilustrasi konsisten dan pertahankan hook updateServicePresentation ketika data layanan dimuat ulang. Uji dua tema dan viewport sempit setelah perubahan CSS. Detail deployment dan Google Drive ada di README_VERSION_1.01.md.
