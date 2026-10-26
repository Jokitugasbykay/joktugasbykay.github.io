-- Preserve deployed checkout bodies and grants; remove only regular quantity
-- ceilings. Special checkout and stock checks remain unchanged.
DO $migration$
DECLARE
  function_name text;
  definition text;
  old_guard text;
  new_guard text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY['catalog_checkout_reguler', 'jokiin_create_order'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = function_name;

    IF function_name = 'catalog_checkout_reguler' THEN
      old_guard := 'IF v_qty < 1 OR v_qty > 100 THEN';
      new_guard := 'IF v_qty IS NULL OR v_qty < 1 THEN';
    ELSE
      old_guard := 'if v_qty not between 1 and 100 then';
      new_guard := 'if v_qty is null or v_qty < 1 then';
    END IF;

    IF strpos(definition, old_guard) > 0 THEN
      EXECUTE replace(definition, old_guard, new_guard);
    ELSIF strpos(definition, new_guard) = 0 THEN
      RAISE EXCEPTION 'Checkout guard changed for public.%; review before applying', function_name;
    END IF;
  END LOOP;
END
$migration$;
