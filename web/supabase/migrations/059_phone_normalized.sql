-- Add normalized phone column for fast digit-only search
-- Strips all non-numeric characters for fuzzy phone matching
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized ON contacts(workspace_id, phone_normalized);
