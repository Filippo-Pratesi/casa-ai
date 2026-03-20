-- Match Engine v2: DB-backed pre-computed match results
-- Migration 064

-- 1. match_results table: stores pre-computed match scores between properties and contacts
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deterministic_score SMALLINT NOT NULL DEFAULT 0 CHECK (deterministic_score BETWEEN 0 AND 100),
  ai_adjustment SMALLINT NOT NULL DEFAULT 0 CHECK (ai_adjustment BETWEEN -10 AND 20),
  combined_score SMALLINT NOT NULL DEFAULT 0 CHECK (combined_score BETWEEN 0 AND 100),
  ai_reason TEXT,
  ai_confidence TEXT,
  property_data_hash TEXT,
  contact_data_hash TEXT,
  property_events_cursor TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computation_version SMALLINT NOT NULL DEFAULT 1,
  stale BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(workspace_id, property_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_match_results_workspace ON match_results(workspace_id);
CREATE INDEX IF NOT EXISTS idx_match_results_property ON match_results(property_id);
CREATE INDEX IF NOT EXISTS idx_match_results_contact ON match_results(contact_id);
CREATE INDEX IF NOT EXISTS idx_match_results_score ON match_results(workspace_id, property_id, combined_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_stale ON match_results(workspace_id, stale) WHERE stale = true;

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON match_results
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- 2. property_ai_signals: AI-extracted signals from property events/notes
CREATE TABLE IF NOT EXISTS property_ai_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_sentiment TEXT CHECK (owner_sentiment IN ('positive', 'neutral', 'negative')),
  owner_urgency TEXT CHECK (owner_urgency IN ('alta', 'media', 'bassa')),
  key_constraints TEXT[],
  property_highlights TEXT[],
  buyer_profile_hints TEXT[],
  risk_factors TEXT[],
  raw_signals JSONB,
  events_cursor TIMESTAMPTZ,
  events_count_at_computation INT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, property_id)
);

ALTER TABLE property_ai_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON property_ai_signals
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- 3. Add match_stale flag to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS match_stale BOOLEAN NOT NULL DEFAULT true;

-- 4. match_computation_log: audit log for cron runs
CREATE TABLE IF NOT EXISTS match_computation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  properties_processed INT NOT NULL DEFAULT 0,
  contacts_evaluated INT NOT NULL DEFAULT 0,
  matches_created INT NOT NULL DEFAULT 0,
  matches_updated INT NOT NULL DEFAULT 0,
  ai_calls_made INT NOT NULL DEFAULT 0,
  ai_tokens_used INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  errors JSONB,
  trigger_type TEXT NOT NULL
);

-- 5. Performance indexes on contacts for match filtering
CREATE INDEX IF NOT EXISTS idx_contacts_match_filter
  ON contacts(workspace_id, type, updated_at DESC)
  WHERE type IN ('buyer', 'renter');

CREATE INDEX IF NOT EXISTS idx_contacts_budget_range
  ON contacts(workspace_id, budget_max)
  WHERE type IN ('buyer', 'renter');

CREATE INDEX IF NOT EXISTS idx_contacts_cities_gin
  ON contacts USING GIN(preferred_cities)
  WHERE type IN ('buyer', 'renter');

-- 6. SQL function for deterministic contact scoring
CREATE OR REPLACE FUNCTION score_contacts_for_listing(
  p_workspace_id UUID,
  p_city TEXT,
  p_price NUMERIC,
  p_property_type TEXT,
  p_rooms INT,
  p_sqm NUMERIC,
  p_contact_type TEXT
)
RETURNS TABLE(id UUID, name TEXT, score INT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    (
      -- Budget (weight 30)
      CASE
        WHEN c.budget_max IS NULL AND c.budget_min IS NULL THEN 15
        WHEN p_price IS NULL THEN 15
        WHEN p_price BETWEEN COALESCE(c.budget_min, 0) AND c.budget_max THEN 30
        WHEN p_price <= c.budget_max * 1.15 THEN 15
        WHEN p_price <= c.budget_max * 1.30 THEN 5
        ELSE 0
      END +
      -- Location (weight 25)
      CASE
        WHEN c.preferred_cities IS NULL OR cardinality(c.preferred_cities) = 0 THEN 12
        WHEN lower(p_city) = ANY(SELECT lower(x) FROM unnest(c.preferred_cities) x) THEN 25
        ELSE 0
      END +
      -- Property type (weight 15)
      CASE
        WHEN c.preferred_types IS NULL OR cardinality(c.preferred_types) = 0 THEN 7
        WHEN p_property_type IS NULL THEN 7
        WHEN p_property_type = ANY(c.preferred_types) THEN 15
        ELSE 0
      END +
      -- Rooms (weight 10)
      CASE
        WHEN c.min_rooms IS NULL OR p_rooms IS NULL THEN 5
        WHEN p_rooms >= c.min_rooms THEN 10
        WHEN p_rooms = c.min_rooms - 1 THEN 4
        ELSE 0
      END +
      -- Sqm (weight 12)
      CASE
        WHEN c.min_sqm IS NULL OR p_sqm IS NULL THEN 6
        WHEN p_sqm >= c.min_sqm THEN 12
        WHEN p_sqm >= c.min_sqm * 0.9 THEN 7
        WHEN p_sqm >= c.min_sqm * 0.75 THEN 2
        ELSE 0
      END
    )::INT AS score
  FROM contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.type = p_contact_type::contact_type
    AND c.updated_at >= NOW() - INTERVAL '12 months'
    AND (c.budget_max IS NULL OR p_price IS NULL OR c.budget_max >= p_price * 0.7)
    AND (
      c.preferred_cities IS NULL
      OR cardinality(c.preferred_cities) = 0
      OR lower(p_city) = ANY(SELECT lower(x) FROM unnest(c.preferred_cities) x)
    )
  ORDER BY score DESC
  LIMIT 10
$$;
