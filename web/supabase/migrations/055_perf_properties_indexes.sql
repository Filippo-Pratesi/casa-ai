-- Performance indexes for properties table (30k+ rows)
-- Enable trigram extension for full-text ILIKE queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_properties_workspace_stage ON properties(workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_city ON properties(workspace_id, city);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_zone ON properties(workspace_id, zone);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_disposition ON properties(workspace_id, owner_disposition);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_agent ON properties(workspace_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_type ON properties(workspace_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_updated ON properties(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm ON properties USING gin(address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON properties USING gin(city gin_trgm_ops);
