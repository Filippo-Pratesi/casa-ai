-- Migration 044: Create zones for all cities and assign properties to zones
DO $$
DECLARE
  v_ws_id uuid;
BEGIN
  SELECT DISTINCT workspace_id INTO v_ws_id FROM properties LIMIT 1;

  -- Milano zones (already has 5, add more for completeness)
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Milano', 'Navigli'),
    (v_ws_id, 'Milano', 'Brera'),
    (v_ws_id, 'Milano', 'Porta Romana'),
    (v_ws_id, 'Milano', 'Isola'),
    (v_ws_id, 'Milano', 'City Life')
  ON CONFLICT DO NOTHING;

  -- Firenze zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Firenze', 'Centro Storico'),
    (v_ws_id, 'Firenze', 'Oltrarno'),
    (v_ws_id, 'Firenze', 'Campo di Marte'),
    (v_ws_id, 'Firenze', 'Novoli'),
    (v_ws_id, 'Firenze', 'Gavinana')
  ON CONFLICT DO NOTHING;

  -- Roma zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Roma', 'Centro Storico'),
    (v_ws_id, 'Roma', 'Prati'),
    (v_ws_id, 'Roma', 'Trastevere'),
    (v_ws_id, 'Roma', 'EUR'),
    (v_ws_id, 'Roma', 'Parioli')
  ON CONFLICT DO NOTHING;

  -- Napoli zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Napoli', 'Centro Storico'),
    (v_ws_id, 'Napoli', 'Chiaia'),
    (v_ws_id, 'Napoli', 'Posillipo'),
    (v_ws_id, 'Napoli', 'Vomero'),
    (v_ws_id, 'Napoli', 'Bagnoli')
  ON CONFLICT DO NOTHING;

  -- Bologna zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Bologna', 'Centro Storico'),
    (v_ws_id, 'Bologna', 'San Vitale'),
    (v_ws_id, 'Bologna', 'Bolognina'),
    (v_ws_id, 'Bologna', 'Colli'),
    (v_ws_id, 'Bologna', 'Navile')
  ON CONFLICT DO NOTHING;

  -- Torino zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Torino', 'Centro Storico'),
    (v_ws_id, 'Torino', 'Crocetta'),
    (v_ws_id, 'Torino', 'San Salvario'),
    (v_ws_id, 'Torino', 'Lingotto'),
    (v_ws_id, 'Torino', 'Barriera di Milano')
  ON CONFLICT DO NOTHING;

  -- Pisa zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Pisa', 'Centro Storico'),
    (v_ws_id, 'Pisa', 'Lungarno'),
    (v_ws_id, 'Pisa', 'Cisanello'),
    (v_ws_id, 'Pisa', 'San Martino'),
    (v_ws_id, 'Pisa', 'Porta a Lucca')
  ON CONFLICT DO NOTHING;

  -- Lucca zones
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Lucca', 'Centro Storico'),
    (v_ws_id, 'Lucca', 'San Marco'),
    (v_ws_id, 'Lucca', 'Sant''Anna'),
    (v_ws_id, 'Lucca', 'Pontetetto'),
    (v_ws_id, 'Lucca', 'Capannori')
  ON CONFLICT DO NOTHING;

  -- Minor cities
  INSERT INTO zones (workspace_id, city, name) VALUES
    (v_ws_id, 'Viareggio', 'Centro'),
    (v_ws_id, 'Viareggio', 'Lungomare'),
    (v_ws_id, 'Viareggio', 'Darsena'),
    (v_ws_id, 'Genova', 'Centro Storico'),
    (v_ws_id, 'Genova', 'Albaro'),
    (v_ws_id, 'Genova', 'Nervi'),
    (v_ws_id, 'Aosta', 'Centro'),
    (v_ws_id, 'Aosta', 'Zona Industriale'),
    (v_ws_id, 'Capri', 'Centro'),
    (v_ws_id, 'Capri', 'Marina Grande'),
    (v_ws_id, 'Padova', 'Centro Storico'),
    (v_ws_id, 'Padova', 'Arcella'),
    (v_ws_id, 'Padova', 'Pontevigodarzere'),
    (v_ws_id, 'Venezia', 'Centro Storico'),
    (v_ws_id, 'Venezia', 'Mestre'),
    (v_ws_id, 'Venezia', 'Lido')
  ON CONFLICT DO NOTHING;

  -- Assign zones to properties that have none or empty zone
  -- Use city-specific zone names, rotating via hashtext for variety
  UPDATE properties
  SET zone = (
    CASE city
      WHEN 'Milano' THEN
        CASE (abs(hashtext(id::text)) % 10)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Zona Mare'
          WHEN 2 THEN 'Collina'
          WHEN 3 THEN 'Periferia Nord'
          WHEN 4 THEN 'Zona Nuova'
          WHEN 5 THEN 'Navigli'
          WHEN 6 THEN 'Brera'
          WHEN 7 THEN 'Porta Romana'
          WHEN 8 THEN 'Isola'
          ELSE 'City Life'
        END
      WHEN 'Firenze' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Oltrarno'
          WHEN 2 THEN 'Campo di Marte'
          WHEN 3 THEN 'Novoli'
          ELSE 'Gavinana'
        END
      WHEN 'Roma' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Prati'
          WHEN 2 THEN 'Trastevere'
          WHEN 3 THEN 'EUR'
          ELSE 'Parioli'
        END
      WHEN 'Napoli' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Chiaia'
          WHEN 2 THEN 'Posillipo'
          WHEN 3 THEN 'Vomero'
          ELSE 'Bagnoli'
        END
      WHEN 'Bologna' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'San Vitale'
          WHEN 2 THEN 'Bolognina'
          WHEN 3 THEN 'Colli'
          ELSE 'Navile'
        END
      WHEN 'Torino' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Crocetta'
          WHEN 2 THEN 'San Salvario'
          WHEN 3 THEN 'Lingotto'
          ELSE 'Barriera di Milano'
        END
      WHEN 'Pisa' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Lungarno'
          WHEN 2 THEN 'Cisanello'
          WHEN 3 THEN 'San Martino'
          ELSE 'Porta a Lucca'
        END
      WHEN 'Lucca' THEN
        CASE (abs(hashtext(id::text)) % 5)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'San Marco'
          WHEN 2 THEN 'Sant''Anna'
          WHEN 3 THEN 'Pontetetto'
          ELSE 'Capannori'
        END
      WHEN 'Viareggio' THEN
        CASE (abs(hashtext(id::text)) % 3)
          WHEN 0 THEN 'Centro'
          WHEN 1 THEN 'Lungomare'
          ELSE 'Darsena'
        END
      WHEN 'Genova' THEN
        CASE (abs(hashtext(id::text)) % 3)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Albaro'
          ELSE 'Nervi'
        END
      WHEN 'Aosta' THEN
        CASE (abs(hashtext(id::text)) % 2)
          WHEN 0 THEN 'Centro'
          ELSE 'Zona Industriale'
        END
      WHEN 'Capri' THEN
        CASE (abs(hashtext(id::text)) % 2)
          WHEN 0 THEN 'Centro'
          ELSE 'Marina Grande'
        END
      WHEN 'Padova' THEN
        CASE (abs(hashtext(id::text)) % 3)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Arcella'
          ELSE 'Pontevigodarzere'
        END
      WHEN 'Venezia' THEN
        CASE (abs(hashtext(id::text)) % 3)
          WHEN 0 THEN 'Centro Storico'
          WHEN 1 THEN 'Mestre'
          ELSE 'Lido'
        END
      ELSE 'Centro'
    END
  )
  WHERE workspace_id = v_ws_id
    AND (zone IS NULL OR zone = '');

  RAISE NOTICE 'Migration 044 complete: zone create e assegnate a tutti gli immobili';
END $$;
