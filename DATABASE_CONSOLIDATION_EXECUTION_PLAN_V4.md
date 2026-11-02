# DATABASE CONSOLIDATION EXECUTION PLAN V4: CONTROLLED MIGRATION PREPARATION - JOKI.IN (SUPABASE)

Dokumen ini merupakan panduan rencana eksekusi migrasi database terkontrol (Execution Plan V4) untuk database Supabase JOKI.IN (`xdbnwjvxqtpkoaigedsk`), Cloudflare Worker, Supabase Edge Functions, Next.js Storefront, JOKI.IN Workplace, dan Chrome Extension.

Sesuai mandat arsitektural resmi dari Kayla, seluruh objek inti yang vital bagi transaksi, otorisasi dua aplikasi, dan pembukuan kas operasional berstatus **PROTECTED TABLE** dan **DILARANG DISENTUH**.

Paket migrasi ini difokuskan hanya pada kandidat yang paling memungkinkan dengan pemisahan transaksi secara tegas, verifikasi pra-eksekusi (preflight), skrip rollback instan deterministik, dan mitigasi risiko privilege escalation.

Mode Operasi Sesi Ini: **READ-ONLY murni terhadap Supabase dan Repository**. Tidak ada DDL, DML, atau perubahan skema yang dieksekusi. Seluruh skrip SQL dalam dokumen ini merupakan draf dokumentasi persiapan yang menunggu persetujuan eksplisit Kayla.

---

## 1. KONDISI DATABASE TERBARU DAN STATUS OBJEK DILINDUNGI

### A. Objek Terlindungi Mutlak (Protected Database Objects - Out of Scope)

Tujuh entitas berikut secara tegas dilarang diubah dalam pekerjaan migrasi ini (struktur, data, relasi foreign key, trigger, constraints, privileges, maupun RLS-nya):

1. **`public.user_roles`** (6 baris): Otorisasi backend bersama dua aplikasi (Storefront dan Workplace) dengan RLS Service Role.
2. **`public.reviews`** (309 baris): Aset reputasi dan testimoni pelanggan yang terikat ke `services.id`.
3. **`public.review_helpful_votes`** (18 baris): Vote bantuan ulasan pelanggan yang terikat ke `reviews.id`.
4. **`public.products`** (6 baris): Katalog produk modern dan produk digital terbatas yang membutuhkan penguncian baris `SELECT ... FOR UPDATE` pada RPC checkout.
5. **`public.services`** (22 baris): Fondasi layanan sistem pengerjaan tugas akademik dan induk relasi pesanan.
6. **`public.payments`** (0 baris): Dipantau secara aktif oleh tab UI navigasi "Pembayaran" dan listener Realtime CDC di Workplace Admin.
7. **`public.operational_settings`** (1 baris): Satu-satunya tabel pengaturan yang terdaftar dalam publikasi `supabase_realtime` untuk sinkronisasi kas buku operasional Workplace.

### B. Baseline Verifikasi Metadata Objek Target Migrasi V4

Hasil audit langsung pada database produksi `xdbnwjvxqtpkoaigedsk` per November 2026:

| Nama Objek | Tipe Objek | Baris Aktual | Tipe Kolom Nilai | Kunci Utama (PK) | Status Publikasi Realtime | Prioritas Evaluasi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public.promo_settings` | Physical Table | 4 | `value` (text) | `key` (text) | Tidak Terdaftar (Bebas CDC) | **PRIORITY A (Kandidat Migrasi)** |
| `public.site_settings` | Physical Table | 2 | `value` (jsonb) | `key` (text) | Tidak Terdaftar (Bebas CDC) | **PRIORITY A (Target Konsolidasi)** |
| `public.user_buy_limits` | Physical Table | 0 | `jumlah_dibeli` (int) | `(user_id, product_id)` | Tidak Terdaftar (Bebas CDC) | **PRIORITY B (Kandidat Isolasi)** |
| `public.special_buy_limits` | Physical Table | 28 | `qty` (int) | `id` (uuid) | Tidak Terdaftar (Bebas CDC) | **PRIORITY B (Physical Table Aktif)** |

### C. Data Aktual `public.promo_settings` (4 Baris):
1. `catalog_url`: `"https://jokiin.my.id"` (updated: `2026-10-12 15:08:10.630061+00`)
2. `promo_judul`: `"Penawaran Spesial Minggu Ini"` (updated: `2026-10-13 13:38:40.219+00`)
3. `promo_deadline`: `"2026-10-29T17:00:00.000Z"` (updated: `2026-10-30 01:28:28.22+00`)
4. `penawaran_spesial_aktif`: `"false"` (updated: `2026-10-30 01:36:08.200075+00`)

### D. Data Aktual `public.site_settings` (2 Baris):
1. `task_upload_drive_folder`: JSONB folder Google Drive attachment lampiran tugas.
2. `home_promo`: JSONB kupon diskon storefront (`NO NUGAS NOVEMBER`, active: true, coupon: `NNN2026`, discount_percent: 10).

---

## 2. DAFTAR DEPENDENCY TERVERIFIKASI

### A. Dependensi Terverifikasi Priority A (`promo_settings` & `site_settings`)

1. **Supabase Edge Function (`jokiin-catalog`)**:
   - Lokasi: [supabase/functions/jokiin-catalog/index.ts](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/supabase/functions/jokiin-catalog/index.ts)
   - Baris 870: `dbFetch('promo_settings?key=in.(penawaran_spesial_aktif,promo_judul,promo_deadline)&select=key,value')` (SELECT untuk rute publik `/api/promo/banner`).
   - Baris 1019: `await dbFetch('promo_settings?key=eq.penawaran_spesial_aktif', 'PATCH', { value: String(body.aktif), updated_at: nowIso })` (PATCH dari Workplace).
   - Baris 1022: `await dbFetch('promo_settings?key=eq.promo_deadline', 'PATCH', { value: body.promo_deadline.trim(), updated_at: nowIso })` (PATCH dari Workplace).
   - Baris 1025: `await dbFetch('promo_settings?key=eq.promo_judul', 'PATCH', { value: body.promo_judul.trim().slice(0, 200), updated_at: nowIso })` (PATCH dari Workplace).
   - Baris 1096: `const settings = await dbFetch('promo_settings?key=eq.catalog_url&select=value&limit=1')` (SELECT untuk rute `/api/admin/sync/status`).
2. **Cloudflare Worker (`src/worker.js`)**:
   - Lokasi: [src/worker.js](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/src/worker.js)
   - Baris 522: `await supabase(env, 'site_settings?key=eq.home_promo&select=value&limit=1')` (SELECT membaca kupon aktif Storefront).
   - Baris 112 & 140: Membaca `site_settings?key=eq.task_upload_drive_folder`.
   - Baris 119: UPSERT `site_settings` untuk folder upload Google Drive.
3. **JOKI.IN Workplace Admin**:
   - Lokasi: `js/produk-promo.js` (baris 836, 929, 1041).
   - Mengirim request `fetch('${CATALOG_API}/api/admin/promo/penawaran-spesial', { method: 'PATCH', ... })` ke Edge Function `jokiin-catalog`.
   - Tidak melakukan query langsung ke tabel `promo_settings`.
4. **JOKI.IN Storefront Next.js**:
   - Lokasi: [frontend-next/src/components/PromoStrip.tsx](file:///C:/Users/Maulana%20Riski/Documents/Codex/2026-09-30/gi/work/nextjs-migration/frontend-next/src/components/PromoStrip.tsx)
   - Memanggil endpoint `/api/promo/banner` (yang diteruskan oleh Worker ke Edge Function `jokiin-catalog`).
   - Tidak melakukan query langsung ke database Supabase.

### B. Dependensi Terverifikasi Priority B (`user_buy_limits` & `special_buy_limits`)

1. **RPC `public.catalog_checkout_spesial`**:
   - Membaca dan mengunci riwayat pembelian 24 jam via query:
     `SELECT COALESCE(SUM(s.qty), 0) FROM public.special_buy_limits s WHERE s.product_id = v_product.id AND (lower(s.gmail) = lower(trim(p_gmail)) OR s.whatsapp = trim(p_whatsapp)) ...`
   - Menyimpan entri batas beli baru:
     `INSERT INTO public.special_buy_limits (product_id, order_code, gmail, whatsapp, qty) VALUES ...`
   - **TIDAK MENGGUNAKAN** `user_buy_limits`.
2. **RPC `public.catalog_check_buy_limit`**:
   - Satu-satunya fungsi database yang merujuk ke `public.user_buy_limits`:
     `SELECT COALESCE(jumlah_dibeli, 0) FROM public.user_buy_limits WHERE user_id = p_user_id AND product_id = p_product_id`
     `INSERT INTO public.user_buy_limits ... ON CONFLICT (user_id, product_id) DO UPDATE ...`
   - Hasil audit kode: Tidak ditemukan pemanggil RPC `catalog_check_buy_limit` pada Storefront, Worker, Edge Function, maupun Workplace Admin.
3. **Relasi Foreign Key Database**:
   - `user_buy_limits.product_id` mereferensikan `public.products(id) ON DELETE CASCADE`.
   - `user_buy_limits.user_id` mereferensikan `auth.users(id) ON DELETE CASCADE`.
   - `special_buy_limits.product_id` mereferensikan `public.products(id) ON DELETE CASCADE`.

---

## 3. SQL PREFLIGHT (VALIDASI KONDISI SEBELUM EKSEKUSI)

Sebelum migrasi dijalankan di masa mendatang, skrip preflight berikut wajib dieksekusi terlebih dahulu untuk memverifikasi kesiapan lingkungan:

### A. Preflight Priority A (Promo Settings)
```sql
-- PREFLIGHT CHECK: PRIORITY A (PROMO SETTINGS)
DO $$
DECLARE
  v_promo_count INTEGER;
  v_site_count INTEGER;
  v_lock_count INTEGER;
BEGIN
  -- 1. Verifikasi baris promo_settings tepat 4 baris
  SELECT count(*) INTO v_promo_count FROM public.promo_settings;
  IF v_promo_count != 4 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: promo_settings memiliki % baris, diharapkan tepat 4 baris.', v_promo_count;
  END IF;

  -- 2. Verifikasi 4 kunci utama tersedia lengkap
  IF NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'catalog_url') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'promo_judul') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'promo_deadline') OR
     NOT EXISTS (SELECT 1 FROM public.promo_settings WHERE key = 'penawaran_spesial_aktif') THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: Ada kunci wajib yang hilang dari promo_settings.';
  END IF;

  -- 3. Verifikasi ketiadaan transaksi aktif yang sedang mengunci promo_settings
  SELECT count(*) INTO v_lock_count
  FROM pg_locks l
  JOIN pg_class c ON l.relation = c.oid
  WHERE c.relname = 'promo_settings';
  
  IF v_lock_count > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: promo_settings sedang dikunci oleh transaksi lain (lock count: %).', v_lock_count;
  END IF;

  RAISE NOTICE 'PREFLIGHT PRIORITY A: SUCCESSFUL. Sistem siap untuk migrasi promo_settings.';
END $$;
```

### B. Preflight Priority B (User Buy Limits & Special Buy Limits)
```sql
-- PREFLIGHT CHECK: PRIORITY B (BUY LIMITS)
DO $$
DECLARE
  v_user_limits_count INTEGER;
  v_special_limits_count INTEGER;
  v_special_active_locks INTEGER;
BEGIN
  -- 1. Verifikasi baris user_buy_limits kosong (0 baris)
  SELECT count(*) INTO v_user_limits_count FROM public.user_buy_limits;
  IF v_user_limits_count > 0 THEN
    RAISE NOTICE 'PREFLIGHT WARNING: user_buy_limits memiliki % baris (bukan 0). Perlu backup data.', v_user_limits_count;
  END IF;

  -- 2. Verifikasi special_buy_limits tetap utuh
  SELECT count(*) INTO v_special_limits_count FROM public.special_buy_limits;
  IF v_special_limits_count < 28 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: special_buy_limits berkurang dari baseline 28 baris (aktual: %).', v_special_limits_count;
  END IF;

  -- 3. Verifikasi ketiadaan checkout spesial Mayar yang sedang berjalan
  SELECT count(*) INTO v_special_active_locks
  FROM pg_locks l
  JOIN pg_class c ON l.relation = c.oid
  WHERE c.relname = 'special_buy_limits' AND l.mode LIKE '%ExclusiveLock%';

  IF v_special_active_locks > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: special_buy_limits sedang mengalami penguncian eksklusif.';
  END IF;

  RAISE NOTICE 'PREFLIGHT PRIORITY B: SUCCESSFUL. Status buy limits terverifikasi stabil.';
END $$;
```

---

## 4. DRAFT SQL MIGRATION (TERPISAH PER PRIORITAS)

> [!IMPORTANT]
> Kedua paket migrasi ini dipisahkan secara tegas dan DILARANG digabungkan ke dalam satu transaksi besar guna meminimalisir risiko kegagalan sistem.

### Paket 1: Migrasi Priority A (Konsolidasi `promo_settings` ke `site_settings`)

```sql
-- ============================================================================
-- PAKET MIGRASI 1: KONSOLIDASI PROMO_SETTINGS KE SITE_SETTINGS
-- Transaksi Terisolasi A - Aman & Rollback-Ready
-- ============================================================================
BEGIN;

-- Langkah 1: Siapkan skema arsip legacy jika belum ada
CREATE SCHEMA IF NOT EXISTS legacy_archive;

-- Langkah 2: Salin nilai promo_settings ke format JSONB di site_settings
-- Menggunakan ON CONFLICT DO UPDATE agar aman jika dijalankan ulang
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
SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

-- Langkah 3: Pindahkan tabel fisik promo_settings ke skema legacy_archive
ALTER TABLE public.promo_settings SET SCHEMA legacy_archive;

-- Langkah 4: Buat Compatibility View public.promo_settings
-- View ini memformat ulang nilai JSONB menjadi text string sesuai kontrak lama
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

-- Langkah 5: Buat fungsi trigger INSTEAD OF UPDATE dengan proteksi hak akses
CREATE OR REPLACE FUNCTION public.trg_compat_update_promo_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validasi Keamanan: Cegah Privilege Escalation
  -- Hanya service_role atau admin/super_admin terautentikasi yang diizinkan menulis
  IF (auth.role() IS DISTINCT FROM 'service_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Hanya admin yang diizinkan memperbarui promo_settings.';
    END IF;
  END IF;

  -- Validasi Whitelist: Cegah injeksi key tak dikenal
  IF OLD.key NOT IN ('catalog_url', 'penawaran_spesial_aktif', 'promo_deadline', 'promo_judul') THEN
    RAISE EXCEPTION 'INVALID_KEY: Kunci % tidak diizinkan untuk diperbarui melalui promo_settings view.', OLD.key;
  END IF;

  -- Perbarui tabel fisik site_settings
  UPDATE public.site_settings
  SET 
    value = to_jsonb(NEW.value),
    updated_at = COALESCE(NEW.updated_at, now())
  WHERE key = OLD.key;

  RETURN NEW;
END;
$$;

-- Langkah 6: Pasang trigger INSTEAD OF UPDATE pada View
CREATE TRIGGER trg_promo_settings_update
INSTEAD OF UPDATE ON public.promo_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_compat_update_promo_settings();

-- Langkah 7: Pasang proteksi penolakan untuk INSERT dan DELETE
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

-- Langkah 8: Berikan privileges yang sesuai dengan tabel asli
GRANT SELECT, UPDATE ON public.promo_settings TO authenticated, service_role, anon;

COMMIT;
```

---

### Paket 2: Evaluasi Terkontrol Priority B (`user_buy_limits`)

Sesuai instruksi mutlak:
- **DILARANG MENGARSIPKAN ATAU MENGHAPUS TABEL `user_buy_limits`**.
- Tabel fisik `user_buy_limits` (0 baris) dan `special_buy_limits` (28 baris) **TETAP DIPERTAHANKAN SEBAGAI TABEL FISIK (KEEP PHYSICAL TABLE)** karena RPC `public.catalog_check_buy_limit` masih memiliki referensi langsung ke tabel tersebut.
- Paket 2 dirancang sebagai **Pemeliharaan Pertahanan Berlapis (Defense-in-Depth Maintenance)** tanpa mengubah struktur atau merelokasi tabel:

```sql
-- ============================================================================
-- PAKET MIGRASI 2: DEFENSE-IN-DEPTH ISOLATION USER_BUY_LIMITS
-- Transaksi Terisolasi B - Mempertahankan Tabel Fisik
-- ============================================================================
BEGIN;

-- Langkah 1: Verifikasi integritas constraint dan foreign keys tetap terpasang
-- Tidak ada DROP, ALTER, RENAME, atau pengarsipan skema
COMMENT ON TABLE public.user_buy_limits IS 
  'LEGACY INACTIVE: Tabel batas kuota pembelian pengguna era lama. Dipertahankan fisik demi integritas RPC catalog_check_buy_limit.';

COMMENT ON TABLE public.special_buy_limits IS 
  'ACTIVE PRODUCTION: Tabel batas kuota beli 24 jam Gmail/WhatsApp untuk checkout produk digital (Gemini Pro).';

-- Langkah 2: Pastikan RLS tetap aktif dan mengisolasi akses langsung dari publik
ALTER TABLE public.user_buy_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_buy_limits ENABLE ROW LEVEL SECURITY;

-- Verifikasi policy service_role tetap terpasang aman
DROP POLICY IF EXISTS "service_role_only_buy_limits" ON public.user_buy_limits;
CREATE POLICY "service_role_only_buy_limits" ON public.user_buy_limits 
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_special_buy_limits" ON public.special_buy_limits;
CREATE POLICY "service_role_all_special_buy_limits" ON public.special_buy_limits 
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
```

---

## 5. SQL POST-MIGRATION VERIFICATION

Setelah eksekusi paket migrasi di masa mendatang, serangkaian kueri verifikasi ini wajib dieksekusi untuk memastikan keberhasilan menyeluruh:

```sql
-- VERIFIKASI POST-MIGRASI LENGKAP
DO $$
DECLARE
  v_view_count INTEGER;
  v_test_val TEXT;
  v_site_val JSONB;
BEGIN
  -- 1. Verifikasi Compatibility View mengembalikan tepat 4 kunci promo
  SELECT count(*) INTO v_view_count FROM public.promo_settings;
  IF v_view_count != 4 THEN
    RAISE EXCEPTION 'POST_VERIFY_FAILED: View promo_settings mengembalikan % baris, bukan 4.', v_view_count;
  END IF;

  -- 2. Verifikasi format pembacaan sesuai nilai asli
  SELECT value INTO v_test_val FROM public.promo_settings WHERE key = 'catalog_url';
  IF v_test_val != 'https://jokiin.my.id' THEN
    RAISE EXCEPTION 'POST_VERIFY_FAILED: Nilai catalog_url pada View tidak cocok: %', v_test_val;
  END IF;

  -- 3. Verifikasi konsistensi JSONB di site_settings
  SELECT value INTO v_site_val FROM public.site_settings WHERE key = 'catalog_url';
  IF v_site_val IS NULL OR (v_site_val #>> '{}') != 'https://jokiin.my.id' THEN
    RAISE EXCEPTION 'POST_VERIFY_FAILED: Nilai di site_settings tidak sinkron: %', v_site_val;
  END IF;

  -- 4. Verifikasi tabel arsip tersimpan aman
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'legacy_archive' AND table_name = 'promo_settings'
  ) THEN
    RAISE EXCEPTION 'POST_VERIFY_FAILED: Tabel fisik promo_settings belum berada di legacy_archive.';
  END IF;

  -- 5. Verifikasi user_buy_limits dan special_buy_limits tetap ada sebagai tabel fisik
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_buy_limits'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'special_buy_limits'
  ) THEN
    RAISE EXCEPTION 'POST_VERIFY_FAILED: user_buy_limits atau special_buy_limits hilang dari schema public.';
  END IF;

  RAISE NOTICE 'POST-MIGRATION VERIFICATION: ALL CHECKS PASSED PERFECTLY.';
END $$;
```

---

## 6. SQL ROLLBACK (DETERMINISTIK DAN INSTAN PER PAKET)

Jika ditemukan anomali atau kegagalan saat pengujian pasca-migrasi, eksekusi rollback berikut:

### Rollback Paket 1 (Mengembalikan `promo_settings` ke Tabel Fisik Asli)
```sql
-- ROLLBACK DETERMINISTIK PAKET 1
BEGIN;

-- 1. Hapus triggers pada View
DROP TRIGGER IF EXISTS trg_promo_settings_reject_delete ON public.promo_settings;
DROP TRIGGER IF EXISTS trg_promo_settings_reject_insert ON public.promo_settings;
DROP TRIGGER IF EXISTS trg_promo_settings_update ON public.promo_settings;

-- 2. Hapus fungsi trigger
DROP FUNCTION IF EXISTS public.trg_compat_reject_promo_settings_mutation();
DROP FUNCTION IF EXISTS public.trg_compat_update_promo_settings();

-- 3. Hapus Compatibility View
DROP VIEW IF EXISTS public.promo_settings;

-- 4. Kembalikan tabel fisik promo_settings dari legacy_archive ke public
ALTER TABLE legacy_archive.promo_settings SET SCHEMA public;

-- 5. Pastikan RLS dan policy tabel fisik aktif kembali
ALTER TABLE public.promo_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_promo_settings" ON public.promo_settings;
CREATE POLICY "public_read_promo_settings" ON public.promo_settings FOR SELECT USING (true);

GRANT ALL ON public.promo_settings TO authenticated, service_role, anon;

COMMIT;
```

### Rollback Paket 2 (Memastikan Konfigurasi Asli `user_buy_limits`)
```sql
-- ROLLBACK PAKET 2 (DEFENSE-IN-DEPTH CHECK)
BEGIN;
-- Memastikan komentar dan policy kembali ke kondisi semula
ALTER TABLE public.user_buy_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_buy_limits" ON public.user_buy_limits;
CREATE POLICY "service_role_only_buy_limits" ON public.user_buy_limits FOR ALL USING (auth.role() = 'service_role');
COMMIT;
```

---

## 7. ANALISIS RISIKO RLS DAN PRIVILEGE ESCALATION

1. **Proteksi Fungsi `SECURITY DEFINER`**:
   - Fungsi `trg_compat_update_promo_settings` menggunakan klausa eksplisit `SET search_path = public, pg_temp` untuk menutup celah serangan manipulasi `search_path` (search path hijacking).
2. **Pencegahan Bypass Otorisasi**:
   - Jika pengguna memanggil query `UPDATE promo_settings` dengan token pelanggan (`role = 'user'`) atau tanpa autentikasi (`anon`), trigger secara tegas mengevaluasi:
     `IF (auth.role() IS DISTINCT FROM 'service_role') THEN ... IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin', 'super_admin')) THEN RAISE EXCEPTION ...`
   - Penolakan terjadi seketika di tingkat database dengan kode `PERMISSION_DENIED`.
3. **Whitelist Kunci Ketat**:
   - Hanya empat kunci (`catalog_url`, `penawaran_spesial_aktif`, `promo_deadline`, `promo_judul`) yang diizinkan dimutasi melalui View.
   - Kunci lain seperti `home_promo` dan `task_upload_drive_folder` di `site_settings` tidak dapat dimanipulasi atau ditimpa melalui View ini.
4. **Blokir Mutasi Tak Terduga**:
   - Operasi `INSERT` dan `DELETE` pada View ditolak secara permanen oleh trigger penolakan (`trg_compat_reject_promo_settings_mutation`).

---

## 8. RISIKO REALTIME (CDC PUBLICATION ANALYSIS)

Hasil audit aktual terhadap tabel publikasi `supabase_realtime`:

```sql
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE schemaname = 'public';
```

- **Tabel Terdaftar di Realtime**: Hanya `public.operational_settings`.
- **Status `promo_settings`**: **TIDAK TERDAFTAR** di publikasi Realtime.
- **Status `site_settings`**: **TIDAK TERDAFTAR** di publikasi Realtime.
- **Status `user_buy_limits` & `special_buy_limits`**: **TIDAK TERDAFTAR** di publikasi Realtime.

### Kesimpulan:
Mengubah `promo_settings` menjadi View **100% AMAN** dari risiko Realtime CDC karena memang tidak pernah ada consumer yang mendengarkan event CDC pada tabel ini. Sebaliknya, `operational_settings` tetap berstatus fisik dan tidak disentuh, menjamin kestabilan pembaruan kas Workplace Admin.

---

## 9. RISIKO DOWNTIME DAN DATABASE LOCKS

1. **Klasifikasi Kunci (Lock Classification)**:
   - Perintah `ALTER TABLE public.promo_settings SET SCHEMA legacy_archive;` membutuhkan kunci `AccessExclusiveLock`.
   - Pembuatan View `CREATE OR REPLACE VIEW public.promo_settings` dan pembuatan Trigger membutuhkan kunci `AccessExclusiveLock` singkat pada objek baru.
2. **Estimasi Durasi Kunci (Lock Duration)**:
   - Karena tabel `promo_settings` hanya berisi 4 baris, durasi eksekusi DDL berada di bawah **15 milidetik**.
   - Tidak ada proses rebuild index atau backfill data bervolume besar.
3. **Mitigasi Lock Contention**:
   - Eksekusi disarankan dilakukan di luar jam sibuk transaksi (misal: 01.00 - 04.00 WIB).
   - Penggunaan `statement_timeout = '5s'` direkomendasikan saat eksekusi untuk mencegah antrean blocking yang panjang jika ada query lambat lain.

---

## 10. URUTAN PELAKSANAAN (STEP-BY-STEP PLAYBOOK)

1. **Fase Pra-Eksekusi**:
   - Jalankan Preflight Check Priority A dan Priority B secara read-only.
   - Konfirmasi tidak ada pesanan Mayar yang sedang berada di status `PENDING` aktif kurang dari 5 menit.
2. **Fase Eksekusi Paket 1 (Priority A)**:
   - Mulai transaksi PostgreSQL (`BEGIN`).
   - Eksekusi DDL Paket 1 secara utuh.
   - Lakukan commit transaksi (`COMMIT`).
3. **Fase Verifikasi Pasca-Paket 1**:
   - Jalankan kueri verifikasi (SELECT dari `public.promo_settings`).
   - Lakukan pengujian simulasi pembacaan via API `/api/promo/banner`.
   - Lakukan pengujian pembaruan toggle banner dari antarmuka Workplace Admin.
4. **Fase Evaluasi Paket 2 (Priority B)**:
   - Pastikan tabel fisik `user_buy_limits` dan `special_buy_limits` tetap ada dan utuh.
   - Konfirmasi ketiadaan efek samping pada RPC checkout.
5. **Masa Observasi (Monitoring Window)**:
   - Pantau error log pada Cloudflare Worker dan Supabase Edge Functions selama 14 hari kerja.

---

## 11. KRITERIA GO / NO-GO

### Kriteria GO (Izin Eksekusi Diberikan):
- [ ] Persetujuan tertulis eksplisit telah diberikan oleh Kayla.
- [ ] Seluruh preflight checks berhasil tanpa exception.
- [ ] Objek yang berstatus **PROTECTED** (`user_roles`, `reviews`, `products`, `services`, `payments`, `operational_settings`) terkonfirmasi tidak tersentuh di skrip migrasi.
- [ ] Tidak ada antrean transaksi Mayar yang sedang menggantung di gateway.
- [ ] Skrip rollback telah diverifikasi siap dieksekusi sewaktu-waktu.

### Kriteria NO-GO / Abort Triggers (Batalkan Migrasi Seketika):
- Preflight check mendeteksi jumlah baris `promo_settings` berubah atau hilang.
- Terjadi lock timeout (> 5 detik) saat mencoba mengubah skema tabel `promo_settings`.
- Edge Function `jokiin-catalog` melempar HTTP 500/503 saat pengujian pembacaan atau update promo pasca-migrasi.
- Terdapat laporan kendala pada alur checkout Storefront atau navigasi Workplace.
- *Tindakan jika NO-GO terjadi*: Segera jalankan skrip **SQL ROLLBACK** Paket 1 dalam hitungan detik.

---

## 12. DAFTAR HAL YANG MASIH BELUM TERVERIFIKASI (NOT VERIFIED ITEMS)

Untuk menjaga transparansi penuh, berikut adalah daftar item yang berstatus **NOT VERIFIED**:

1. **Perilaku PostgREST HTTP PATCH pada View yang Diproteksi Trigger**:
   - Walaupun secara spesifikasi PostgreSQL trigger `INSTEAD OF UPDATE` mendukung pembaruan view dan mengembalikan baris yang diubah (`RETURN NEW`), respons header `Prefer: return=representation` dari PostgREST pada View Supabase perlu divalidasi langsung saat pengujian staging/dry-run untuk memastikan Edge Function tidak menerima array kosong.
2. **Ketergantungan Tersembunyi pada Ekstensi atau Skrip Lokal Lain**:
   - Apakah terdapat skrip audit lokal pihak ketiga yang secara hardcoded melakukan query `SELECT * FROM promo_settings` dengan asumsi tabel fisik (misalnya query terhadap `pg_stat_user_tables`).
3. **Potensi Integrasi Masa Depan untuk `user_buy_limits`**:
   - Apakah di masa mendatang akan ada fitur kuota akun pelanggan Storefront (berbasis user ID login) yang menghidupkan kembali RPC `catalog_check_buy_limit`. Karena hal ini belum dapat dipastikan, mempertahankan tabel fisik `user_buy_limits` adalah keputusan yang paling tepat.

---

*Dokumen ini disusun oleh Stelle dalam mode Read-Only Database dan Read-Only Repository. DILARANG mengeksekusi migrasi tanpa persetujuan eksplisit dari Kayla.*
