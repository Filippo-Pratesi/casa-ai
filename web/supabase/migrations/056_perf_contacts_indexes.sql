-- Performance indexes for contacts table (100k+ rows)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_name ON contacts(workspace_id, name);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_type ON contacts(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_created ON contacts(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(workspace_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(workspace_id, email) WHERE email IS NOT NULL;
