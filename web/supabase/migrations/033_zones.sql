-- Zones table
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, city, name)
);

-- Sub-zones table
CREATE TABLE sub_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(zone_id, name)
);

-- Agent zone assignment table (default zones for agents)
CREATE TABLE agent_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, agent_id, zone_id)
);

-- Indexes
CREATE INDEX zones_workspace_id_idx ON zones(workspace_id);
CREATE INDEX zones_city_idx ON zones(city);
CREATE INDEX sub_zones_zone_id_idx ON sub_zones(zone_id);
CREATE INDEX sub_zones_workspace_id_idx ON sub_zones(workspace_id);
CREATE INDEX agent_zones_workspace_id_idx ON agent_zones(workspace_id);
CREATE INDEX agent_zones_agent_id_idx ON agent_zones(agent_id);
CREATE INDEX agent_zones_zone_id_idx ON agent_zones(zone_id);

-- RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_zones ENABLE ROW LEVEL SECURITY;

-- Zones RLS
CREATE POLICY "zones_select" ON zones
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "zones_insert" ON zones
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "zones_update" ON zones
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

CREATE POLICY "zones_delete" ON zones
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

-- Sub-zones RLS
CREATE POLICY "sub_zones_select" ON sub_zones
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sub_zones_insert" ON sub_zones
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sub_zones_update" ON sub_zones
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

CREATE POLICY "sub_zones_delete" ON sub_zones
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

-- Agent zones RLS
CREATE POLICY "agent_zones_select" ON agent_zones
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "agent_zones_insert" ON agent_zones
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

CREATE POLICY "agent_zones_delete" ON agent_zones
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );

-- Auto-update updated_at
CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sub_zones_updated_at
  BEFORE UPDATE ON sub_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
