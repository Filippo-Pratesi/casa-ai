-- Create proposal_type enum (vendita vs locazione)
CREATE TYPE proposal_type AS ENUM ('vendita', 'affitto');

-- Rental-specific fields (added first so backfill can reference them if needed in future)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_mensile INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_agevolato INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS durata_contratto_mesi INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tipo_contratto_locazione lease_type;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposito_cauzionale INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS spese_condominiali_incluse BOOLEAN DEFAULT false;

-- Add proposal_type column (nullable first for safe migration)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type;

-- Backfill: all existing proposals are sales (locazione was not supported before this migration).
-- If tipo_contratto_locazione was somehow set, classify as affitto.
UPDATE proposals
SET proposal_type = CASE
  WHEN tipo_contratto_locazione IS NOT NULL THEN 'affitto'::proposal_type
  ELSE 'vendita'::proposal_type
END
WHERE proposal_type IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE proposals ALTER COLUMN proposal_type SET NOT NULL;
ALTER TABLE proposals ALTER COLUMN proposal_type SET DEFAULT 'vendita';
