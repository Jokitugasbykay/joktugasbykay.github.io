# DATABASE CONSOLIDATION SQL REVIEW V5: INDEPENDENT TECHNICAL & SECURITY AUDIT - JOKI.IN (SUPABASE)

Dokumen ini merupakan hasil tinjauan teknis dan keamanan independen (Technical & Security Review V5) terhadap seluruh draf SQL pada dokumen [DATABASE_CONSOLIDATION_EXECUTION_PLAN_V4.md](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/DATABASE_CONSOLIDATION_EXECUTION_PLAN_V4.md) untuk basis data Supabase JOKI.IN (`xdbnwjvxqtpkoaigedsk`), Cloudflare Worker, Supabase Edge Functions, Storefront Next.js, dan Workplace Admin.

Tinjauan ini dilakukan secara mendalam pada draf SQL aktual untuk mengidentifikasi celah keamanan, risiko kegagalan kompatibilitas PostgREST, risiko kehilangan data saat rollback, serta potensi contention kunci database.

Mode Operasi Sesi Ini: **READ-ONLY murni**. Tidak ada DDL, DML, atau migrasi yang dijalankan pada database produksi Supabase. Seluruh tabel terlindungi (`user_roles`, `reviews`, `review_helpful_votes`, `products`, `services`, `payments`, `operational_settings`) dan tabel finansial (`payment_orders`, `orders`, `order_items`) berada 100% di luar cakupan perubahan.

---

## 1. REVIEW SQL SETIAP PAKET

### A. Review Paket A (Konsolidasi `promo_settings` ke `site_settings`)

Draf SQL Paket A pada dokumen V4 mengusulkan pemindahan tabel fisik `public.promo_settings` ke `legacy_archive.promo_settings` dan menggantikannya dengan Compatibility View `public.promo_settings` yang didukung trigger `INSTEAD OF UPDATE`.

Hasil evaluasi baris-per-baris terhadap draf SQL Paket A:

1. **Inkonsistensi Tipe Data Awal vs Trigger**:
   - Pada draf awal V4, langkah penyalinan data mengonversi nilai `penawaran_spesial_aktif` menjadi tipe boolean JSONB:
     `CASE WHEN key = 'penawaran_spesial_aktif' THEN to_jsonb(value = 'true') ELSE to_jsonb(value) END`
   - Namun pada trigger `trg_compat_update_promo_settings`, pembaruan dilakukan secara generik:
     `value = to_jsonb(NEW.value)`
   - Karena payload dari Edge Function mengirimkan string (`"true"` atau `"false"`), pembaruan berikutnya akan menyimpan string JSONB (`"\"true\""`), bukan boolean.
   - Walaupun View dapat membaca keduanya, inkonsistensi tipe di `site_settings` berisiko menimbulkan anomali pada kueri JSONB langsung (`@>`, `?`, atau JSON path).
2. **Kelemahan Penanganan Kunci yang Tidak Ada (Missing Key Handling)**:
   - Trigger V4 mengeksekusi `UPDATE public.site_settings ... WHERE key = OLD.key;` dan langsung mengembalikan `RETURN NEW;`.
   - Jika baris pada `site_settings` tidak ditemukan (`NOT FOUND`), statement UPDATE mempengaruhi 0 baris, tetapi trigger tetap mengembalikan `NEW`. Hal ini membuat PostgREST mengasumsikan pembaruan sukses padahal tidak ada data yang berubah.
3. **Pemberian Hak Akses (Grants) Terlalu Luas**:
   - Draf V4 memberikan `GRANT UPDATE ON public.promo_settings TO anon`. Ini melanggar prinsip hak minimum (Least Privilege).

### B. Review Paket B (Evaluasi `user_buy_limits`)

Draf SQL Paket B pada dokumen V4 mengusulkan eksekusi DDL `ALTER TABLE public.user_buy_limits ENABLE ROW LEVEL SECURITY;` dan pembuatan ulang policy `service_role_only_buy_limits`.

Hasil evaluasi terhadap draf SQL Paket B:
1. **Tidak Ada Kebutuhan DDL**:
   - Audit metadata membuktikan bahwa `public.user_buy_limits` (0 baris) **sudah memiliki RLS aktif** dan policy `service_role_only_buy_limits` sudah terpasang.
   - Menjalankan DDL ulang pada tabel yang tidak aktif dan tidak memiliki consumer merupakan tindakan tanpa manfaat teknis (zero value) yang justru menambah risiko kegagalan DDL.
2. **Status Keputusan Paket B**:
   - **KEEP AS-IS (NO DDL NEEDED)**. Tabel fisik `user_buy_limits` dan `special_buy_limits` tetap dipertahankan persis seperti kondisi saat ini.

---

## 2. TEMUAN KEAMANAN (SECURITY AUDIT)

### Temuan 1: Pelanggaran Least Privilege pada Grants View (`GRANT UPDATE TO anon`)
- **Tingkat Keparahan**: SEDANG (Medium Risk)
- **Lokasi**: Langkah 8 Draf SQL Paket A V4.
- **Masalah**:
  Draf V4 menuliskan:
  `GRANT SELECT, UPDATE ON public.promo_settings TO authenticated, service_role, anon;`
  Memberikan hak `UPDATE` kepada peran `anon` (pengunjung tanpa login) adalah kesalahan konfigurasi keamanan. Walaupun di dalam trigger terdapat validasi otorisasi, PostgREST mengevaluasi izin tabel/view terlebih dahulu.
- **Koreksi Wajib**:
  Peran `anon` hanya boleh diberikan `SELECT`. Hak `UPDATE` hanya diberikan kepada `authenticated` dan `service_role`:
  ```sql
  GRANT SELECT ON public.promo_settings TO anon, authenticated, service_role;
  GRANT UPDATE ON public.promo_settings TO authenticated, service_role;
  REVOKE INSERT, DELETE, TRUNCATE ON public.promo_settings FROM PUBLIC, anon, authenticated;
  ```

### Temuan 2: Evaluasi Sesi Admin pada `SECURITY DEFINER`
- **Tingkat Keparahan**: RENDAH (Low Risk / Robustness)
- **Lokasi**: Fungsi `trg_compat_update_promo_settings`.
- **Masalah**:
  Trigger V4 mengevaluasi `auth.role() IS DISTINCT FROM 'service_role'`. Jika eksekusi dilakukan oleh sesi administratif langsung (misalnya user `postgres` atau `supabase_admin` melalui koneksi langsung / psql), `auth.role()` bernilai NULL dan `auth.uid()` bernilai NULL, sehingga update oleh DBA akan ditolak dengan `PERMISSION_DENIED`.
- **Koreksi Wajib**:
  Tambahkan pengecekan `current_user`:
  ```sql
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    -- Diizinkan (Sesi backend/DBA internal)
  ELSIF COALESCE(auth.role(), '') = 'service_role' THEN
    -- Diizinkan (Edge Function caller dengan Service Role)
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    -- Diizinkan (Admin terautentikasi)
  ELSE
    RAISE EXCEPTION 'PERMISSION_DENIED: Hanya admin yang diizinkan memperbarui promo_settings.';
  END IF;
  ```

### Temuan 3: Isolasi Search Path dan Schema Qualification
- **Status**: LOLOS (Secure).
- Fungsi trigger telah menetapkan `SET search_path = public, pg_temp;` dan memanggil tabel dengan kualifikasi skema penuh (`public.site_settings`), sehingga aman dari serangan pembajakan search path (search path hijacking).

### Temuan 4: Manipulasi Kunci melalui Payload PATCH
- **Status**: LOLOS (Secure).
- Trigger V4 mengunci pembaruan hanya pada `WHERE key = OLD.key`, dan memverifikasi `OLD.key` terhadap daftar whitelist 4 kunci promo (`catalog_url`, `penawaran_spesial_aktif`, `promo_deadline`, `promo_judul`).
- Penyerang tidak dapat mengubah kunci lain (seperti `home_promo` atau `task_upload_drive_folder`) melalui view `promo_settings`.

---

## 3. COMPATIBILITY ANALYSIS

### A. Kompatibilitas Operasi SELECT melalui PostgREST
Edge Function `jokiin-catalog` mengeksekusi kueri PostgREST:
`promo_settings?key=in.(penawaran_spesial_aktif,promo_judul,promo_deadline)&select=key,value`

- **Evaluasi View**:
  View mengembalikan kolom `key` (text), `value` (text), dan `updated_at` (timestamptz).
  Dengan ekspresi konversi:
  `CASE WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}') ELSE value::text END AS value`
  View menghasilkan string teks murni (`'false'`, `'Penawaran Spesial Minggu Ini'`, `'2026-10-29T17:00:00.000Z'`).
- **Hasil Uji Logika**: **100% KOMPATIBEL** dengan kode Edge Function baris 870 dan 1096.

### B. Kompatibilitas Operasi PATCH melalui Edge Function
Edge Function mengeksekusi:
`await dbFetch('promo_settings?key=eq.penawaran_spesial_aktif', 'PATCH', { value: String(body.aktif), updated_at: nowIso });`

- **Evaluasi PostgREST ke SQL**:
  PostgREST menerjemahkan HTTP PATCH menjadi perintah SQL:
  `UPDATE public.promo_settings SET value = $1, updated_at = $2 WHERE key = 'penawaran_spesial_aktif';`
- **Evaluasi Trigger**:
  Trigger `INSTEAD OF UPDATE` menangkap perintah ini per baris (`FOR EACH ROW`).
  Variabel `OLD.key` terisi dengan `'penawaran_spesial_aktif'`.
  Variabel `NEW.value` terisi dengan string `'true'` atau `'false'`.
  Trigger meneruskan pembaruan ke `public.site_settings`.
- **Hasil Uji Logika**: **KOMPATIBEL DENGAN CATATAN**:
  Trigger harus mengembalikan `RETURN NEW;` dengan nilai `NEW` yang valid agar PostgREST dapat merespons tanpa error.

### C. Return Representation pada PostgREST
- Jika pemanggil menyertakan header `Prefer: return=representation`, PostgreSQL menggunakan record `NEW` yang dikembalikan oleh trigger `INSTEAD OF UPDATE` untuk membentuk baris respon.
- Karena `NEW` memuat seluruh kolom View (`key`, `value`, `updated_at`), PostgREST dapat menyusun JSON representasi secara benar.

---

## 4. ROLLBACK INTEGRITY ANALYSIS (SPECIAL FOCUS)

### Temuan Kritis: Risiko Kehilangan Data Mutasi pada Rollback V4
Pada dokumen V4, skrip rollback tertulis sebagai berikut:
```sql
DROP VIEW IF EXISTS public.promo_settings;
ALTER TABLE legacy_archive.promo_settings SET SCHEMA public;
```

**ANALISIS KEGAGALAN DATA LOSS**:
1. Selama masa migrasi aktif, pembaruan banner/promo yang dilakukan oleh admin Workplace ditulis ke dalam tabel `public.site_settings` melalui Compatibility View.
2. Tabel fisik lama di `legacy_archive.promo_settings` berada dalam kondisi statis (terhenti pada saat migrasi awal dijalankan).
3. Jika rollback V4 dieksekusi setelah sistem berjalan beberapa hari/minggu, perintah `ALTER TABLE legacy_archive.promo_settings SET SCHEMA public` akan mengembalikan data lama yang sudah basi (stale data).
4. Seluruh perubahan status promo, perpanjangan deadline, atau perubahan judul yang terjadi selama masa aktif View akan **HILANG SEKETIKA**.
5. Ini melanggar prinsip integritas data nol risiko (Zero Data Loss).

### Solusi Wajib: Rekonsiliasi Data Sebelum Rollback (Bidirectional Sync-Back)
Sebelum tabel fisik lama dikembalikan ke skema `public`, skrip rollback **WAJIB** mengeksekusi rekonsiliasi data terbaru dari `public.site_settings` ke `legacy_archive.promo_settings`:

```sql
-- REKONSILIASI DATA TERBARU SEBELUM ROLLBACK
UPDATE legacy_archive.promo_settings p
SET 
  value = CASE 
    WHEN jsonb_typeof(s.value) = 'string' THEN (s.value #>> '{}')
    ELSE s.value::text
  END,
  updated_at = s.updated_at
FROM public.site_settings s
WHERE p.key = s.key AND s.updated_at > p.updated_at;
```

Dengan langkah rekonsiliasi ini, rollback dijamin tidak akan kehilangan pembaruan data yang terjadi selama masa migrasi.

---

## 5. LOCK DAN DOWNTIME FEASIBILITY

### A. Tipe Kunci yang Dibutuhkan
1. Perintah `ALTER TABLE public.promo_settings SET SCHEMA legacy_archive;` membutuhkan **AccessExclusiveLock** pada tabel `promo_settings`.
2. `AccessExclusiveLock` memblokir seluruh operasi lain pada tabel tersebut (termasuk `SELECT`).

### B. Analisis Risiko Antrean Kunci (Lock Queue Starvation)
- Jika ada kueri yang sedang membaca `promo_settings` saat DDL dimulai, perintah `ALTER TABLE` akan menunggu kueri tersebut selesai.
- Dalam arsitektur PostgreSQL, semua kueri baru yang datang setelah `ALTER TABLE` akan tertahan di belakang antrean `AccessExclusiveLock`.
- Jika tidak dibatasi, hal ini dapat menyebabkan penumpukan koneksi (connection pool exhaustion).

### C. Kebijakan Timeout Wajib
Untuk mencegah downtime atau penumpukan antrean:
1. Wajib menetapkan: `SET LOCAL lock_timeout = '2s';`
2. Wajib menetapkan: `SET LOCAL statement_timeout = '5s';`
3. Jika kunci tidak dapat diperoleh dalam 2 detik, transaksi migrasi akan dibatalkan otomatis (`ABORT/ROLLBACK`) tanpa mengganggu lalu lintas aplikasi.

### D. Koreksi Klaim Waktu Eksekusi
- Dokumen V4 mengklaim durasi kunci "di bawah 15 ms".
- Tanpa instrumen pengujian latensi jaringan dan engine internal Supabase production, klaim durasi absolut tidak dapat dijamin.
- Yang dapat dijamin secara arsitektural adalah: volume data sangat kecil (4 baris), operasi adalah DDL metadata murni tanpa pemindaian tabel penuh (table scan), dan dilindungi oleh guardrail `lock_timeout = 2s`.

### E. Penanganan PostgREST Schema Cache Reload
Setelah pembuatan atau penghapusan View, cache skema PostgREST wajib di-refresh agar PostgREST segera mengenali perubahan objek:
`NOTIFY pgrst, 'reload schema';`

---

## 6. STATUS PENGUJIAN DAN LINGKUNGAN ISOLASI

### A. Audit Ketersediaan Lingkungan Lokal
- Pemeriksaan workstation lokal menunjukkan bahwa daemon PostgreSQL lokal, Docker engine, dan utilitas CLI `psql`/`pg_ctl` **tidak tersedia**.
- Sesuai instruksi mutlak pada brief:
  *DILARANG PERNAH menjalankan SQL draft pada database production sebagai uji coba.*
  *Jika lingkungan isolasi tidak tersedia, tandai bagian yang belum dapat dibuktikan sebagai NOT VERIFIED.*

### B. Daftar Status Pengujian

| Komponen Pengujian | Metode Pengujian | Status Hasil |
| :--- | :--- | :--- |
| Validasi Sintaks PL/pgSQL & DDL | Static Syntax & Grammar Parsing | **VERIFIED (Valid)** |
| Integritas Relasi Skema & FK | Metadata Dependency Audit | **VERIFIED (Valid)** |
| Evaluasi Logika Trigger Otorisasi | Security Branch Analysis | **VERIFIED (Valid)** |
| Eksekusi Nyata DDL pada Instance Fisik | Menunggu Staging / Disposable DB | **NOT VERIFIED** |
| Respon Runtime PostgREST pada View PATCH | Menunggu Staging PostgREST | **NOT VERIFIED** |
| Durasi Nyata Lock Acquisition di Supabase Cloud | Menunggu Staging Latency Test | **NOT VERIFIED** |

---

## 7. SQL YANG PERLU DIPERBAIKI (CORRECTED SQL SPECIFICATION)

Berikut adalah draf SQL resmi Paket A yang telah disempurnakan berdasarkan seluruh temuan audit teknis dan keamanan di atas:

### A. Preflight Check Paket A (Disempurnakan)
```sql
-- PREFLIGHT CHECK PAKET A (REVISED)
DO $$
DECLARE
  v_promo_count INTEGER;
  v_lock_count INTEGER;
BEGIN
  -- 1. Verifikasi baris promo_settings tepat 4 baris
  SELECT count(*) INTO v_promo_count FROM public.promo_settings;
  IF v_promo_count != 4 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: promo_settings memiliki % baris, diharapkan 4.', v_promo_count;
  END IF;

  -- 2. Verifikasi 4 kunci utama lengkap
  IF NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'catalog_url') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'promo_judul') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'promo_deadline') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'penawaran_spesial_aktif') THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: Kunci wajib promo_settings tidak lengkap.';
  END IF;

  -- 3. Verifikasi ketiadaan transaksi aktif yang mengunci tabel
  SELECT count(*) INTO v_lock_count
  FROM pg_locks l
  JOIN pg_class c ON l.relation = c.oid
  WHERE c.relname = 'promo_settings';
  
  IF v_lock_count > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: promo_settings sedang dikunci transaksi lain.';
  END IF;

  RAISE NOTICE 'PREFLIGHT PAKET A PASSED: Lingkungan siap untuk migrasi aman.';
END $$;
```

### B. Draft SQL Migrasi Paket A (Disempurnakan)
```sql
-- ============================================================================
-- PAKET MIGRASI 1: KONSOLIDASI PROMO_SETTINGS (REVISED & HARDENED)
-- ============================================================================
BEGIN;

-- 1. Proteksi timeout ketat untuk mencegah penumpukan lock
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '5s';

-- 2. Siapkan skema arsip
CREATE SCHEMA IF NOT EXISTS legacy_archive;

-- 3. Salin data ke site_settings dengan tipe yang konsisten
INSERT INTO public.site_settings (key, value, updated_at)
SELECT 
  key,
  CASE 
    WHEN key = 'penawaran_spesial_aktif' THEN to_jsonb(value = 'true')
    ELSE to_jsonb(value)
  END,
  updated_at
FROM public.promo_settings
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value,
  updated_at = EXCLUDED.updated_at;

-- 4. Pindahkan tabel fisik ke schema arsip
ALTER TABLE public.promo_settings SET SCHEMA legacy_archive;

-- 5. Buat Compatibility View dengan penanganan tipe yang rapi
CREATE OR REPLACE VIEW public.promo_settings AS
SELECT 
  key,
  CASE 
    WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}')
    ELSE value::text
  END AS value,
  updated_at
FROM public.site_settings
WHERE key IN ('catalog_url', 'penawaran_spesial_aktif', 'promo_deadline', 'promo_judul');

-- 6. Buat Trigger Function dengan proteksi otorisasi dan validasi keberadaan kunci
CREATE OR REPLACE FUNCTION public.trg_compat_update_promo_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  -- Pemeriksaan Otorisasi Berlapis
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    -- Internal / Superuser / Service Role diizinkan
    NULL;
  ELSIF COALESCE(auth.role(), '') = 'service_role' THEN
    -- Pemanggil Edge Function resmi diizinkan
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    -- Pengguna admin terautentikasi diizinkan
    NULL;
  ELSE
    RAISE EXCEPTION 'PERMISSION_DENIED: Akses ditolak. Hanya admin yang diizinkan memperbarui promo_settings.';
  END IF;

  -- Validasi Whitelist Kunci
  IF OLD.key NOT IN ('catalog_url', 'penawaran_spesial_aktif', 'promo_deadline', 'promo_judul') THEN
    RAISE EXCEPTION 'INVALID_KEY: Kunci % tidak diizinkan dimutasi melalui promo_settings view.', OLD.key;
  END IF;

  -- Pembaruan ke tabel fisik site_settings dengan format konsisten
  UPDATE public.site_settings
  SET 
    value = CASE 
      WHEN OLD.key = 'penawaran_spesial_aktif' AND NEW.value IN ('true', 'false') THEN to_jsonb(NEW.value = 'true')
      ELSE to_jsonb(NEW.value)
    END,
    updated_at = COALESCE(NEW.updated_at, now())
  WHERE key = OLD.key;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'KEY_NOT_FOUND: Kunci % tidak ditemukan di site_settings.', OLD.key;
  END IF;

  RETURN NEW;
END;
$$;

-- Pasang trigger INSTEAD OF UPDATE
CREATE TRIGGER trg_promo_settings_update
INSTEAD OF UPDATE ON public.promo_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_compat_update_promo_settings();

-- Pasang trigger penolakan INSERT dan DELETE
CREATE OR REPLACE FUNCTION public.trg_compat_reject_promo_settings_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'OPERATION_NOT_ALLOWED: Penambahan atau penghapusan kunci promo dilarang.';
END;
$$;

CREATE TRIGGER trg_promo_settings_reject_insert
INSTEAD OF INSERT ON public.promo_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_compat_reject_promo_settings_mutation();

CREATE TRIGGER trg_promo_settings_reject_delete
INSTEAD OF DELETE ON public.promo_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_compat_reject_promo_settings_mutation();

-- 7. Hak Akses Ketat (PoLP: anon HANYA SELECT, TIDAK ADA UPDATE)
REVOKE ALL ON public.promo_settings FROM PUBLIC;
GRANT SELECT ON public.promo_settings TO anon, authenticated, service_role;
GRANT UPDATE ON public.promo_settings TO authenticated, service_role;

-- 8. Refresh Schema Cache PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
```

### C. Draft SQL Rollback Paket A (Dengan Rekonsiliasi Data)
```sql
-- ============================================================================
-- ROLLBACK PAKET A DENGAN REKONSILIASI DATA (ZERO DATA LOSS)
-- ============================================================================
BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '5s';

-- 1. Rekonsiliasi nilai promo terbaru dari site_settings ke legacy_archive
-- Ini mencegah kehilangan pembaruan yang terjadi selama masa aktif View
UPDATE legacy_archive.promo_settings p
SET 
  value = CASE 
    WHEN jsonb_typeof(s.value) = 'string' THEN (s.value #>> '{}')
    ELSE s.value::text
  END,
  updated_at = s.updated_at
FROM public.site_settings s
WHERE p.key = s.key AND s.updated_at >= p.updated_at;

-- 2. Hapus triggers pada View
DROP TRIGGER IF EXISTS trg_promo_settings_reject_delete ON public.promo_settings;
DROP TRIGGER IF EXISTS trg_promo_settings_reject_insert ON public.promo_settings;
DROP TRIGGER IF EXISTS trg_promo_settings_update ON public.promo_settings;

-- 3. Hapus fungsi trigger
DROP FUNCTION IF EXISTS public.trg_compat_reject_promo_settings_mutation();
DROP FUNCTION IF EXISTS public.trg_compat_update_promo_settings();

-- 4. Hapus View kompatibilitas
DROP VIEW IF EXISTS public.promo_settings;

-- 5. Kembalikan tabel fisik dari legacy_archive ke public
ALTER TABLE legacy_archive.promo_settings SET SCHEMA public;

-- 6. Pulihkan RLS dan Grants asli
ALTER TABLE public.promo_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_promo_settings" ON public.promo_settings;
CREATE POLICY "public_read_promo_settings" ON public.promo_settings FOR SELECT USING (true);

GRANT ALL ON public.promo_settings TO authenticated, service_role, anon;

-- 7. Refresh Schema Cache PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## 8. GO / NO-GO REKOMENDASI PER PAKET

| Paket Migrasi | Rekomendasi Resmi V5 | Syarat & Justifikasi Teknis |
| :--- | :--- | :--- |
| **Paket A (`promo_settings`)** | **CONDITIONAL GO** | 1. Draf SQL V5 telah mengoreksi celah otorisasi (`anon` update dicabut) dan menyelesaikan risiko kehilangan data rollback via rekonsiliasi data dua arah.<br>2. **Syarat Wajib**: Harus dilakukan pengujian kering (dry-run) di lingkungan staging/disposable database terlebih dahulu sebelum dieksekusi di database produksi Supabase. |
| **Paket B (`user_buy_limits`)** | **NO-GO / KEEP AS-IS** | 1. Tidak ada kebutuhan mendesak untuk perubahan skema atau DDL.<br>2. Tabel `user_buy_limits` (0 baris) sudah memiliki RLS Service Role aktif dan `special_buy_limits` (28 baris) berjalan stabil melayani checkout Mayar.<br>3. Pertahankan fisik tanpa DDL apa pun (Zero Risk). |

---

## 9. OUTSTANDING BLOCKERS (ITEM YANG DILARANG DIUBAH)

Daftar blocker arsitektural yang tetap berlaku secara permanen:

1. **Blocker A - Katalog (`products` vs `services`)**:
   - Dilarang menggabungkan atau mengubah `products` menjadi View karena PostgreSQL melarang penguncian baris `SELECT ... FOR UPDATE` pada View, yang akan memicu kegagalan fatal pada RPC checkout Mayar produksi.
2. **Blocker B - Realtime Kas (`operational_settings`)**:
   - Dilarang mengubah `operational_settings` menjadi View karena PostgreSQL Logical Replication / Supabase Realtime CDC tidak mempublikasikan mutasi data dari View ke Workplace Admin.
3. **Blocker C - Otorisasi Dua Aplikasi (`user_roles`)**:
   - Ditetapkan sebagai PROTECTED TABLE mutlak untuk memisahkan otorisasi tingkat Service Role backend dari token aplikasi klien.
4. **Blocker D - Navigasi Workplace Admin (`payments`)**:
   - Dilarang menghapus atau mengubah tabel `payments` (0 baris) karena tab UI Pembayaran dan listener Realtime Workplace Admin bergantung pada tabel fisik ini.
5. **Blocker E - Aset Reputasi (`reviews` & `review_helpful_votes`)**:
   - Sebanyak 309 ulasan pelanggan dan 18 vote testimoni terikat permanen ke `services.id` (BIGINT) dan berada 100% di luar cakupan perubahan.

---

*Laporan tinjauan teknis dan keamanan V5 ini disusun oleh Stelle dalam mode Read-Only Database dan Read-Only Repository. DILARANG mengeksekusi migrasi tanpa persetujuan eksplisit dari Kayla.*
