-- Migration: 043_seed_cronistoria_eventi.sql
-- Adds rich mock cronistoria events to all existing properties that have fewer than 3 events
-- Idempotent: only adds events to properties with < 3 existing events

DO $$
DECLARE
  v_prop    RECORD;
  v_ws_id   uuid;
  v_agent_id uuid;
  base_time timestamptz;
BEGIN
  -- Loop through all workspaces
  FOR v_ws_id IN
    SELECT DISTINCT workspace_id FROM properties
  LOOP
    -- Get the first agent for this workspace
    SELECT id INTO v_agent_id
    FROM users
    WHERE workspace_id = v_ws_id
    ORDER BY created_at
    LIMIT 1;

    IF v_agent_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Loop through all properties that have fewer than 3 events
    FOR v_prop IN
      SELECT p.id, p.stage, p.address
      FROM properties p
      LEFT JOIN (
        SELECT property_id, COUNT(*) AS ev_count
        FROM property_events
        GROUP BY property_id
      ) ec ON ec.property_id = p.id
      WHERE p.workspace_id = v_ws_id
        AND (ec.ev_count IS NULL OR ec.ev_count < 3)
    LOOP
      -- Spread base_time randomly over the past 6 months
      base_time := NOW() - (random() * INTERVAL '180 days');

      CASE v_prop.stage

        WHEN 'sconosciuto' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'citofono',
             'Tentativo citofono',
             'Citofono suonato, nessuna risposta. Palazzo in buone condizioni.',
             'neutral',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'nota',
             'Prima osservazione',
             'Immobile osservato durante il giro di zona. Possibile opportunità da monitorare.',
             'neutral',
             base_time + INTERVAL '2 days');

        WHEN 'ignoto' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'citofono',
             'Primo contatto citofono',
             'Citofono suonato ma risposta evasiva. Proposto appuntamento rifiutato.',
             'negative',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'telefonata',
             'Telefonata informativa',
             'Breve telefonata. Proprietario disponibile a valutare in futuro ma non ora.',
             'neutral',
             base_time + INTERVAL '7 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'nota',
             'Informazioni raccolte',
             'Immobile di circa 80mq stimati dall''esterno. Appartamento al 2° piano. Finestre nuove.',
             'neutral',
             base_time + INTERVAL '10 days');

        WHEN 'conosciuto' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'telefonata',
             'Prima telefonata approfondita',
             'Proprietario interessato a una valutazione. Ha già valutato con altro agente l''anno scorso.',
             'positive',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'visita',
             'Visita all''immobile',
             'Primo sopralluogo effettuato. Immobile in ottime condizioni, recentemente ristrutturato. Cucina abitabile, doppi servizi, esposizione sud.',
             'positive',
             base_time + INTERVAL '5 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'riunione',
             'Incontro per valutazione',
             'Presentata valutazione di mercato. Proprietario soddisfatto del prezzo stimato. Da concordare i termini dell''incarico.',
             'positive',
             base_time + INTERVAL '14 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'nota',
             'Follow-up pendente',
             'In attesa di risposta per firmare l''incarico. Il proprietario deve consultare la moglie prima di decidere.',
             'neutral',
             base_time + INTERVAL '20 days');

        WHEN 'incarico' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'telefonata',
             'Accordo preliminare',
             'Concordate le condizioni dell''incarico. Fissato appuntamento per la firma del contratto.',
             'positive',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'incarico_firmato',
             'Incarico firmato',
             'Contratto di intermediazione firmato. Mandato esclusivo 6 mesi. Provvigione 3% + IVA.',
             'positive',
             base_time + INTERVAL '3 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'visita',
             'Sopralluogo fotografico',
             'Foto professionali eseguite. Immobile presentato al meglio. Pubblicazione imminente sui principali portali.',
             'positive',
             base_time + INTERVAL '7 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'annuncio_creato',
             'Annuncio pubblicato',
             'Immobile pubblicato su tutti i portali. Già 12 visualizzazioni nelle prime 24 ore. Buona risposta iniziale.',
             'positive',
             base_time + INTERVAL '10 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'visita',
             'Visita con acquirente interessato',
             'Coppia interessata, primo sopralluogo molto positivo. Hanno richiesto un secondo appuntamento per la prossima settimana.',
             'positive',
             base_time + INTERVAL '21 days');

        WHEN 'venduto' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'proposta_ricevuta',
             'Proposta d''acquisto ricevuta',
             'Proposta formale presentata. Sotto il prezzo richiesto, in corso di valutazione con il proprietario.',
             'positive',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'proposta_accettata',
             'Proposta accettata',
             'Accordo raggiunto dopo breve trattativa. Prezzo finale concordato con entrambe le parti. Rogito da fissare.',
             'positive',
             base_time + INTERVAL '5 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'venduto',
             'Rogito completato',
             'Rogito notarile completato con successo. Chiavi consegnate al nuovo proprietario. Operazione conclusa.',
             'positive',
             base_time + INTERVAL '45 days');

        WHEN 'locato' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'visita',
             'Visita con potenziale inquilino',
             'Coppia interessata alla locazione. Ottima prima impressione. Garanzie adeguate, busta paga presentata.',
             'positive',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'proposta_ricevuta',
             'Proposta di locazione ricevuta',
             'Proposta canone mensile concordato. Contratto 4+4 con opzione di rinnovo. Caparra versata.',
             'positive',
             base_time + INTERVAL '3 days'),
            (v_ws_id, v_prop.id, v_agent_id,
             'locato',
             'Contratto di locazione firmato',
             'Contratto firmato e registrato all''Agenzia delle Entrate. Deposito cauzionale versato. Immobile consegnato.',
             'positive',
             base_time + INTERVAL '10 days');

        WHEN 'disponibile' THEN
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'contratto_scaduto',
             'Contratto scaduto',
             'Contratto di locazione scaduto. Inquilino ha lasciato l''immobile in buone condizioni. Cauzione restituita.',
             'neutral',
             base_time),
            (v_ws_id, v_prop.id, v_agent_id,
             'nota',
             'Immobile tornato disponibile',
             'Proprietario interessato a nuovo affitto. Piccoli lavori di manutenzione ordinaria in corso prima della rimessa sul mercato.',
             'neutral',
             base_time + INTERVAL '5 days');

        ELSE
          INSERT INTO property_events
            (workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
          VALUES
            (v_ws_id, v_prop.id, v_agent_id,
             'nota',
             'Prima nota',
             'Primo contatto registrato per questo immobile.',
             'neutral',
             base_time);

      END CASE;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Cronistoria eventi aggiunta con successo';
END $$;
