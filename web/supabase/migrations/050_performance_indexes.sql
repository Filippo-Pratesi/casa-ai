-- Migration 050: Performance optimization for Banca Dati
-- Adds composite indexes, GIN full-text search, and RPC helpers
-- to handle large datasets (10k+ properties) efficiently.

-- ── 1. Composite indexes for common filter combinations ───────────────────────
-- These replace repeated single-column lookups with one index scan

CREATE INDEX IF NOT EXISTS idx_properties_workspace_stage
  ON properties(workspace_id, stage);

CREATE INDEX IF NOT EXISTS idx_properties_workspace_disposition
  ON properties(workspace_id, owner_disposition);

CREATE INDEX IF NOT EXISTS idx_properties_workspace_city
  ON properties(workspace_id, city);

CREATE INDEX IF NOT EXISTS idx_properties_workspace_transaction
  ON properties(workspace_id, transaction_type);

-- ── 2. Generated full-text search column (auto-updated on INSERT/UPDATE) ─────
-- Avoids ILIKE '%...%' full-table scans; uses Italian stemming/stop-words.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'italian',
      coalesce(address,  '') || ' ' ||
      coalesce(city,     '') || ' ' ||
      coalesce(zone,     '') || ' ' ||
      coalesce(sub_zone, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_search_vector
  ON properties USING GIN(search_vector);

-- ── 3. RPC: last event per property (eliminates N+1 + JS deduplication) ──────
-- Uses DISTINCT ON with the existing (property_id, event_date DESC) index.

CREATE OR REPLACE FUNCTION get_last_events(p_property_ids uuid[])
RETURNS TABLE(
  property_id uuid,
  event_type  text,
  title       text,
  event_date  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT ON (pe.property_id)
    pe.property_id,
    pe.event_type::text,
    pe.title,
    pe.event_date
  FROM property_events pe
  WHERE pe.property_id = ANY(p_property_ids)
  ORDER BY pe.property_id, pe.event_date DESC;
$$;

-- ── 4. RPC: stage counts per workspace (replaces full JS reduce) ──────────────
-- Returns one row per stage — no full property scan in application code.

CREATE OR REPLACE FUNCTION get_stage_counts(p_workspace_id uuid)
RETURNS TABLE(stage text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT stage::text, count(*) AS cnt
  FROM properties
  WHERE workspace_id = p_workspace_id
  GROUP BY stage;
$$;
