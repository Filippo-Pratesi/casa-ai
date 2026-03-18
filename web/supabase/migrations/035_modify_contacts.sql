-- Add property-related fields to contacts (nullable first for safe migration)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partita_iva TEXT;

-- Backfill: copy existing contact type into roles array, handle NULL type safely
UPDATE contacts
SET roles = CASE
  WHEN type IS NOT NULL THEN ARRAY[type::TEXT]
  ELSE '{}'
END
WHERE roles IS NULL;

-- Set NOT NULL + default after backfill
ALTER TABLE contacts ALTER COLUMN roles SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN roles SET DEFAULT '{}';
