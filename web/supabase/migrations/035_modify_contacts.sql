-- Add property-related fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partita_iva TEXT;

-- Backfill: copy existing contact type into roles array
UPDATE contacts SET roles = ARRAY[type::TEXT] WHERE roles = '{}' OR roles IS NULL;
