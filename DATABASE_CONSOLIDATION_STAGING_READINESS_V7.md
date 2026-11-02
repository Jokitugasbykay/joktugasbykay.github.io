# DATABASE CONSOLIDATION STAGING READINESS V7: ISOLATED STAGING ENVIRONMENT & TEST PLAYBOOK - JOKI.IN (SUPABASE)

Dokumen ini merupakan laporan penilaian kesiapan lingkungan staging terisolasi (Staging Environment Readiness Assessment V7) untuk pengujian terkontrol draf migrasi **Paket A (`promo_settings` -> `site_settings`)** berdasarkan dokumen arsitektur acuan:
- [DATABASE_CONSOLIDATION_EXECUTION_PLAN_V4.md](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/DATABASE_CONSOLIDATION_EXECUTION_PLAN_V4.md)
- [DATABASE_CONSOLIDATION_SQL_REVIEW_V5.md](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/DATABASE_CONSOLIDATION_SQL_REVIEW_V5.md)
- [DATABASE_CONSOLIDATION_SQL_REVIEW_V6.md](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/DATABASE_CONSOLIDATION_SQL_REVIEW_V6.md)

Laporan ini menyajikan inspeksi menyeluruh terhadap status proyek Supabase produksi, analisis kelayakan fitur Database Branching, perbandingan runtime alternatif, rancangan isolasi data sintetis, serta test plan komprehensif yang siap dieksekusi begitu lingkungan staging disetujui.

Mode Operasi Sesi Ini: **READ-ONLY murni**. Tidak ada branch yang dibuat/dihapus, tidak ada proyek baru yang dibuat, dan tidak ada DDL/DML yang dijalankan ke database produksi Supabase. Seluruh protected objects (`user_roles`, `reviews`, `review_helpful_votes`, `products`, `services`, `payments`, `operational_settings`) dan tabel finansial tetap terlindungi 100%. Paket B (`user_buy_limits`) tetap berstatus **KEEP AS-IS**.

---

## 1. INSPEKSI LINGKUNGAN SUPABASE (SUPABASE ENVIRONMENT AUDIT)

Audit metadata proyek Supabase aktif dilakukan secara terprogram menggunakan koneksi Supabase MCP:

### A. Informasi Proyek Produksi
- **Project ID**: `xdbnwjvxqtpkoaigedsk`
- **Project Name**: `Jokitugasbykay's Project`
- **Region**: `ap-southeast-2` (Sydney)
- **Database Engine**: PostgreSQL 17.6.1.166 (Release Channel: `ga`)
- **Status Database**: `ACTIVE_HEALTHY`
- **Organization ID**: `swzbypchceevurtjxzbl`
- **Host Produksi**: `db.xdbnwjvxqtpkoaigedsk.supabase.co`

### B. Audit Status Database Branching & Hasil `list_branches`
- Pemanggilan alat `list_branches` terhadap proyek `xdbnwjvxqtpkoaigedsk` mengembalikan respons:
  `{"branches": []}`
- **Interpretasi Teknis**:
  Hasil array kosong (`[]`) menunjukkan bahwa **saat ini belum ada branch aktif** yang dibuat di proyek ini. Hal ini **bukan berarti fitur branching tidak didukung atau dilarang oleh infrastruktur**, melainkan menunjukkan bahwa fitur tersebut belum pernah diaktifkan atau belum ada branch ephemeral/persistent yang sedang berjalan.

### C. Karakteristik Supabase Database Branching (Bila Diaktifkan)
Berdasarkan dokumentasi resmi arsitektur Supabase Branching:
1. **Replikasi Skema Otomatis**:
   Setiap branch baru secara otomatis mengompilasi dan menerapkan seluruh histori migrasi yang ada pada repositori (`./supabase/migrations`), skema database, functions, triggers, dan extensions.
2. **Data-less by Default (Perlindungan Privasi Otomatis)**:
   Secara arsitektural, Supabase Branching **tidak menyalin data transaksi atau data pengguna produksi**. Branch yang baru dibuat berstatus bersih (data-less). Hal ini secara inheren mencegah kebocoran informasi pribadi (PII) atau transaksi pelanggan ke lingkungan pengujian.
3. **Isolasi Penuh Kredensial dan Endpoint**:
   Setiap branch menerima:
   - Host basis data terpisah (instance compute tersendiri).
   - URL PostgREST tersendiri (misal: `https://<branch-ref>.supabase.co`).
   - Kredensial API mandiri (`anon_key` dan `service_role_key` khusus branch tersebut).
   - Kredensial produksi tidak pernah digunakan atau diekspos di dalam branch.

### D. Estimasi Biaya (Branching Pricing & Quota)
- **Biaya Pokok**: Tidak ada biaya flat bulanan untuk membuat branch.
- **Pay-as-you-go Compute**: Supabase mengenakan biaya komputasi berbasis waktu penggunaan aktif per jam.
  - Tipe Micro Compute default dibebankan sekitar **$0.01344 per jam** (sekitar ~$0.32 per hari jika dibiarkan aktif 24 jam).
  - Untuk pengujian staging ephemeral (Preview Branch) yang hanya berjalan selama sesi pengujian (misal 1 hingga 2 jam) kemudian langsung dihapus, total biaya komputasi tambahan berada di bawah **$0.05 (kurang dari Rp1.000)**.
- **Catatan Penagihan**: Compute hours untuk branching tidak dipotong dari kuota kredit $10 Pro plan, melainkan ditambahkan ke tagihan penggunaan organisasi ("Branching Compute Hours").

---

## 2. PENILAIAN KEAMANAN STAGING (STAGING SAFETY ASSESSMENT)

Pengujian Paket A dapat dilakukan dengan jaminan isolasi total tanpa memengaruhi sistem produksi dengan parameter batas berikut:

1. **Tanpa Perubahan Skema Produksi**: Seluruh DDL migrasi dan view hanya diaplikasikan pada instance staging. Skema produksi `xdbnwjvxqtpkoaigedsk` tetap 100% perawan.
2. **Tanpa Perubahan Data Produksi**: Operasi INSERT, UPDATE, dan DELETE pengujian hanya terjadi pada basis data staging.
3. **Tanpa Perubahan Kredensial Produksi**: Token `SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY` produksi tidak disentuh dan tidak diubah.
4. **Tanpa Perubahan Routing Domain atau Worker Produksi**: Domain aktif (`jokiin.my.id`) dan Cloudflare Worker produksi tetap terhubung ke endpoint produksi asli. Tidak ada modifikasi DNS atau rute worker.
5. **Tanpa Perubahan Git Branch Utama**: Dilarang melakukan commit, merge, atau push ke branch `main`, `master`, atau `Comit-7`.
6. **Protokol Data Sintetis (Zero Production Data Leakage)**:
   Lingkungan staging hanya akan diisi dengan data pengujian sintetis yang dibuat secara terprogram:
   - **Tabel `public.site_settings` Sintetis**:
     - `task_upload_drive_folder`: `{"folder_id": "dummy_test_folder", "folder_url": "https://drive.google.com/test"}`
     - `home_promo`: `{"active": true, "coupon": "TESTPROMO", "discount_percent": 10}`
   - **Tabel `public.promo_settings` Sintetis**:
     - `catalog_url`: `"https://staging.jokiin.test"`
     - `promo_judul`: `"Penawaran Spesial Uji Coba"`
     - `promo_deadline`: `"2026-12-31T23:59:59.000Z"`
     - `penawaran_spesial_aktif`: `"false"`
   - **Tabel `public.profiles` Sintetis**:
     - 1 Admin Test: `id = '00000000-0000-0000-0000-000000000001'`, `role = 'admin'`
     - 1 Customer Test: `id = '00000000-0000-0000-0000-000000000002'`, `role = 'user'`
   - **Dilarang Keras** menyalin email asli pelanggan, nomor WhatsApp asli, data pesanan, ulasan, atau transaksi Mayar ke staging.

---

## 3. EVALUASI RUNTIME ALTERNATIF (ALTERNATIVE RUNTIME ANALYSIS)

Jika Supabase Database Branching tidak dipilih, berikut adalah analisis perbandingan opsi runtime alternatif beserta keterbatasannya:

| Runtime Alternatif | Ketersediaan di Lingkungan Saat Ini | Evaluasi Supabase Auth & RLS | Evaluasi PostgREST (HTTP API) | Evaluasi Triggers & SECURITY DEFINER | Rekomendasi & Kelayakan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Opsi 1: Supabase Database Branching** | **Tersedia via Dashboard / API** (Tinggal provisioning) | **100% Identik**. Auth schema, RLS, JWT claim `request.jwt.claim.role` terpasang penuh. | **100% Identik**. Native PostgREST endpoint dengan headers representation. | **100% Identik**. Full engine PostgreSQL 17 dengan context switching presisi. | **PILIHAN TERBAIK (Sangat Disarankan)** |
| **Opsi 2: Supabase Project Terpisah (Dedicated Project)** | **Perlu Dibuat** (Perlu alokasi slot proyek baru) | **100% Identik**. Mendukung penuh schema auth dan RLS. | **100% Identik**. PostgREST mandiri. | **100% Identik**. Engine PostgreSQL 17 Supabase. | **LAYAK (Alternatif Resmi)** |
| **Opsi 3: PostgreSQL Disposable (Local Docker Container)** | **Belum Terpasang** (Docker/psql tidak ada di workstation) | **Terbatas**. Harus membuat skema `auth` tiruan dan fungsi mock `auth.uid()` / `auth.role()`. | **Tidak Ada**. Tidak bisa menguji pemanggilan HTTP PostgREST tanpa setup PostgREST terpisah. | **Layak Teknis**. Mesin PostgreSQL 17 mendukung trigger dan SECURITY DEFINER. | **TERBATAS (Memerlukan Instalasi Docker)** |
| **Opsi 4: PGlite (In-Memory WASM PostgreSQL)** | **Dapat Diinstal via NPM** | **Sangat Terbatas**. Tidak ada sistem session JWT Supabase. | **TIDAK ADA**. PGlite hanya mengeksekusi SQL raw via JS, tidak mendukung PostgREST. | **Parsial**. Mendukung PL/pgSQL tetapi berjalan dalam single-user process context. | **TIDAK DIREKOMENDASIKAN (Tidak Setara)** |

### Peringatan Kritis Mengenai PGlite:
PGlite **TIDAK SETARA** dengan lingkungan Supabase produksi. PGlite tidak memiliki web server PostgREST, tidak memproses header HTTP `Prefer: return=representation`, tidak memiliki middleware autentikasi JWT, dan tidak dapat memvalidasi apakah PostgREST menerjemahkan HTTP PATCH menjadi UPDATE trigger secara benar. Mengandalkan PGlite sebagai bukti kesiapan produksi adalah cacat metodologi pengujian.

---

## 4. TEST PLAN PAKET A (COMPREHENSIVE TEST PLAYBOOK)

Begitu lingkungan staging terisolasi disetujui dan disiapkan, serangkaian 11 pengujian otomatis berikut akan dijalankan:

### Matriks Rencana Pengujian Paket A:

| ID Uji | Target Pengujian | Metode Eksekusi | Payload / Parameter Uji | Ekspektasi Hasil & Indikator Lolos |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Compatibility View SELECT | PostgREST GET via curl / HTTP | `GET /rest/v1/promo_settings?key=in.(penawaran_spesial_aktif,promo_judul,promo_deadline)&select=key,value` | HTTP 200 OK. Mengembalikan array JSON 3 objek dengan kolom `key` dan `value` string teks murni. |
| **TC-02** | PATCH via PostgREST oleh Admin Sah | PostgREST PATCH via curl / HTTP | Header: `Authorization: Bearer <jwt_admin>`. Body: `{ "value": "true", "updated_at": "..." }` pada `key=eq.penawaran_spesial_aktif` | HTTP 204/200. Baris fisik di `site_settings` terbarui dengan nilai JSON boolean `true`. |
| **TC-03** | INSTEAD OF UPDATE dengan Return Representation | PostgREST PATCH via curl / HTTP | Header: `Prefer: return=representation`. Body: `{ "value": "2026-12-31T00:00:00.000Z" }` pada `key=eq.promo_deadline` | HTTP 200 OK. Respon memuat JSON objek baris yang diperbarui lengkap dengan timestamp baru. |
| **TC-04** | Penolakan Akses Pengguna Anonim (Anon) | PostgREST PATCH via curl / HTTP | Header: `apikey: <anon_key>` (tanpa Bearer JWT). Target: `key=eq.penawaran_spesial_aktif` | HTTP 401/403 Forbidden. Permintaan ditolak di tingkat gateway atau RLS view sebelum memutasi data. |
| **TC-05** | Penolakan Pelanggan Biasa (`role = 'user'`) | PostgREST PATCH via curl / HTTP | Header: `Authorization: Bearer <jwt_customer>`. Target: `key=eq.penawaran_spesial_aktif` | HTTP 403 Forbidden. Exception `PERMISSION_DENIED: Akses ditolak. Hanya admin terverifikasi...`. |
| **TC-06** | Otorisasi Service Role Backend | PostgREST PATCH via curl / HTTP | Header: `Authorization: Bearer <service_role_key>`. Target: `key=eq.promo_judul` | HTTP 204/200 Success. Pembaruan sukses dilakukan oleh Edge Function simulator. |
| **TC-07** | Penegakan Whitelist Kunci Promo | PostgREST PATCH via curl / HTTP | Target: `key=eq.home_promo` atau `key=eq.task_upload_drive_folder` | 0 rows affected atau HTTP 400 Exception `INVALID_KEY`. Kunci sensitif tidak berubah sama sekali. |
| **TC-08** | Penanganan Kunci Tidak Ada (Not Found) | PostgREST PATCH via curl / HTTP | Target: `key=eq.kunci_palsu_random` | HTTP 204 No Content (0 rows affected) tanpa error sistem database. |
| **TC-09** | Pembuktian Rollback Zero Data Loss | SQL Script Execution di Staging | 1. Admin mengubah promo ke `true` di View.<br>2. Eksekusi Rollback V6 (`LOCK TABLE IN EXCLUSIVE MODE` + sync-back). | Tabel fisik asli `promo_settings` pulih dan memuat nilai `true` mutakhir hasil mutasi runtime. |
| **TC-10** | Simulasi Konkurensi & Lock Timeout | Transaksi Terpisah (Koneksi Ganda) | Transaksi 1 menahan lock eksklusif. Transaksi 2 menjalankan migrasi dengan `lock_timeout = '2s'`. | Transaksi 2 membatalkan diri secara aman (SQLSTATE 55P03) dalam 2 detik tanpa membuat sistem hang. |
| **TC-11** | Penyegaran PostgREST Schema Cache | PostgREST GET setelah NOTIFY | Jalankan `NOTIFY pgrst, 'reload schema'` setelah DDL View dibuat. | PostgREST langsung mengenali perubahan objek seketika tanpa jeda 500/503. |

---

## 5. REKOMENDASI GO / NO-GO UNTUK PEMBUATAN STAGING

### Rekomendasi Resmi: **GO FOR STAGING PROVISIONING**

Stelle merekomendasikan untuk melanjutkan ke tahap **Pembuatan Lingkungan Staging Terisolasi** dengan ketentuan:

1. **Metode Terpilih**: Mengaktifkan **Supabase Database Branching** (Preview Branch ephemeral) pada proyek `xdbnwjvxqtpkoaigedsk`.
   - Memberikan jaminan 100% kesetaraan arsitektural dengan mesin produksi (PostgreSQL 17, PostgREST, RLS, Auth).
   - Biaya sangat efisien (< $0.05 untuk durasi pengujian).
   - Otomatis terisolasi dari data produksi (data-less).
2. **Batasan Mutlak Sebelum Persetujuan**:
   - Sesuai pembatasan operasi, Stelle **TIDAK AKAN** membuat branch atau menjalankan skrip provisioning apa pun sebelum mendapatkan izin tertulis eksplisit dari Kayla.
   - Database produksi tetap berada dalam status aman tidak tersentuh.

---

## 6. STATUS OBJEK TERLINDUNGI (PROTECTED OBJECTS PRESERVATION)

Seluruh objek berikut tetap berada di luar cakupan pekerjaan dan terkonfirmasi tidak akan tersentuh:
- `public.user_roles` (PROTECTED TABLE)
- `public.reviews` (PROTECTED TABLE)
- `public.review_helpful_votes` (PROTECTED TABLE)
- `public.products` (KEEP PHYSICAL TABLE)
- `public.services` (KEEP PHYSICAL TABLE)
- `public.payments` (KEEP PHYSICAL TABLE)
- `public.operational_settings` (KEEP PHYSICAL TABLE)
- Tabel finansial: `payment_orders`, `orders`, `order_items`, Mayar checkout webhook.
- Paket B (`user_buy_limits`): **KEEP AS-IS (0 baris)**.

---

*Dokumen kesiapan staging V7 ini disusun oleh Stelle dalam mode Read-Only Database dan Read-Only Repository. DILARANG membuat branch, menjalankan DDL/DML, atau memodifikasi database produksi tanpa persetujuan eksplisit dari Kayla.*
