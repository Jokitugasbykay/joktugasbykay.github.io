# JOKI.IN Catalog — Panduan Pengembang

## Struktur Proyek

```
joktugasbykay.github.io/          ← Storefront (katalog publik)
├── index.html                    ← SPA utama, ~9700 baris
├── src/
│   ├── catalog.js                ← [BARU] Banner promo + grid produk dinamis
│   └── worker.js                 ← Service worker
├── supabase/
│   ├── functions/
│   │   ├── jokiin-api/           ← Checkout, tracking, review (existing)
│   │   └── jokiin-catalog/       ← [BARU] Catalog REST API
│   │       ├── index.ts
│   │       └── deno.json
│   └── migrations/
│       └── 20261012000000_catalog.sql  ← [BARU] Skema DB
├── tests/
│   └── catalog.test.cjs          ← [BARU] Tes aturan bisnis
└── .env.example

Jokiin-workplace.github.io/       ← Admin/Worker dashboard
├── index.html                    ← Shell SPA (sidebar + bottom nav)
├── js/
│   ├── app.js                    ← Router & auth
│   └── produk-promo.js           ← [BARU] Halaman Produk & Promo
└── css/
    └── style.css
```

---

## Cara Menjalankan Lokal

```bash
# 1. Kloning repo (sudah ada)
cd "C:\Users\Maulana Riski\.gemini\antigravity\scratch\joktugasbykay.github.io"

# 2. Copy .env.example ke .env (isi nilai asli)
cp .env.example .env

# 3. Deploy edge function ke Supabase
supabase functions deploy jokiin-catalog

# 4. Jalankan migrasi
supabase db push

# 5. Tes lokal (perlu Node 22+)
node --test tests/catalog.test.cjs

# 6. Serve katalog lokal
npx serve . -p 3000
```

---

## Deploy Migrasi Database

```sql
-- Jalankan via Supabase Dashboard > SQL Editor
-- atau: supabase db push
-- File: supabase/migrations/20261012000000_catalog.sql
```

Setelah migrasi:
1. **Buat bucket Storage** "banners" di Supabase Dashboard → Storage → New Bucket  
   ✅ Public bucket ✅ Max file size: 2MB

2. **Tambahkan user_roles** untuk admin pertama:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<UUID admin>', 'admin');
```

---

## API Endpoints (jokiin-catalog Edge Function)

Base URL: `https://xdbnwjvxqtpkoaigedsk.supabase.co/functions/v1/jokiin-catalog`

### Publik
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | /api/products | Semua produk aktif |
| GET | /api/products/:id | Satu produk (UUID atau slug) |
| GET | /api/promo/banner | Banner aktif + status penawaran spesial |
| POST | /api/auth/login | Login email+password |
| POST | /api/auth/logout | Logout |

### Admin + Worker (Bearer token)
| Method | Path | Siapa |
|--------|------|-------|
| PATCH | /api/admin/products/:id/stock | admin, worker |
| PATCH | /api/admin/products/:id/toggle | admin, worker |
| GET | /api/admin/sync/status | admin, worker |
| POST | /api/admin/products | **admin** |
| PUT | /api/admin/products/:id | **admin** |
| DELETE | /api/admin/products/:id | **admin** |
| PATCH | /api/admin/promo/penawaran-spesial | **admin** |
| POST | /api/admin/promo/banner/upload | **admin** |
| POST | /api/admin/sync | **admin** |

---

## Aturan Bisnis

| Aturan | Implementasi |
|--------|-------------|
| Stok tidak negatif | PostgreSQL RPC `catalog_decrement_stock` dengan FOR UPDATE |
| Batas beli per orang | PostgreSQL RPC `catalog_check_buy_limit` server-side |
| Banner hilang tanpa hapus gambar | PATCH `promo_settings` key `penawaran_spesial_aktif` |
| Diskon tidak ubah harga dasar | `harga_akhir = harga_dasar * (1 - diskon/100)` computed di frontend |
| Upload gambar aman | Random UUID filename + MIME validation + magic byte check |
| Rate limit login | 5x/60s per IP di edge function |

---

## Gaya Visual

### Katalog (publik, tema gelap)
```css
--bg:        #0a0e11
--text:      #eef3f1
--accent:    #1fd18b   /* hijau */
--badge:     #ffd54a   /* kuning */
--card-bg:   #0f161a
--card-border: #1d262b
```

### Admin Workplace (tema terang)
```css
--bg:        #f3f5f8
--sidebar:   #ffffff
--accent:    #3b4ba8   /* indigo */
--summary:   #4c5594   /* indigo card */
--promo-bg:  #fff8e6   /* kuning muda */
--promo-border: #f6d98a
```

Font: **Plus Jakarta Sans** (400, 600, 800)  
Tombol min-height: **44px**

---

## Tes

```bash
# Unit + integration tests
node --test tests/catalog.test.cjs

# Dengan token admin (untuk tes yang butuh auth)
CATALOG_ADMIN_TOKEN=xxx node --test tests/catalog.test.cjs
```

Tes yang tersedia:
- ✅ Public products hanya kembalikan is_active=true
- ✅ penawaran_spesial_aktif adalah boolean  
- ✅ Stok tidak boleh negatif (unit logic)
- ✅ Batas beli per orang (unit logic)
- ✅ Admin routes reject unauthenticated
- ✅ Login rate limit (400/401/429)
- ✅ Banner upload reject no-auth
- ✅ 404 untuk produk tidak ada
- ✅ Semua produk stok >= 0
- ✅ Banner render hanya jika aktif=true
- ✅ Countdown dari server_time bukan device clock
