# JOKIIN-WEBSITE version 1.06

## Promo Mobile

Promo kini memiliki tiga bagian, tanpa pengulangan elemen lama:

1. Promo Terbatas di kiri, Klaim Promo di kanan, dan X pada slot terpisah paling kanan.
2. Satu baris running text berisi pesan promo, kode kupon, dan diskon persen.
3. Garis pembatas lalu countdown di bawahnya.

Tinggi normal 102 px pada viewport 320, 375, 560, dan 760 px. Tidak ada kotak kupon atau diskon tambahan di mobile. Garis merah/ungu sketsa dipakai sebagai panduan tata letak, bukan warna dekorasi final.

Marquee mengadaptasi pola grup identik dari CodeFronts Feature / USP Text Ticker: dua grup flex dengan translateX(calc(-100% - gap)), loop kontinu, kecepatan melambat saat hover, serta fallback teks statis dan salinan tersembunyi untuk prefers-reduced-motion. Tidak menggunakan SVG bintang sebagai separator.

Referensi: https://codefronts.com/motion/css-infinite-marquee/feature-usp-text-ticker/

Aturan promo dan struktur komponennya disertakan dalam index.html supaya tidak bergantung pada keberhasilan pemuatan mobile-fixes.css. Pengujian memblokir stylesheet tambahan tersebut untuk memastikan elemen promo lama tetap tidak muncul.

Invoice, navbar, harga, dan data pesanan tidak diubah pada revisi ini. Deployment produksi tetap dilakukan oleh pemilik website.
