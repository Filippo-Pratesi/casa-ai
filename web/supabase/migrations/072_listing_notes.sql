-- 072_listing_notes.sql
-- Internal agent notes on listings (Proposal 13: Listing Activity Feed with Agent Collaboration)

CREATE TABLE IF NOT EXISTS listing_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id     UUID        NOT NULL REFERENCES users(id),
  content      TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_notes_listing_id   ON listing_notes(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_notes_workspace_id ON listing_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_listing_notes_created_at   ON listing_notes(created_at DESC);

ALTER TABLE listing_notes ENABLE ROW LEVEL SECURITY;
