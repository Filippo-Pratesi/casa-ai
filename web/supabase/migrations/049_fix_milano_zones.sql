-- Migration 049: Fix Milano zone assignments
-- Migration 044 inserted zones Navigli/Brera/Porta Romana/Isola/City Life for Milano
-- but the UPDATE assigned values 0-4 to non-existent names (Centro Storico, Zona Mare, etc.)
-- This migration corrects Milano properties that have invalid zone names.

DO $$
DECLARE
  v_ws_id uuid;
BEGIN
  SELECT DISTINCT workspace_id INTO v_ws_id FROM properties LIMIT 1;

  -- Reassign Milano properties with non-existent zone names to valid zones
  UPDATE properties
  SET zone = CASE (abs(hashtext(id::text)) % 5)
    WHEN 0 THEN 'Navigli'
    WHEN 1 THEN 'Brera'
    WHEN 2 THEN 'Porta Romana'
    WHEN 3 THEN 'Isola'
    ELSE 'City Life'
  END
  WHERE workspace_id = v_ws_id
    AND city = 'Milano'
    AND zone IN ('Centro Storico', 'Zona Mare', 'Collina', 'Periferia Nord', 'Zona Nuova');

  RAISE NOTICE 'Migration 049 complete: zone Milano corrette';
END $$;
