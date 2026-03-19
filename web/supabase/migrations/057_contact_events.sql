-- Contact events table for cronistoria contatto
CREATE TABLE IF NOT EXISTS contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('nota','chiamata','email','appuntamento','campagna_inviata','immobile_proposto')),
  title text NOT NULL,
  body text,
  related_property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  related_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_events_contact ON contact_events(contact_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_events_workspace ON contact_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_listing ON contact_events(related_listing_id) WHERE related_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_events_property ON contact_events(related_property_id) WHERE related_property_id IS NOT NULL;

ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON contact_events
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid())
  );
