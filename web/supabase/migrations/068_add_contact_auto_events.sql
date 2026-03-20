-- Expand contact_events event_type to include auto-events
ALTER TABLE contact_events
  DROP CONSTRAINT contact_events_event_type_check;

ALTER TABLE contact_events
  ADD CONSTRAINT contact_events_event_type_check
  CHECK (event_type IN (
    'nota','chiamata','email','appuntamento','campagna_inviata','immobile_proposto',
    'immobile_collegato','stato_cambiato','incarico_firmato','vendita_conclusa'
  ));
