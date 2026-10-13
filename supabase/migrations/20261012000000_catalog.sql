-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL CHECK (char_length(nama) <= 200),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  kategori TEXT NOT NULL CHECK (char_length(kategori) <= 80),
  deskripsi TEXT DEFAULT '' CHECK (char_length(deskripsi) <= 3000),
  harga_dasar BIGINT NOT NULL CHECK (harga_dasar >= 0),
  diskon_persen SMALLINT NOT NULL DEFAULT 0 CHECK (diskon_persen BETWEEN 0 AND 100),
  stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
  batas_beli_per_orang INTEGER NOT NULL DEFAULT 1 CHECK (batas_beli_per_orang >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_limited_edition BOOLEAN NOT NULL DEFAULT false,
  gambar_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Promo banners
CREATE TABLE IF NOT EXISTS promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL CHECK (char_length(judul) <= 200),
  gambar_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tampil_di_atas BOOLEAN NOT NULL DEFAULT true,
  urutan SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promo settings (key-value)
CREATE TABLE IF NOT EXISTS promo_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO promo_settings (key, value) VALUES
  ('penawaran_spesial_aktif', 'false'),
  ('promo_judul', 'Penawaran Spesial Minggu Ini'),
  ('promo_deadline', ''),
  ('catalog_url', 'https://jokiin.my.id')
ON CONFLICT (key) DO NOTHING;

-- Sync logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waktu TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success','error')),
  pesan TEXT NOT NULL DEFAULT ''
);

-- User roles (separate from profiles)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin','worker'))
);

-- User buy limits tracker
CREATE TABLE IF NOT EXISTS user_buy_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  jumlah_dibeli INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, product_id)
);

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_buy_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_banners" ON promo_banners;
CREATE POLICY "public_read_banners" ON promo_banners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_promo_settings" ON promo_settings;
CREATE POLICY "public_read_promo_settings" ON promo_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "workers_read_sync_logs" ON sync_logs;
CREATE POLICY "workers_read_sync_logs" ON sync_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_role_only_user_roles" ON user_roles;
CREATE POLICY "service_role_only_user_roles" ON user_roles FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_buy_limits" ON user_buy_limits;
CREATE POLICY "service_role_only_buy_limits" ON user_buy_limits FOR ALL USING (auth.role() = 'service_role');

-- RPC: decrement stock safely (row lock, no negative)
CREATE OR REPLACE FUNCTION catalog_decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stok INTEGER;
BEGIN
  SELECT stok INTO v_stok FROM products WHERE id = p_product_id FOR UPDATE;
  IF v_stok IS NULL OR v_stok < p_qty THEN
    RETURN FALSE;
  END IF;
  UPDATE products SET stok = stok - p_qty WHERE id = p_product_id;
  RETURN TRUE;
END;
$$;

-- RPC: check + increment buy limit
CREATE OR REPLACE FUNCTION catalog_check_buy_limit(p_user_id UUID, p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit INTEGER;
  v_dibeli INTEGER;
BEGIN
  SELECT batas_beli_per_orang INTO v_limit FROM products WHERE id = p_product_id;
  IF v_limit IS NULL THEN RETURN FALSE; END IF;
  SELECT COALESCE(jumlah_dibeli, 0) INTO v_dibeli
  FROM user_buy_limits WHERE user_id = p_user_id AND product_id = p_product_id;
  IF (v_dibeli + p_qty) > v_limit THEN
    RETURN FALSE;
  END IF;
  INSERT INTO user_buy_limits (user_id, product_id, jumlah_dibeli)
  VALUES (p_user_id, p_product_id, p_qty)
  ON CONFLICT (user_id, product_id) DO UPDATE
  SET jumlah_dibeli = user_buy_limits.jumlah_dibeli + p_qty;
  RETURN TRUE;
END;
$$;

-- Seed initial products matching design reference
INSERT INTO products (nama, slug, kategori, deskripsi, harga_dasar, diskon_persen, stok, batas_beli_per_orang, is_active, is_limited_edition) VALUES
  ('Gemini Pro 18 Bulan', 'gemini-pro-18-bulan', 'Digital', 'Akses penuh Gemini Advanced 18 bulan, Garansi selama 1 minggu, Akun pribadi siap pakai', 50000, 60, 20, 1, true, true),
  ('Cek Turnitin', 'cek-turnitin', 'Pengecekan', 'Pengecekan plagiarisme Turnitin no-repository aman dan cepat.', 4000, 0, 999, 10, true, false),
  ('Joki Skripsi', 'joki-skripsi', 'Penelitian', 'Pendampingan dan pengerjaan skripsi lengkap hingga sidang.', 16000000, 19, 10, 1, true, false),
  ('Joki PPT', 'joki-ppt', 'Desain', 'Pembuatan slide presentasi profesional, menarik, dan rapi.', 13000, 0, 100, 5, true, false),
  ('Joki Proposal Skripsi', 'joki-proposal-skripsi', 'Penelitian', 'Penyusunan proposal skripsi Bab 1-3 lengkap beserta referensi.', 1300000, 0, 25, 2, true, false)
ON CONFLICT (slug) DO NOTHING;
