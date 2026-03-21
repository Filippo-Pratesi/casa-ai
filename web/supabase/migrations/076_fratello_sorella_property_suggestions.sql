-- 076: Add fratello_sorella role + property_suggestions table

-- 1. Add fratello_sorella to property_contact_role enum
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'fratello_sorella';

-- 2. Track property suggestions sent to acquirenti contacts
CREATE TABLE IF NOT EXISTS property_suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES contacts(id)   ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  method       TEXT NOT NULL CHECK (method IN ('email', 'whatsapp')),
  message      TEXT,
  agent_id     UUID REFERENCES users(id),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON property_suggestions
  USING (workspace_id = (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS property_suggestions_contact_idx ON property_suggestions (contact_id, property_id);
CREATE INDEX IF NOT EXISTS property_suggestions_workspace_idx ON property_suggestions (workspace_id);
