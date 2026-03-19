-- Add optional sub_zone_id to agent_zones for finer-grained assignments
ALTER TABLE agent_zones ADD COLUMN IF NOT EXISTS sub_zone_id uuid REFERENCES sub_zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agent_zones_subzone ON agent_zones(sub_zone_id) WHERE sub_zone_id IS NOT NULL;
