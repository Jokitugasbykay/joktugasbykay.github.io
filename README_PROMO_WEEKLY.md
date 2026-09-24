# Promo mingguan JOKI.IN

Sumber ini menyiapkan promo satu kampanye untuk setiap periode berjalan tujuh hari. Perubahan belum diterapkan ke server atau dipublikasikan.

## Urutan aktivasi setelah persetujuan publikasi

1. Tinjau dan jalankan `workplace/supabase/promo-weekly.sql` pada proyek Supabase yang benar. Skrip menormalkan promo lama, membatasi perubahan promo ke RPC admin, dan menghitung ulang diskon produk serta kode promo pada checkout reguler.
2. Perbarui Edge Function `jokiin-api` dari `website/supabase/functions/jokiin-api/index.ts`. Perubahan ini memberikan pesan jelas ketika promo kedaluwarsa.
3. Publikasikan Worker dari `website/src/worker.js` (salinan `website/worker.js` identik) serta website `website/index.html` dalam satu rilis. Worker adalah sumber validasi kode untuk tampilan dan checkout Mayar.
4. Bangun dan bagikan aplikasi Android versi 1.5.3 dari folder `workplace` setelah langkah di atas.

Jangan membalik urutan: Worker baru memerlukan `starts_at` yang dibuat migrasi; aplikasi baru memerlukan RPC `jokiin_manage_promo`. Website lama memiliki kode promo tetap yang bisa menampilkan diskon berbeda dari backend baru.

Saat admin memilih **Buat promo**, promonya disimpan sebagai draft. Mengaktifkannya memulai tujuh hari hitung mundur. Admin dapat mengedit dan menonaktifkan kampanye yang sama selama periode ini. Database menolak pembuatan kampanye lain sampai tujuh hari berlalu. Website hanya menampilkan kampanye aktif yang belum kedaluwarsa. Potongan kode berlaku atas subtotal setelah diskon produk, diperiksa ulang oleh server ketika checkout.

Pengujian lokal: `node --test website/tests/*.test.cjs`. Gradle dan Android SDK diperlukan untuk membangun APK; APK belum dibuat di lingkungan ini.
