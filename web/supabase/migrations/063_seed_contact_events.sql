-- Seed realistic contact event history (cronistoria) for all existing contacts
-- Generated mock data with logical interaction sequences for demonstration

DO $$
DECLARE
  contact_rec RECORD;
  listing_id uuid;
  property_id uuid;
  event_date timestamptz;
BEGIN
  -- Iterate through all contacts and generate event history
  FOR contact_rec IN
    SELECT c.id, c.workspace_id, c.type, c.name, c.agent_id, c.created_at
    FROM contacts c
    WHERE c.deleted_at IS NULL
    ORDER BY c.workspace_id, c.id
  LOOP
    -- Get random listing for potential proposals
    SELECT l.id INTO listing_id FROM listings
    WHERE workspace_id = contact_rec.workspace_id
    ORDER BY random() LIMIT 1;

    -- Get random property for reference
    SELECT p.id INTO property_id FROM properties
    WHERE workspace_id = contact_rec.workspace_id
    ORDER BY random() LIMIT 1;

    -- EVENT 1: First contact note (creation day)
    event_date := contact_rec.created_at;
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'nota',
      'Primo contatto',
      CASE contact_rec.type
        WHEN 'buyer' THEN 'Cliente interessato a acquistare. Compilato form online con preferenze. Segue-up necessario.'
        WHEN 'seller' THEN 'Proprietario interessato a vendere. Contatto iniziale molto promettente. Visita preliminare consigliata.'
        WHEN 'renter' THEN 'Inquilino interessato a locare. Necessita urgentemente tra 1-2 mesi. Buona potenziale.'
        WHEN 'landlord' THEN 'Proprietario che desidera affittare. Immobile in buone condizioni. Interesse alto.'
        ELSE 'Nuovo contatto registrato. Necessario approfondimento iniziale.'
      END,
      event_date,
      event_date
    );

    -- EVENT 2: First call (3 days later)
    event_date := contact_rec.created_at + interval '3 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'chiamata',
      'Prima telefonata di consultazione',
      CASE contact_rec.type
        WHEN 'buyer' THEN 'Discussione su budget, timeline, e preferenze. Cliente molto disponibile a riunioni. Interesse confermato.'
        WHEN 'seller' THEN 'Visione preliminare dell''immobile concordata. Proprietario organizzato. Quotazione di mercato discussa.'
        WHEN 'renter' THEN 'Discussi requisiti di locazione. Cliente ha dichiarato disponibilità economica. Referenze da controllare.'
        WHEN 'landlord' THEN 'Discussione su condizioni di locazione, costi di gestione, e profilo inquilino ideale. Molto collaborativo.'
        ELSE 'Conversazione iniziale positiva. Nuove informazioni raccolte su esigenze e timeline.'
      END,
      event_date,
      event_date
    );

    -- EVENT 3: Email with documentation (5 days after creation)
    event_date := contact_rec.created_at + interval '5 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'email',
      'Invio documentazione e proposte iniziali',
      'Email inviata con catalogo, schede tecniche, e 3-5 proprietà che corrispondono ai criteri dichiarati durante la chiamata.',
      event_date,
      event_date
    );

    -- EVENT 4: Appointment scheduled (8 days after creation)
    event_date := contact_rec.created_at + interval '8 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'appuntamento',
      'Riunione di consultazione in agenzia',
      'Incontro in persona per valutare opzioni disponibili, discutere strategy di ricerca, e stabilire timeline d''azione.',
      event_date,
      event_date
    );

    -- EVENT 5: Property proposal (12 days after creation - if listing exists)
    IF listing_id IS NOT NULL THEN
      event_date := contact_rec.created_at + interval '12 days';
      INSERT INTO contact_events (
        workspace_id, contact_id, agent_id, event_type, title, body, related_listing_id, event_date, created_at
      ) VALUES (
        contact_rec.workspace_id,
        contact_rec.id,
        contact_rec.agent_id,
        'immobile_proposto',
        'Nuova proposta: ' || COALESCE((SELECT address FROM listings WHERE id = listing_id LIMIT 1), 'Immobile interessante'),
        'Immobile appena disponibile che soddisfa perfettamente i criteri espressi. Visita consigliata per questo fine settimana.',
        listing_id,
        event_date,
        event_date
      );
    END IF;

    -- EVENT 6: Follow-up note (15 days after creation)
    event_date := contact_rec.created_at + interval '15 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'nota',
      'Feedback post-appuntamento',
      CASE contact_rec.type
        WHEN 'buyer' THEN 'Cliente ha visitato 2 proprietà interessanti. Feedback positivo su una. Desideroso di approfondire. Timeline: decisione entro 2 settimane.'
        WHEN 'seller' THEN 'Valutazione preliminare completata. Prezzo di mercato concordato. Proprietario pronto per pubblicare annuncio online.'
        WHEN 'renter' THEN 'Cliente ha visitato appartamento disponibile. Ha fatto buona impressione ai proprietari. In attesa di decision.'
        WHEN 'landlord' THEN 'Proprietario soddisfatto dell''agenzia e documentazione fornita. Pronto a procedere con quotazione online e contatti.'
        ELSE 'Feedback positivo ricevuto dal cliente. Engagement buono. Prossime azioni pianificate.'
      END,
      event_date,
      event_date
    );

    -- EVENT 7: Campaign email (18 days after creation)
    event_date := contact_rec.created_at + interval '18 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'campagna_inviata',
      'Newsletter settimanale - Nuove disponibilità',
      'Newsletter automatica con ultimi annunci disponibili potenzialmente rilevanti per il profilo e preferenze del cliente.',
      event_date,
      event_date
    );

    -- EVENT 8: Important status update (25 days after creation)
    event_date := contact_rec.created_at + interval '25 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'nota',
      'Aggiornamento importante della situazione',
      CASE contact_rec.type
        WHEN 'buyer' THEN 'Cliente ha deciso di fare offerta per una proprietà. Pre-approvazione mutuo in corso. Previsione closing tra 6-8 settimane. Momentum positivo.'
        WHEN 'seller' THEN 'Annuncio pubblicato su 5 piattaforme. Già ricevute 4 richieste di visita per il prossimo weekend. Response molto positivo.'
        WHEN 'renter' THEN 'Contratto di locazione praticamente concordato. Cliente molto soddisfatto. Inizio previsto per il mese prossimo.'
        WHEN 'landlord' THEN 'Inquilino identificato e approvato dopo screening. Documentazione completa raccolta. Contratto di locazione pronto per firma.'
        ELSE 'Situazione in evoluzione positiva. Cliente rimane molto coinvolto e collaborativo nel processo.'
      END,
      event_date,
      event_date
    );

    -- EVENT 9: Recent call update (30 days after creation)
    event_date := contact_rec.created_at + interval '30 days';
    INSERT INTO contact_events (
      workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
    ) VALUES (
      contact_rec.workspace_id,
      contact_rec.id,
      contact_rec.agent_id,
      'chiamata',
      'Telefonata di aggiornamento settimanale',
      'Check-in settimanale per discutere progressi e coordinare prossimi step. Cliente rimane positivo, engaged, e fiducioso nel processo.',
      event_date,
      event_date
    );

    -- EVENT 10: Most recent note (within last 7 days if contact is older)
    IF (NOW() - contact_rec.created_at) > interval '37 days' THEN
      event_date := NOW() - (interval '1 day' * FLOOR(RANDOM() * 7));
      INSERT INTO contact_events (
        workspace_id, contact_id, agent_id, event_type, title, body, event_date, created_at
      ) VALUES (
        contact_rec.workspace_id,
        contact_rec.id,
        contact_rec.agent_id,
        'nota',
        CASE WHEN RANDOM() > 0.5 THEN 'Follow-up programmato' ELSE 'Nota di progresso' END,
        CASE contact_rec.type
          WHEN 'buyer' THEN 'Contattare per aggiornamento su stato ispezione e mutuo. Atteso timeline finale per closing.'
          WHEN 'seller' THEN 'Due visite proprietà programmate per il weekend. Proprietario molto disponibile. Monitorare feedback.'
          WHEN 'renter' THEN 'Controllare status firma documenti finali. Deposito cauzione già ricevuto. Chiavi pronte per consegna.'
          WHEN 'landlord' THEN 'Contattare per confermare data esatta trasloco dell''inquilino. Supporto amministrativo coordinato.'
          ELSE 'Mantenersi in contatto regolare. Cliente continua a mostrare forte interesse e disponibilità.'
        END,
        event_date,
        event_date
      );
    END IF;

  END LOOP;

  RAISE NOTICE 'Contact events seed completed. Generated comprehensive interaction history for all contacts.';
END $$;
