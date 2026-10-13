-- Migration: Special Offer Checkout (Penawaran Spesial), Cart Separation & Order ID Rules
-- Regular Order ID: NUG + 26 random chars = 29 chars total (no 0/O/1/I/L)
-- Special Order ID: SPCL + 23 random chars = 27 chars total (no 0/O/1/I/L)

CREATE OR REPLACE FUNCTION public.generate_jokiin_order_id(p_tipe TEXT DEFAULT 'REGULER')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_prefix TEXT;
  v_target_len INTEGER;
  v_suffix TEXT;
  v_bytes BYTEA;
  v_byte INTEGER;
  v_idx INTEGER;
  v_candidate TEXT;
BEGIN
  IF upper(coalesce(p_tipe, 'REGULER')) = 'SPESIAL' THEN
    v_prefix := 'SPCL';
    v_target_len := 23;
  ELSE
    v_prefix := 'NUG';
    v_target_len := 26;
  END IF;

  LOOP
    v_suffix := '';
    WHILE char_length(v_suffix) < v_target_len LOOP
      v_bytes := extensions.gen_random_bytes(64);
      FOR v_idx IN 0..63 LOOP
        EXIT WHEN char_length(v_suffix) >= v_target_len;
        v_byte := get_byte(v_bytes, v_idx);
        IF v_byte < 248 THEN
          v_suffix := v_suffix || substr(v_alphabet, (v_byte % 31) + 1, 1);
        END IF;
      END LOOP;
    END LOOP;

    v_candidate := v_prefix || v_suffix;

    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_candidate)
       AND NOT EXISTS (SELECT 1 FROM public.payment_orders WHERE order_code = v_candidate) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tipe TEXT NOT NULL DEFAULT 'REGULER',
  ADD COLUMN IF NOT EXISTS total BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nama TEXT,
  ADD COLUMN IF NOT EXISTS nim TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS gmail TEXT,
  ADD COLUMN IF NOT EXISTS judul_tugas TEXT,
  ADD COLUMN IF NOT EXISTS deadline TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT;

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS tipe TEXT NOT NULL DEFAULT 'REGULER',
  ADD COLUMN IF NOT EXISTS total BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nama TEXT,
  ADD COLUMN IF NOT EXISTS nim TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS gmail TEXT,
  ADD COLUMN IF NOT EXISTS judul_tugas TEXT,
  ADD COLUMN IF NOT EXISTS deadline TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code_unique ON public.orders(order_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_order_code_unique ON public.payment_orders(order_code);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  produk TEXT NOT NULL,
  product_slug TEXT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  harga_satuan BIGINT NOT NULL CHECK (harga_satuan >= 0),
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.carts (
  id TEXT PRIMARY KEY,
  tipe TEXT CHECK (tipe IN ('REGULER', 'SPESIAL')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.special_buy_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL,
  gmail TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_special_buy_limits_gmail ON public.special_buy_limits(product_id, lower(gmail));
CREATE INDEX IF NOT EXISTS idx_special_buy_limits_whatsapp ON public.special_buy_limits(product_id, whatsapp);
ALTER TABLE public.special_buy_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.catalog_checkout_spesial(
  p_slug TEXT,
  p_qty INTEGER,
  p_nama TEXT,
  p_nim TEXT,
  p_whatsapp TEXT,
  p_gmail TEXT,
  p_user_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Mayar'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_bought INTEGER;
  v_unit_price BIGINT;
  v_subtotal BIGINT;
  v_total BIGINT;
  v_order_code TEXT;
  v_customer JSONB;
  v_task JSONB;
  v_items JSONB;
  v_now TIMESTAMPTZ := now();
  v_order_id BIGINT;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RAISE EXCEPTION 'INVALID_QTY: Jumlah pembelian minimal 1.';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE (slug = p_slug OR id::text = p_slug) AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Produk Penawaran Spesial tidak ditemukan atau sedang tidak aktif.';
  END IF;

  IF v_product.is_limited_edition IS NOT TRUE THEN
    RAISE EXCEPTION 'CART_TYPE_CONFLICT: Produk reguler tidak dapat diproses melalui checkout Penawaran Spesial.';
  END IF;

  IF v_product.stok <= 0 OR v_product.stok < p_qty THEN
    RAISE EXCEPTION 'OUT_OF_STOCK: Maaf, stok % sudah habis atau tidak mencukupi (sisa stok: %).', v_product.nama, v_product.stok;
  END IF;

  -- Batas pembelian 1 hari 1x per orang (dalam kurun waktu 24 jam terakhir berdasarkan Gmail atau WhatsApp)
  SELECT COALESCE(SUM(s.qty), 0) INTO v_bought
  FROM public.special_buy_limits s
  LEFT JOIN public.payment_orders p ON p.order_code = s.order_code
  WHERE s.product_id = v_product.id
    AND (lower(s.gmail) = lower(trim(p_gmail)) OR s.whatsapp = trim(p_whatsapp))
    AND s.created_at >= (now() - interval '24 hours')
    AND (p.payment_status IS NULL OR p.payment_status NOT IN ('CANCELED', 'EXPIRED', 'FAILED'));

  IF (v_bought + p_qty) > COALESCE(v_product.batas_beli_per_orang, 1) THEN
    RAISE EXCEPTION 'BUY_LIMIT_EXCEEDED: Batas pembelian Penawaran Spesial maksimal %x per hari per orang (berdasarkan Gmail atau WhatsApp). Anda sudah membeli hari ini, silakan coba lagi besok.', COALESCE(v_product.batas_beli_per_orang, 1);
  END IF;

  v_unit_price := GREATEST(0, ROUND(v_product.harga_dasar * (100 - COALESCE(v_product.diskon_persen, 0)) / 100.0))::bigint;
  v_subtotal := v_unit_price * p_qty;
  v_total := v_subtotal;

  UPDATE public.products
  SET stok = stok - p_qty,
      updated_at = v_now
  WHERE id = v_product.id;

  v_order_code := public.generate_jokiin_order_id('SPESIAL');

  INSERT INTO public.special_buy_limits (product_id, order_code, gmail, whatsapp, qty)
  VALUES (v_product.id, v_order_code, lower(trim(p_gmail)), trim(p_whatsapp), p_qty);

  INSERT INTO public.order_items (order_id, produk, product_slug, qty, harga_satuan, subtotal)
  VALUES (v_order_code, v_product.nama, v_product.slug, p_qty, v_unit_price, v_subtotal);

  v_customer := jsonb_build_object(
    'name', trim(p_nama),
    'nim', COALESCE(NULLIF(trim(COALESCE(p_nim, '')), ''), '-'),
    'whatsapp', trim(p_whatsapp),
    'email', lower(trim(p_gmail))
  );

  v_task := jsonb_build_object(
    'title', 'Penawaran Spesial: ' || v_product.nama,
    'deadline', '-',
    'notes', 'Penawaran Spesial LIMITED EDITION (' || v_product.nama || ')',
    'files', '[]'::jsonb
  );

  v_items := jsonb_build_array(
    jsonb_build_object(
      'productId', v_product.slug,
      'name', v_product.nama,
      'price', v_unit_price,
      'quantity', p_qty,
      'subtotal', v_subtotal,
      'is_limited_edition', true,
      'tipe', 'SPESIAL'
    )
  );

  INSERT INTO public.orders (
    user_id, order_code, tipe, status, total, total_price, subtotal, discount, service_fee, payment_fee,
    payment_method, payment_status, nama, nim, whatsapp, gmail, judul_tugas, deadline, catatan,
    items, customer, task, notes, estimated_completion, created_at
  ) VALUES (
    p_user_id, v_order_code, 'SPESIAL', 'pending', v_total, v_total, v_subtotal, 0, 0, 0,
    COALESCE(p_payment_method, 'Mayar'), 'PENDING',
    trim(p_nama), COALESCE(NULLIF(trim(COALESCE(p_nim, '')), ''), '-'), trim(p_whatsapp), lower(trim(p_gmail)),
    NULL, NULL, NULL,
    v_items, v_customer, v_task, 'Penawaran Spesial LIMITED EDITION', v_now + interval '1 day', v_now
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.payment_orders (
    order_code, tipe, status, payment_status, total, total_price,
    nama, nim, whatsapp, gmail, judul_tugas, deadline, catatan,
    customer, task, items, user_id, payment_method, promo, expires_at, created_at
  ) VALUES (
    v_order_code, 'SPESIAL', 'pending', 'PENDING', v_total, v_total,
    trim(p_nama), COALESCE(NULLIF(trim(COALESCE(p_nim, '')), ''), '-'), trim(p_whatsapp), lower(trim(p_gmail)),
    NULL, NULL, NULL,
    v_customer, v_task, v_items, p_user_id, COALESCE(p_payment_method, 'Mayar'), '', v_now + interval '24 hours', v_now
  );

  RETURN jsonb_build_object(
    'id', v_order_code,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'tipe', 'SPESIAL',
    'status', 'pending',
    'payment_status', 'PENDING',
    'total', v_total,
    'total_price', v_total,
    'subtotal', v_subtotal,
    'nama', trim(p_nama),
    'nim', COALESCE(NULLIF(trim(COALESCE(p_nim, '')), ''), '-'),
    'whatsapp', trim(p_whatsapp),
    'gmail', lower(trim(p_gmail)),
    'items', v_items,
    'customer', v_customer,
    'product', jsonb_build_object(
      'id', v_product.id,
      'nama', v_product.nama,
      'slug', v_product.slug,
      'harga_satuan', v_unit_price,
      'qty', p_qty,
      'subtotal', v_subtotal,
      'is_limited_edition', v_product.is_limited_edition,
      'stok_sisa', v_product.stok - p_qty
    ),
    'created_at', v_now
  );
END;
$$;
