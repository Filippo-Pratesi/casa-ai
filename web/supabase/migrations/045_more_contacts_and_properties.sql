-- Migration 045: Add 150+ contacts and 250+ properties for realistic mock data
DO $$
DECLARE
  v_ws_id uuid;
  v_agent_ids uuid[];
  v_contact_ids uuid[];
  v_prop_ids uuid[];
  v_new_prop_id uuid;
  v_agent_id uuid;
  v_contact_id uuid;
  v_second_contact_id uuid;
  i int;
  first_names text[] := ARRAY[
    'Marco','Luca','Alessandro','Giuseppe','Francesco','Giovanni','Roberto','Stefano',
    'Andrea','Antonio','Paolo','Matteo','Alberto','Davide','Riccardo','Mario','Federico',
    'Nicola','Lorenzo','Claudio','Giorgio','Enrico','Massimo','Fabrizio','Simone',
    'Giulia','Maria','Anna','Francesca','Sara','Laura','Valentina','Chiara','Silvia',
    'Elena','Federica','Paola','Cristina','Barbara','Monica','Alessandra','Roberta',
    'Patrizia','Daniela','Lucia','Margherita','Serena','Irene','Beatrice','Elisa'
  ];
  last_names text[] := ARRAY[
    'Rossi','Bianchi','Ferrari','Esposito','Romano','Colombo','Ricci','Marino',
    'Greco','Bruno','Gallo','Conti','De Luca','Costa','Mancini','Giordano','Rizzo',
    'Lombardi','Moretti','Barbieri','Fontana','Santoro','Marini','Rinaldi','Caruso',
    'Ferretti','Serra','Pellegrini','Valentini','Barone','Monti','Ferraro','Russo',
    'Vitale','De Angelis','Catalano','Bernardi','Martini','Ferrara','Coppola'
  ];
  cities text[] := ARRAY[
    'Milano','Milano','Milano','Firenze','Firenze','Roma','Roma','Napoli',
    'Bologna','Torino','Pisa','Pisa','Lucca','Lucca','Viareggio',
    'Genova','Padova','Venezia','Arezzo','Livorno'
  ];
  city_zones text[] := ARRAY[
    -- Milano
    'Navigli','Brera','Porta Romana','Isola','City Life','Centro Storico','Zona Mare','Collina','Periferia Nord','Zona Nuova',
    -- Firenze
    'Centro Storico','Oltrarno','Campo di Marte','Novoli','Gavinana',
    -- Roma
    'Centro Storico','Prati','Trastevere','EUR','Parioli',
    -- Napoli
    'Centro Storico','Chiaia','Posillipo','Vomero','Bagnoli',
    -- Others
    'Centro Storico','Centro','Zona Nord','Zona Sud','Periferia'
  ];
  street_types text[] := ARRAY['Via','Corso','Viale','Piazza','Lungarno','Via della','Via delle','Via dei','Via del'];
  street_names text[] := ARRAY[
    'Roma','Milano','Venezia','Garibaldi','Mazzini','Cavour','Vittorio Emanuele',
    'Dante','Petrarca','Machiavelli','dei Mille','della Repubblica','San Giovanni',
    'Santa Maria','San Pietro','del Carmine','Nazionale','della Libertà','delle Rose',
    'del Pino','Verdi','Leopardi','Carducci','Foscolo','Alfieri','Ariosto','Tasso',
    'Colombo','Amerigo Vespucci','Marco Polo','Leonardo da Vinci','Michelangelo',
    'Raffaello','Botticelli','Donatello','Brunelleschi','della Vigna','dei Fiori',
    'delle Acacie','dei Platani','dei Tigli','delle Mimose','della Pace'
  ];
  prop_types text[] := ARRAY[
    'apartment','apartment','apartment','apartment',
    'house','house','house',
    'villa','villa',
    'commercial',
    'garage'
  ];
  stages text[] := ARRAY[
    'sconosciuto','sconosciuto','sconosciuto',
    'ignoto','ignoto','ignoto',
    'conosciuto','conosciuto',
    'incarico','incarico',
    'venduto',
    'locato',
    'disponibile'
  ];
  dispositions text[] := ARRAY[
    'non_definito','non_definito',
    'vende_sicuramente','vende_sicuramente',
    'sta_pensando','sta_pensando',
    'da_ricontattare',
    'incarico_firmato','incarico_firmato',
    'appena_acquistato',
    'non_vende'
  ];
  transaction_types text[] := ARRAY['vendita','vendita','vendita','affitto','affitto'];
  contact_roles property_contact_role[] := ARRAY[
    'proprietario','proprietario','proprietario',
    'moglie_marito',
    'figlio_figlia',
    'vicino',
    'portiere',
    'amministratore',
    'inquilino',
    'altro'
  ];
  n_first int;
  n_last int;
  n_cities int;
  n_street_types int;
  n_street_names int;
  n_prop_types int;
  n_stages int;
  n_dispositions int;
  n_transaction_types int;
  n_contact_roles int;
  v_city text;
  v_zone text;
  v_stage property_stage;
  v_disposition owner_disposition;
  v_sqm int;
  v_rooms int;
  v_est_value int;
  v_contact_type contact_type;
BEGIN
  SELECT DISTINCT workspace_id INTO v_ws_id FROM properties LIMIT 1;

  -- Get all agent IDs in workspace
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_agent_ids
  FROM users WHERE workspace_id = v_ws_id;

  n_first        := array_length(first_names, 1);
  n_last         := array_length(last_names, 1);
  n_cities       := array_length(cities, 1);
  n_street_types := array_length(street_types, 1);
  n_street_names := array_length(street_names, 1);
  n_prop_types   := array_length(prop_types, 1);
  n_stages       := array_length(stages, 1);
  n_dispositions := array_length(dispositions, 1);
  n_transaction_types := array_length(transaction_types, 1);
  n_contact_roles := array_length(contact_roles, 1);

  -- ── 150 new contacts ──────────────────────────────────────────────────────
  FOR i IN 1..150 LOOP
    v_contact_type := CASE (i % 5)
      WHEN 0 THEN 'seller'::contact_type
      WHEN 1 THEN 'buyer'::contact_type
      WHEN 2 THEN 'landlord'::contact_type
      WHEN 3 THEN 'renter'::contact_type
      ELSE 'other'::contact_type
    END;

    INSERT INTO contacts (
      id, workspace_id, agent_id, name, phone, email,
      type, roles, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_ws_id,
      v_agent_ids[1 + (i % array_length(v_agent_ids, 1))],
      first_names[1 + (i % n_first)] || ' ' || last_names[1 + ((i * 7) % n_last)],
      '+39 3' || lpad((10 + (i % 89))::text, 2, '0') || ' ' || lpad((i * 31337 % 9000000 + 1000000)::text, 7, '0'),
      lower(regexp_replace(first_names[1 + (i % n_first)], '\s+', '', 'g'))
        || '.' || lower(regexp_replace(last_names[1 + ((i * 7) % n_last)], '\s+', '_', 'g'))
        || i::text || '@email.it',
      v_contact_type,
      ARRAY[v_contact_type::text],
      NOW() - (((i * 2) % 365) || ' days')::interval,
      NOW() - (((i * 2) % 365) || ' days')::interval
    );
  END LOOP;

  RAISE NOTICE '150 contatti creati';

  -- Refresh full contact ID list (existing + new)
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_contact_ids
  FROM contacts WHERE workspace_id = v_ws_id;

  -- ── 250 new properties ────────────────────────────────────────────────────
  FOR i IN 1..250 LOOP
    v_new_prop_id  := gen_random_uuid();
    v_agent_id     := v_agent_ids[1 + (i % array_length(v_agent_ids, 1))];
    v_contact_id   := v_contact_ids[1 + ((i * 13) % array_length(v_contact_ids, 1))];
    v_city         := cities[1 + (i % n_cities)];
    v_stage        := stages[1 + (i % n_stages)]::property_stage;
    v_disposition  := dispositions[1 + ((i * 3) % n_dispositions)]::owner_disposition;

    -- Pick a zone that makes sense for the city
    v_zone := CASE v_city
      WHEN 'Milano'   THEN (ARRAY['Navigli','Brera','Porta Romana','Isola','City Life','Centro Storico','Zona Mare','Collina','Periferia Nord','Zona Nuova'])[1 + (abs(i * 3) % 10)]
      WHEN 'Firenze'  THEN (ARRAY['Centro Storico','Oltrarno','Campo di Marte','Novoli','Gavinana'])[1 + (abs(i * 3) % 5)]
      WHEN 'Roma'     THEN (ARRAY['Centro Storico','Prati','Trastevere','EUR','Parioli'])[1 + (abs(i * 3) % 5)]
      WHEN 'Napoli'   THEN (ARRAY['Centro Storico','Chiaia','Posillipo','Vomero','Bagnoli'])[1 + (abs(i * 3) % 5)]
      WHEN 'Bologna'  THEN (ARRAY['Centro Storico','San Vitale','Bolognina','Colli','Navile'])[1 + (abs(i * 3) % 5)]
      WHEN 'Torino'   THEN (ARRAY['Centro Storico','Crocetta','San Salvario','Lingotto','Barriera di Milano'])[1 + (abs(i * 3) % 5)]
      WHEN 'Pisa'     THEN (ARRAY['Centro Storico','Lungarno','Cisanello','San Martino','Porta a Lucca'])[1 + (abs(i * 3) % 5)]
      WHEN 'Lucca'    THEN (ARRAY['Centro Storico','San Marco','Sant''Anna','Pontetetto','Capannori'])[1 + (abs(i * 3) % 5)]
      ELSE (ARRAY['Centro','Zona Nord','Zona Sud','Periferia','Centro Storico'])[1 + (abs(i * 3) % 5)]
    END;

    v_sqm   := 40 + (i * 7 % 160);
    v_rooms := 1 + (i % 6);
    v_est_value := CASE transaction_types[1 + (i % n_transaction_types)]
      WHEN 'affitto' THEN 400 + (i * 47 % 1600)
      ELSE 80000 + (i * 1777 % 420000)
    END;

    INSERT INTO properties (
      id, workspace_id, agent_id,
      address, city, zone,
      stage, owner_disposition, transaction_type, property_type,
      sqm, rooms, bathrooms, floor, total_floors,
      estimated_value,
      owner_contact_id,
      latitude, longitude,
      created_at, updated_at
    ) VALUES (
      v_new_prop_id,
      v_ws_id,
      v_agent_id,
      street_types[1 + (i % n_street_types)] || ' ' || street_names[1 + ((i * 3) % n_street_names)] || ', ' || (1 + i % 120)::text,
      v_city,
      v_zone,
      v_stage,
      v_disposition,
      transaction_types[1 + (i % n_transaction_types)]::property_transaction_type,
      prop_types[1 + (i % n_prop_types)],
      v_sqm,
      v_rooms,
      1 + (i % 3),        -- bathrooms
      (i % 10),           -- floor
      2 + (i % 9),        -- total_floors
      v_est_value,
      CASE WHEN v_stage IN ('conosciuto','incarico','venduto','locato','disponibile')
        THEN v_contact_id ELSE NULL END,
      CASE v_city
        WHEN 'Milano'  THEN 45.4642 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Firenze' THEN 43.7696 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Roma'    THEN 41.9028 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Napoli'  THEN 40.8518 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Bologna' THEN 44.4949 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Torino'  THEN 45.0703 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Pisa'    THEN 43.7228 + (((i * 17) % 100)::numeric / 1000)
        WHEN 'Lucca'   THEN 43.8430 + (((i * 17) % 100)::numeric / 1000)
        ELSE 43.5 + (((i * 17) % 200)::numeric / 1000)
      END,
      CASE v_city
        WHEN 'Milano'  THEN 9.1900 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Firenze' THEN 11.2558 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Roma'    THEN 12.4964 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Napoli'  THEN 14.2681 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Bologna' THEN 11.3426 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Torino'  THEN 7.6869 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Pisa'    THEN 10.4017 + (((i * 13) % 100)::numeric / 1000)
        WHEN 'Lucca'   THEN 10.5047 + (((i * 13) % 100)::numeric / 1000)
        ELSE 11.0 + (((i * 13) % 300)::numeric / 1000)
      END,
      NOW() - (((i * 3) % 270) || ' days')::interval,
      NOW() - ((i % 30) || ' days')::interval
    ) ON CONFLICT DO NOTHING;

    -- Link primary contact to property_contacts for relevant stages
    IF v_stage IN ('conosciuto','incarico','venduto','locato','disponibile') THEN
      INSERT INTO property_contacts (
        id, workspace_id, property_id, contact_id, role, is_primary, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_ws_id,
        v_new_prop_id,
        v_contact_id,
        'proprietario',
        true,
        NOW() - (((i * 3) % 270) || ' days')::interval,
        NOW() - (((i * 3) % 270) || ' days')::interval
      ) ON CONFLICT DO NOTHING;

      -- Add a secondary contact for ~40% of properties
      IF (i % 5) < 2 THEN
        v_second_contact_id := v_contact_ids[1 + ((i * 19 + 7) % array_length(v_contact_ids, 1))];
        IF v_second_contact_id <> v_contact_id THEN
          INSERT INTO property_contacts (
            id, workspace_id, property_id, contact_id, role, is_primary, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            v_ws_id,
            v_new_prop_id,
            v_second_contact_id,
            contact_roles[1 + ((i * 5) % n_contact_roles)],
            false,
            NOW() - (((i * 3) % 270) || ' days')::interval,
            NOW() - (((i * 3) % 270) || ' days')::interval
          ) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '250 immobili creati';

  -- ── Redistribute existing properties across all agents ────────────────────
  UPDATE properties
  SET agent_id = v_agent_ids[1 + (abs(hashtext(id::text)) % array_length(v_agent_ids, 1))]
  WHERE workspace_id = v_ws_id;

  -- ── Assign owner_contact_id to existing conosciuto+/incarico+ properties
  --    that have no owner set yet
  WITH contact_assign AS (
    SELECT p.id,
      v_contact_ids[1 + (abs(hashtext(p.id::text)) % array_length(v_contact_ids, 1))] AS cid
    FROM properties p
    WHERE p.workspace_id = v_ws_id
      AND p.stage IN ('conosciuto','incarico','venduto','locato','disponibile')
      AND p.owner_contact_id IS NULL
  )
  UPDATE properties
  SET owner_contact_id = contact_assign.cid
  FROM contact_assign
  WHERE properties.id = contact_assign.id;

  -- ── Add property_contacts rows for pre-existing properties that lack them
  INSERT INTO property_contacts (id, workspace_id, property_id, contact_id, role, is_primary, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    p.workspace_id,
    p.id,
    p.owner_contact_id,
    'proprietario',
    true,
    p.created_at,
    p.updated_at
  FROM properties p
  WHERE p.workspace_id = v_ws_id
    AND p.owner_contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM property_contacts pc
      WHERE pc.property_id = p.id AND pc.contact_id = p.owner_contact_id
    )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Migration 045 complete: 150 contatti + 250 immobili aggiunti, dati distribuiti tra agenti';
END $$;
