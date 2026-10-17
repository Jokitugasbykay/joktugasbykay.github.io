-- Migration: Fix product stock synchronization & product sales tracking
-- Ensures stock is idempotently decremented when orders are confirmed PAID
-- Adds stock_deducted tracking, product_sales view and RPC for real-time sold count

-- 1. Add stock_deducted column to orders if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT false;

-- 2. Mark existing paid orders as stock_deducted
UPDATE public.orders
SET stock_deducted = true
WHERE payment_status = 'PAID';

-- 3. Set current stock for gemini-pro-18-bulan (Initial 20 - 8 paid = 12)
UPDATE public.services
SET stok = 12
WHERE slug = 'gemini-pro-18-bulan';

UPDATE public.products
SET stok = 12, updated_at = now()
WHERE slug = 'gemini-pro-18-bulan';

-- 4. Create trigger function for automatic stock management
CREATE OR REPLACE FUNCTION public.handle_order_stock_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_item JSONB;
  v_slug TEXT;
  v_qty INTEGER;
BEGIN
  -- Case 1: Order is/becomes PAID and stock has NOT been deducted yet
  IF NEW.payment_status = 'PAID' AND COALESCE(NEW.stock_deducted, false) = false THEN
    IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        v_slug := COALESCE(
          NULLIF(v_item->>'productId', ''),
          NULLIF(v_item->>'slug', ''),
          NULLIF(v_item->>'product_slug', ''),
          CASE 
            WHEN v_item->>'name' ILIKE '%gemini%' THEN 'gemini-pro-18-bulan'
            ELSE NULL
          END
        );
        v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, (v_item->>'qty')::int, 1));

        IF v_slug IS NOT NULL THEN
          -- Atomically decrement stock in services (only for rows where stok is not null)
          UPDATE public.services
          SET stok = GREATEST(0, stok - v_qty)
          WHERE slug = v_slug AND stok IS NOT NULL;

          -- Atomically decrement stock in products
          UPDATE public.products
          SET stok = GREATEST(0, stok - v_qty),
              updated_at = now()
          WHERE slug = v_slug;
        END IF;
      END LOOP;
    END IF;

    NEW.stock_deducted := true;
  END IF;

  -- Case 2: Order was PAID (and stock deducted), but is now cancelled or refunded
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.payment_status = 'PAID' AND COALESCE(OLD.stock_deducted, false) = true
       AND NEW.payment_status IN ('CANCELED', 'REFUNDED') THEN
      IF OLD.items IS NOT NULL AND jsonb_typeof(OLD.items) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(OLD.items)
        LOOP
          v_slug := COALESCE(
            NULLIF(v_item->>'productId', ''),
            NULLIF(v_item->>'slug', ''),
            NULLIF(v_item->>'product_slug', ''),
            CASE 
              WHEN v_item->>'name' ILIKE '%gemini%' THEN 'gemini-pro-18-bulan'
              ELSE NULL
            END
          );
          v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, (v_item->>'qty')::int, 1));

          IF v_slug IS NOT NULL THEN
            UPDATE public.services
            SET stok = stok + v_qty
            WHERE slug = v_slug AND stok IS NOT NULL;

            UPDATE public.products
            SET stok = stok + v_qty,
                updated_at = now()
            WHERE slug = v_slug;
          END IF;
        END LOOP;
      END IF;

      NEW.stock_deducted := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach trigger to orders
DROP TRIGGER IF EXISTS trg_order_stock_sync ON public.orders;
CREATE TRIGGER trg_order_stock_sync
  BEFORE INSERT OR UPDATE
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_stock_sync();

-- 6. RPC and View for Product Sales Stats
CREATE OR REPLACE FUNCTION public.get_product_sales_stats()
RETURNS TABLE (
  product_slug TEXT,
  total_sold BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    COALESCE(
      NULLIF(item->>'productId', ''),
      NULLIF(item->>'slug', ''),
      NULLIF(item->>'product_slug', ''),
      CASE 
        WHEN item->>'name' ILIKE '%gemini%' THEN 'gemini-pro-18-bulan'
        ELSE 'unknown'
      END
    )::text as product_slug,
    SUM(COALESCE((item->>'quantity')::int, (item->>'qty')::int, 1))::bigint as total_sold
  FROM public.orders,
       jsonb_array_elements(items) as item
  WHERE payment_status = 'PAID'
  GROUP BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_sales_stats() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.product_sales AS
SELECT * FROM public.get_product_sales_stats();

GRANT SELECT ON public.product_sales TO anon, authenticated, service_role;
