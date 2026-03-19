-- Add types column as alias for roles (contacts multi-tipologia support)
-- The roles[] column already exists from migration 035.
-- This migration ensures contacts.types is available for API compatibility
-- and backfills any missing roles data.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS types text[];

-- Backfill types from roles (or from type column if roles is empty)
UPDATE contacts
SET types = CASE
  WHEN roles IS NOT NULL AND array_length(roles, 1) > 0 THEN roles
  WHEN type IS NOT NULL THEN ARRAY[type::text]
  ELSE '{}'::text[]
END
WHERE types IS NULL;

-- Index for array containment queries (e.g. types @> ARRAY['buyer'])
CREATE INDEX IF NOT EXISTS idx_contacts_types ON contacts USING gin(types);
