-- Migration 050: Fix zone mismatches for secondary cities
-- Properties in Viareggio/Genova/Padova/Venezia/Arezzo/Livorno were seeded with
-- generic zones (Zona Sud, Zona Nord, Periferia, Centro Storico) that don't match
-- the city-specific zones registered in the zones table.
-- Also adds zone entries for Arezzo and Livorno which had none.

DO $$
DECLARE
  v_ws_id uuid;
BEGIN
  -- Get workspace id (same workspace used throughout)
  SELECT id INTO v_ws_id FROM workspaces LIMIT 1;

  -- ── 1. Add missing zones for Arezzo ────────────────────────────────────────
  INSERT INTO zones (workspace_id, city, name)
  VALUES
    (v_ws_id, 'Arezzo', 'Centro Storico'),
    (v_ws_id, 'Arezzo', 'Saione'),
    (v_ws_id, 'Arezzo', 'Giotto')
  ON CONFLICT DO NOTHING;

  -- ── 2. Add missing zones for Livorno ────────────────────────────────────────
  INSERT INTO zones (workspace_id, city, name)
  VALUES
    (v_ws_id, 'Livorno', 'Centro'),
    (v_ws_id, 'Livorno', 'Venezia Nuova'),
    (v_ws_id, 'Livorno', 'Ardenza')
  ON CONFLICT DO NOTHING;

  -- ── 3. Reassign property zones to match zones table ─────────────────────────

  -- Viareggio: Centro / Lungomare / Darsena
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro'
      WHEN 1 THEN 'Lungomare'
      ELSE        'Darsena'
    END
  WHERE city = 'Viareggio';

  -- Genova: Centro Storico / Albaro / Nervi
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro Storico'
      WHEN 1 THEN 'Albaro'
      ELSE        'Nervi'
    END
  WHERE city = 'Genova';

  -- Padova: Centro Storico / Arcella / Pontevigodarzere
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro Storico'
      WHEN 1 THEN 'Arcella'
      ELSE        'Pontevigodarzere'
    END
  WHERE city = 'Padova';

  -- Venezia: Centro Storico / Lido / Mestre
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro Storico'
      WHEN 1 THEN 'Lido'
      ELSE        'Mestre'
    END
  WHERE city = 'Venezia';

  -- Arezzo: Centro Storico / Saione / Giotto
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro Storico'
      WHEN 1 THEN 'Saione'
      ELSE        'Giotto'
    END
  WHERE city = 'Arezzo';

  -- Livorno: Centro / Venezia Nuova / Ardenza
  UPDATE properties SET zone =
    CASE (abs(hashtext(id::text)) % 3)
      WHEN 0 THEN 'Centro'
      WHEN 1 THEN 'Venezia Nuova'
      ELSE        'Ardenza'
    END
  WHERE city = 'Livorno';

END $$;
