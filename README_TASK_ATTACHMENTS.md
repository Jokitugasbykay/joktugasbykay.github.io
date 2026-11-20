# Lampiran pesanan: Cloudflare R2 ke Google Drive

Target alurnya: customer mengunggah file lewat form checkout, Worker menyimpan file secara privat ke bucket `jokiin-task-attachments`, lalu menyalin file ke subfolder tanggal di Google Drive admin. Catatan lampiran dan status sinkronisasi disimpan pada `payment_orders.task.attachments`.

## Konfigurasi

1. Bucket R2 `jokiin-task-attachments` dibuat di lokasi APAC. Binding Worker bernama `TASK_ATTACHMENTS` didefinisikan di `wrangler.jsonc`.
2. Worker perlu secret Google Drive yang sudah ada: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`. Refresh token harus milik akun dengan izin tulis ke folder Drive tujuan. Akun service hanya dapat mengunggah ke Shared Drive.
3. Admin menyimpan URL folder utama melalui tab **Folder Lampiran** di `/admin/`. Worker membuat subfolder tanggal WIB.
4. Deploy Worker beserta frontend checkout. File dibatasi 10 file per pesanan, ukuran gabungan 50 MB, dan format PDF, DOC, DOCX, ZIP, JPG, JPEG, PNG.

Jika Drive sedang gagal, lampiran tetap tersimpan di R2 dan diberi status `pending`; endpoint admin `POST /api/sync-task-attachment` dapat mencoba sinkronisasi ulang dengan bearer token akun admin Supabase dan body `{ "order_id": "...", "attachment_id": "..." }`.

R2 memiliki kuota gratis bulanan; pemakaian di atas kuota ditagih berdasarkan tarif Cloudflare. Uji unggah file kecil melalui checkout sebelum digunakan customer.

## Status penerapan

Bucket sudah dibuat dan backend lokal sudah memiliki binding serta endpoint R2. Form produksi masih menampilkan keadaan lama **Dalam Perbaikan**: `jokiin.my.id` menyajikan storefront legacy yang berbeda dari halaman Next.js di repo ini. Karena sumber aktif storefront tidak ada di checkout ini, perubahan belum di-deploy agar tidak menimpa website dengan halaman migrasi yang keliru.
