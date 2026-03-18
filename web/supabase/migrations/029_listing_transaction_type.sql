-- Migration 029: Add transaction_type to listings
-- Classifies each listing as 'vendita' (for sale) or 'affitto' (for rent)

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'vendita'
  CHECK (transaction_type IN ('vendita', 'affitto'));

-- Update index for filtering
CREATE INDEX IF NOT EXISTS listings_transaction_type_idx ON listings(workspace_id, transaction_type);
