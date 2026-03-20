-- Expand contact_events event_type to include proposal and lease auto-events
ALTER TABLE contact_events
  DROP CONSTRAINT contact_events_event_type_check;

ALTER TABLE contact_events
  ADD CONSTRAINT contact_events_event_type_check
  CHECK (event_type IN (
    'nota','chiamata','email','appuntamento','campagna_inviata','immobile_proposto',
    'immobile_collegato','stato_cambiato','incarico_firmato','vendita_conclusa',
    -- Proposal events
    'proposta_inviata','proposta_accettata','proposta_rifiutata','controproposta_ricevuta',
    'proposta_ritirata',
    -- Lease events
    'locazione_avviata','locazione_conclusa','contratto_scaduto','contratto_in_scadenza'
  ));
