-- Migration 041: Link every listing to at least one contact
-- For listings without a contact:
--   1. If property exists but has no owner_contact_id → assign a contact
--   2. If listing has no property_id → create property + assign contact

DO $$
DECLARE
  r_ws      record;
  v_ws_id   uuid;
  r_listing record;
  v_contact_id uuid;
  v_property_id uuid;
  v_agent_id uuid;
BEGIN
  FOR r_ws IN
    SELECT DISTINCT workspace_id FROM listings
  LOOP
    v_ws_id := r_ws.workspace_id;

    -- ── Case 1: listings with property but no owner_contact_id ────────────────
    FOR r_listing IN
      SELECT l.id AS listing_id, l.agent_id, l.property_id
      FROM listings l
      JOIN properties p ON p.id = l.property_id
      WHERE l.workspace_id = v_ws_id
        AND l.property_id IS NOT NULL
        AND p.owner_contact_id IS NULL
    LOOP
      -- Pick any existing contact in the workspace
      SELECT id INTO v_contact_id
      FROM contacts
      WHERE workspace_id = v_ws_id
      ORDER BY created_at
      LIMIT 1;

      -- If no contact exists, create one
      IF v_contact_id IS NULL THEN
        v_contact_id := gen_random_uuid();
        INSERT INTO contacts (id, workspace_id, first_name, last_name, phone, type)
        VALUES (v_contact_id, v_ws_id, 'Proprietario', 'Non Definito', '+39 000 0000000', 'seller')
        ON CONFLICT DO NOTHING;
      END IF;

      -- Link contact as owner
      UPDATE properties
      SET owner_contact_id = v_contact_id
      WHERE id = r_listing.property_id
        AND workspace_id = v_ws_id
        AND owner_contact_id IS NULL;

      -- Add property_contact record for this link
      INSERT INTO property_contacts (id, workspace_id, property_id, contact_id, role, is_primary)
      VALUES (gen_random_uuid(), v_ws_id, r_listing.property_id, v_contact_id, 'proprietario', true)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── Case 2: listings with no property_id at all ───────────────────────────
    FOR r_listing IN
      SELECT l.id AS listing_id, l.agent_id, l.address, l.city, l.property_type,
             l.transaction_type, l.sqm, l.rooms, l.price, l.created_at
      FROM listings l
      WHERE l.workspace_id = v_ws_id
        AND l.property_id IS NULL
    LOOP
      -- Pick or create a contact
      SELECT id INTO v_contact_id
      FROM contacts
      WHERE workspace_id = v_ws_id
      ORDER BY created_at
      LIMIT 1;

      IF v_contact_id IS NULL THEN
        v_contact_id := gen_random_uuid();
        INSERT INTO contacts (id, workspace_id, first_name, last_name, phone, type)
        VALUES (v_contact_id, v_ws_id, 'Proprietario', 'Annuncio', '+39 000 0000001', 'seller')
        ON CONFLICT DO NOTHING;
      END IF;

      -- Create property record for this listing
      v_property_id := gen_random_uuid();
      v_agent_id := r_listing.agent_id;

      INSERT INTO properties (
        id, workspace_id, agent_id,
        address, city, zone,
        property_type, transaction_type,
        sqm, rooms, bathrooms,
        estimated_value,
        listing_id,
        owner_contact_id,
        stage, owner_disposition,
        created_at
      ) VALUES (
        v_property_id, v_ws_id, v_agent_id,
        COALESCE(r_listing.address, 'Indirizzo non specificato'),
        COALESCE(r_listing.city, 'Città non specificata'),
        'Da definire',
        COALESCE(r_listing.property_type::text, 'apartment')::property_type,
        COALESCE(r_listing.transaction_type::text, 'vendita')::property_transaction_type,
        COALESCE(r_listing.sqm, 0),
        COALESCE(r_listing.rooms, 0),
        1,
        COALESCE(r_listing.price, 0),
        r_listing.listing_id,
        v_contact_id,
        'incarico',
        'incarico_firmato',
        r_listing.created_at
      )
      ON CONFLICT DO NOTHING;

      -- Back-link listing to property
      UPDATE listings
      SET property_id = v_property_id
      WHERE id = r_listing.listing_id
        AND workspace_id = v_ws_id
        AND property_id IS NULL;

      -- Add property_contact record
      INSERT INTO property_contacts (id, workspace_id, property_id, contact_id, role, is_primary)
      VALUES (gen_random_uuid(), v_ws_id, v_property_id, v_contact_id, 'proprietario', true)
      ON CONFLICT DO NOTHING;

      -- Create annuncio_creato event
      INSERT INTO property_events (
        id, workspace_id, property_id, agent_id,
        event_type, title, description,
        old_stage, new_stage, event_date
      ) VALUES (
        gen_random_uuid(), v_ws_id, v_property_id, v_agent_id,
        'annuncio_creato', 'Annuncio creato',
        'Annuncio creato e collegato automaticamente alla banca dati.',
        NULL, 'incarico', r_listing.created_at
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;
END;
$$;
