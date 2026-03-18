-- Property contact role enum
CREATE TYPE property_contact_role AS ENUM (
  'proprietario',
  'moglie_marito',
  'figlio_figlia',
  'vicino',
  'portiere',
  'amministratore',
  'avvocato',
  'commercialista',
  'precedente_proprietario',
  'inquilino',
  'altro'
);

-- Property contacts (many-to-many with roles)
CREATE TABLE property_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role(s)
  role property_contact_role NOT NULL,

  -- Whether this is the primary contact for the property
  is_primary BOOLEAN NOT NULL DEFAULT false,

  -- Contact-specific notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, property_id, contact_id, role)
);

-- Indexes
CREATE INDEX property_contacts_workspace_id_idx ON property_contacts(workspace_id);
CREATE INDEX property_contacts_property_id_idx ON property_contacts(property_id);
CREATE INDEX property_contacts_contact_id_idx ON property_contacts(contact_id);
CREATE INDEX property_contacts_role_idx ON property_contacts(role);
CREATE INDEX property_contacts_is_primary_idx ON property_contacts(is_primary);

-- RLS
ALTER TABLE property_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_contacts_select" ON property_contacts
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "property_contacts_insert" ON property_contacts
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "property_contacts_update" ON property_contacts
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "property_contacts_delete" ON property_contacts
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- Auto-update updated_at
CREATE TRIGGER property_contacts_updated_at
  BEFORE UPDATE ON property_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
