-- Keep legacy DIGITAL order-code formats valid and add the requested PRGDGTL format.
ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_tipe_order_code_format_check,
  ADD CONSTRAINT payment_orders_tipe_order_code_format_check CHECK (
    (tipe = 'REGULER' AND order_code ~ '^NUG[A-HJ-NP-Z2-9]{26}$') OR
    (tipe = 'SPESIAL' AND order_code ~ '^SPCL[A-HJ-NP-Z2-9]{23}$') OR
    (tipe = 'DIGITAL' AND (
      order_code ~ '^PRGDGTL[A-HJ-NP-Z2-9]{13}$' OR
      order_code ~ '^DGT[A-HJ-NP-Z2-9]{24}$' OR
      order_code ~ '^NUG[A-HJ-NP-Z2-9]{26}$'
    ))
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_tipe_order_code_format_check,
  ADD CONSTRAINT orders_tipe_order_code_format_check CHECK (
    (tipe = 'REGULER' AND order_code ~ '^NUG[A-HJ-NP-Z2-9]{26}$') OR
    (tipe = 'SPESIAL' AND order_code ~ '^SPCL[A-HJ-NP-Z2-9]{23}$') OR
    (tipe = 'DIGITAL' AND (
      order_code ~ '^PRGDGTL[A-HJ-NP-Z2-9]{13}$' OR
      order_code ~ '^DGT[A-HJ-NP-Z2-9]{24}$' OR
      order_code ~ '^NUG[A-HJ-NP-Z2-9]{26}$'
    ))
  );
