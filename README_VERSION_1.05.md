# JOKIIN-WEBSITE version 1.05

## Detail Pesanan

Penutupan popup mobile tidak lagi menjalankan history.back() secara asinkron. Ini mencegah popup detail yang baru dibuka ikut tertutup. Detail dapat digulir sampai tombol invoice dan ditutup kembali tanpa mengunci halaman permanen.

## Invoice

- Halaman cetak tersedia di /invoice/?order=NOMOR_ORDER pada domain yang sama. Folder invoice harus disertakan saat deployment.
- Tombol Cetak Invoice pada detail/preview membuka halaman invoice terpisah dengan noopener. Klik Cetak Invoice di halaman tersebut untuk membuka dialog print. Tidak ada pemanggilan print otomatis dari halaman utama.
- Data diambil melalui API pelacakan dan invoice hanya tersedia untuk pembayaran PAID.
- Tata letak mengikuti contoh workplace: identitas dua kolom, tanggal DD/MM/YYYY, tabel, subtotal, Nilai PPN (0%), Total Akhir, dan ucapan terima kasih.
- Diskon atau biaya yang tidak nol tetap ditampilkan agar rincian pembayaran tidak hilang.
- Nama admin memakai Tim JOKI.IN karena API publik saat ini tidak mengirim nama admin pengambil pekerjaan. Tidak menggunakan nama admin rekaan.
- CSS cetak A4 memakai margin halaman nol dengan padding pada dokumen untuk menghindari ruang header/footer browser. Tanggal, judul tab, dan about:blank tidak ditambahkan oleh template. Header/footer yang dipaksakan browser atau driver tetap dikontrol pengaturan print browser; nonaktifkan Headers and footers bila masih muncul.
- about:blank diganti URL invoice domain website, bukan teks URL palsu.

## Promo Mobile

Label Promo Terbatas dan tombol Klaim Promo ada di baris atas, dengan slot X terpisah. Running text memuat pesan promo, kode kupon, dan diskon. Timer ada di bawah garis pembatas. Tinggi normal sekitar 114 px. Running text berhenti saat fokus/hover dan berubah menjadi teks statis pada reduced motion. Promo kosong atau kedaluwarsa tetap disembunyikan.

## Verifikasi

Pengujian browser lokal memakai fixture API: alur pelacakan, detail, invoice, dan penutupan pada 320/375 px; invoice read-only; rute invoice dengan opener null; tata letak cetak dan PDF A4; halaman utama tetap interaktif ketika tab invoice terbuka; promo ringkas dan tidak tumpang tindih; regresi navbar, layanan, dan katalog.

Dialog printer sistem pada perangkat pengguna belum diuji langsung. Tidak ada perubahan deployment produksi otomatis.
