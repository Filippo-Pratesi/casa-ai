-- Migration 051: Add mock cronistoria events for all non-sconosciuto properties that have none

DO $$
DECLARE
  v_ws_id uuid;
  v_prop  record;
  v_agent uuid;
  v_now   timestamptz := now();

  -- Titles pools per event type
  telefonata_titles  text[] := ARRAY['Primo contatto telefonico','Chiamata di follow-up','Telefonata con proprietario','Contatto via telefono','Chiamata informativa'];
  citofono_titles    text[] := ARRAY['Citofono senza risposta','Tentativo citofono','Passaggio in zona','Sopralluogo esterno','Citofono: nessuna risposta'];
  visita_titles      text[] := ARRAY['Prima visita immobile','Sopralluogo interno','Visita con cliente','Ispezione immobile','Visita conoscitiva'];
  nota_titles        text[] := ARRAY['Proprietario interessato a vendere','Immobile in buone condizioni','Da tenere monitoriato','Ottimo potenziale','Note generali'];
  incarico_titles    text[] := ARRAY['Incarico firmato','Mandato di vendita firmato','Accordo con proprietario','Contratto di mediazione firmato'];
  proposta_titles    text[] := ARRAY['Proposta ricevuta da acquirente','Offerta pervenuta','Primo interessato ha formulato offerta','Proposta scritta consegnata'];
  accettata_titles   text[] := ARRAY['Proposta accettata','Accordo raggiunto','Offerta accettata dal proprietario','Trattativa chiusa positivamente'];
  venduto_titles     text[] := ARRAY['Atto firmato dal notaio','Rogito completato','Vendita conclusa','Compravendita finalizzata'];
  locato_titles      text[] := ARRAY['Contratto di locazione firmato','Affitto concluso','Inquilino subentrato','Locazione completata'];
  stage_titles       text[] := ARRAY['Contatto qualificato','Interesse confermato','Proprietario conosciuto','Situazione chiarita'];

  nota_descs    text[] := ARRAY['Proprietario disponibile a valutare offerte.','Prezzo da negoziare ma margine presente.','Immobile in buone condizioni strutturali.','Necessita di piccoli interventi di manutenzione.','Zona molto richiesta dal mercato.'];
  visita_descs  text[] := ARRAY['Appartamento in ottime condizioni generali. Cucina da aggiornare.','Luminoso, bella vista. Piano alto con ascensore.','Struttura solida. Impianti recenti.','Potenziale inespresso. Prezzo interessante.','Buona esposizione solare. Spazi ben distribuiti.'];

BEGIN
  SELECT id INTO v_ws_id FROM workspaces LIMIT 1;

  FOR v_prop IN
    SELECT p.id, p.stage, p.agent_id, p.workspace_id
    FROM properties p
    WHERE p.stage != 'sconosciuto'
      AND p.workspace_id = v_ws_id
      AND NOT EXISTS (SELECT 1 FROM property_events pe WHERE pe.property_id = p.id)
  LOOP
    v_agent := COALESCE(v_prop.agent_id, (SELECT id FROM users WHERE workspace_id = v_ws_id LIMIT 1));

    -- ── IGNOTO: 1-2 events ─────────────────────────────────────────────────────
    IF v_prop.stage = 'ignoto' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'citofono',
         citofono_titles[1 + (abs(hashtext(v_prop.id::text)) % 5)],
         CASE (abs(hashtext(v_prop.id::text + 'sent')) % 3) WHEN 0 THEN 'positive' WHEN 1 THEN 'neutral' ELSE 'negative' END,
         v_now - interval '30 days' * (1 + (abs(hashtext(v_prop.id::text)) % 4)),
         v_now - interval '30 days' * (1 + (abs(hashtext(v_prop.id::text)) % 4)));

      IF (abs(hashtext(v_prop.id::text)) % 2) = 0 THEN
        INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
        VALUES
          (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'nota',
           nota_titles[1 + (abs(hashtext(v_prop.id::text + 'n2')) % 5)],
           'neutral',
           v_now - interval '20 days' * (1 + (abs(hashtext(v_prop.id::text + 'n2')) % 3)),
           v_now - interval '20 days' * (1 + (abs(hashtext(v_prop.id::text + 'n2')) % 3)));
      END IF;

    -- ── CONOSCIUTO: 2-3 events ─────────────────────────────────────────────────
    ELSIF v_prop.stage = 'conosciuto' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'telefonata',
         telefonata_titles[1 + (abs(hashtext(v_prop.id::text)) % 5)], NULL, 'positive',
         v_now - interval '70 days' * (1 + (abs(hashtext(v_prop.id::text)) % 2)),
         v_now - interval '70 days' * (1 + (abs(hashtext(v_prop.id::text)) % 2))),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'visita',
         visita_titles[1 + (abs(hashtext(v_prop.id::text + 'v')) % 5)],
         visita_descs[1 + (abs(hashtext(v_prop.id::text + 'vd')) % 5)], 'positive',
         v_now - interval '40 days' * (1 + (abs(hashtext(v_prop.id::text + 'v')) % 2)),
         v_now - interval '40 days' * (1 + (abs(hashtext(v_prop.id::text + 'v')) % 2)));

      IF (abs(hashtext(v_prop.id::text + 'c3')) % 2) = 0 THEN
        INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
        VALUES
          (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'nota',
           nota_titles[1 + (abs(hashtext(v_prop.id::text + 'c3')) % 5)], 'neutral',
           v_now - interval '10 days' * (1 + (abs(hashtext(v_prop.id::text + 'c3')) % 5)),
           v_now - interval '10 days' * (1 + (abs(hashtext(v_prop.id::text + 'c3')) % 5)));
      END IF;

    -- ── INCARICO: 3-4 events ───────────────────────────────────────────────────
    ELSIF v_prop.stage = 'incarico' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'telefonata',
         telefonata_titles[1 + (abs(hashtext(v_prop.id::text)) % 5)], 'positive',
         v_now - interval '90 days', v_now - interval '90 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'visita',
         visita_titles[1 + (abs(hashtext(v_prop.id::text + 'v')) % 5)], 'positive',
         v_now - interval '60 days', v_now - interval '60 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'incarico_firmato',
         incarico_titles[1 + (abs(hashtext(v_prop.id::text + 'i')) % 4)], 'positive',
         v_now - interval '30 days', v_now - interval '30 days');

      IF (abs(hashtext(v_prop.id::text + 'i4')) % 2) = 0 THEN
        INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
        VALUES
          (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'proposta_ricevuta',
           proposta_titles[1 + (abs(hashtext(v_prop.id::text + 'i4')) % 4)], 'positive',
           v_now - interval '10 days', v_now - interval '10 days');
      END IF;

    -- ── VENDUTO: 4-5 events ────────────────────────────────────────────────────
    ELSIF v_prop.stage = 'venduto' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'visita',
         visita_titles[1 + (abs(hashtext(v_prop.id::text + 'v')) % 5)], 'positive',
         v_now - interval '120 days', v_now - interval '120 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'incarico_firmato',
         incarico_titles[1 + (abs(hashtext(v_prop.id::text + 'i')) % 4)], 'positive',
         v_now - interval '90 days', v_now - interval '90 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'proposta_ricevuta',
         proposta_titles[1 + (abs(hashtext(v_prop.id::text + 'pr')) % 4)], 'positive',
         v_now - interval '45 days', v_now - interval '45 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'proposta_accettata',
         accettata_titles[1 + (abs(hashtext(v_prop.id::text + 'pa')) % 4)], 'positive',
         v_now - interval '20 days', v_now - interval '20 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'venduto',
         venduto_titles[1 + (abs(hashtext(v_prop.id::text + 'vend')) % 4)], 'positive',
         v_now - interval '5 days', v_now - interval '5 days');

    -- ── LOCATO: 3-4 events ─────────────────────────────────────────────────────
    ELSIF v_prop.stage = 'locato' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'visita',
         visita_titles[1 + (abs(hashtext(v_prop.id::text + 'v')) % 5)], 'positive',
         v_now - interval '60 days', v_now - interval '60 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'incarico_firmato',
         incarico_titles[1 + (abs(hashtext(v_prop.id::text + 'i')) % 4)], 'positive',
         v_now - interval '40 days', v_now - interval '40 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'proposta_accettata',
         accettata_titles[1 + (abs(hashtext(v_prop.id::text + 'pa')) % 4)], 'positive',
         v_now - interval '20 days', v_now - interval '20 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'locato',
         locato_titles[1 + (abs(hashtext(v_prop.id::text + 'loc')) % 4)], 'positive',
         v_now - interval '5 days', v_now - interval '5 days');

    -- ── DISPONIBILE: 2-3 events ────────────────────────────────────────────────
    ELSIF v_prop.stage = 'disponibile' THEN
      INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
      VALUES
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'cambio_stage',
         stage_titles[1 + (abs(hashtext(v_prop.id::text + 'cs')) % 4)], 'neutral',
         v_now - interval '30 days', v_now - interval '30 days'),
        (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'nota',
         nota_titles[1 + (abs(hashtext(v_prop.id::text + 'nd')) % 5)], 'neutral',
         v_now - interval '10 days', v_now - interval '10 days');

      IF (abs(hashtext(v_prop.id::text + 'disp3')) % 2) = 0 THEN
        INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, sentiment, event_date, created_at)
        VALUES
          (gen_random_uuid(), v_ws_id, v_prop.id, v_agent, 'telefonata',
           telefonata_titles[1 + (abs(hashtext(v_prop.id::text + 'disp3')) % 5)], 'positive',
           v_now - interval '5 days', v_now - interval '5 days');
      END IF;

    END IF;
  END LOOP;
END $$;
