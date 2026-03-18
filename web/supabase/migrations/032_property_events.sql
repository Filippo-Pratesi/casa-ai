-- Property event type enum
CREATE TYPE property_event_type AS ENUM (
  'nota',
  'telefonata',
  'visita',
  'citofono',
  'email_inviata',
  'whatsapp_inviato',
  'riunione',
  'documento_caricato',
  'incarico_firmato',
  'proposta_ricevuta',
  'proposta_accettata',
  'proposta_rifiutata',
  'proprietario_identificato',
  'proprietario_cambiato',
  'cambio_stage',
  'annuncio_creato',
  'annuncio_pubblicato',
  'venduto',
  'locato',
  'contratto_scaduto',
  'archiviato',
  'ritorno',
  'valutazione_ai',
  'insight_ai',
  'altro'
);

-- Sentiment enum
CREATE TYPE sentiment AS ENUM (
  'positive',
  'neutral',
  'negative'
);

-- Property events (append-only chronistoria)
CREATE TABLE property_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Event details
  event_type property_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Sentiment (for calls, emails, meetings)
  sentiment sentiment,

  -- Stage transition tracking
  old_stage property_stage,
  new_stage property_stage,

  -- Linked contact (who event involves)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Structured metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX property_events_workspace_id_idx ON property_events(workspace_id);
CREATE INDEX property_events_property_id_idx ON property_events(property_id);
CREATE INDEX property_events_agent_id_idx ON property_events(agent_id);
CREATE INDEX property_events_event_type_idx ON property_events(event_type);
CREATE INDEX property_events_contact_id_idx ON property_events(contact_id);
CREATE INDEX property_events_event_date_idx ON property_events(event_date DESC);
CREATE INDEX property_events_property_event_date_idx ON property_events(property_id, event_date DESC);

-- RLS
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_events_select" ON property_events
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "property_events_insert" ON property_events
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (
      agent_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
    )
  );

CREATE POLICY "property_events_delete" ON property_events
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );
