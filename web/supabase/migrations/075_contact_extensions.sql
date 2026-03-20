-- 075_contact_extensions.sql
-- Add parente_altro to property_contact_role enum
-- Add p_iva to contacts
-- Create contact_relationships table for family links

-- Add new role values to the enum
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'venditore';
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'acquirente';
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'parente_altro';

-- Add p_iva field to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS p_iva TEXT;

-- Contact relationships (family links at contact level)
CREATE TABLE IF NOT EXISTS contact_relationships (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_a_id     UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id     UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type TEXT        NOT NULL CHECK (relationship_type IN ('moglie_marito', 'figlio_figlia', 'parente_altro')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_relationships_unique UNIQUE (workspace_id, contact_a_id, contact_b_id, relationship_type),
  CONSTRAINT contact_relationships_no_self CHECK (contact_a_id <> contact_b_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_relationships_a ON contact_relationships(contact_a_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_b ON contact_relationships(contact_b_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_workspace ON contact_relationships(workspace_id);

ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_relationships_select" ON contact_relationships
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "contact_relationships_insert" ON contact_relationships
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "contact_relationships_delete" ON contact_relationships
  FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
