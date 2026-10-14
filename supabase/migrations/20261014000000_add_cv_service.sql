-- Migration: Add Pembuatan CV (Rp 10.000) to services and products
DO $$
BEGIN
  -- 1. Services table (used by storefront live catalogue & checkout RPC)
  IF NOT EXISTS (SELECT 1 FROM services WHERE slug = 'pembuatan-cv') THEN
    INSERT INTO services (id, name, slug, description, price, status, is_active, sale_percent, sale_amount, sale_label)
    VALUES (
      (SELECT COALESCE(MAX(id), 0) + 1 FROM services),
      'Pembuatan CV',
      'pembuatan-cv',
      'Jasa pembuatan CV profesional, menarik, dan ATS-friendly untuk kebutuhan magang, kerja, atau beasiswa.',
      10000.00,
      'active',
      true,
      0.00,
      0.00,
      NULL
    );
  ELSE
    UPDATE services
    SET name = 'Pembuatan CV',
        price = 10000.00,
        status = 'active',
        is_active = true
    WHERE slug = 'pembuatan-cv';
  END IF;

  -- 2. Products table (used by workplace admin produk-promo & catalog edge function)
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'pembuatan-cv') THEN
    INSERT INTO products (nama, slug, kategori, deskripsi, harga_dasar, diskon_persen, stok, batas_beli_per_orang, is_active, is_limited_edition, gambar_url)
    VALUES (
      'Pembuatan CV',
      'pembuatan-cv',
      'Desain',
      'Jasa pembuatan CV profesional, menarik, dan ATS-friendly untuk kebutuhan magang, kerja, atau beasiswa.',
      10000,
      0,
      100,
      5,
      true,
      false,
      NULL
    );
  ELSE
    UPDATE products
    SET nama = 'Pembuatan CV',
        harga_dasar = 10000,
        kategori = 'Desain',
        is_active = true
    WHERE slug = 'pembuatan-cv';
  END IF;
END $$;
