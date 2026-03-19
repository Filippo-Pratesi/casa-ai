-- Add omi_zone_code to zones so agents can map their zone names (e.g. "Isola") to OMI codes (e.g. "B2")
ALTER TABLE zones ADD COLUMN IF NOT EXISTS omi_zone_code TEXT;

-- Add operazione column to omi_quotations (acquisto / affitto)
ALTER TABLE omi_quotations ADD COLUMN IF NOT EXISTS operazione TEXT NOT NULL DEFAULT 'acquisto';

-- Normalize stato_conservazione: replace NULL with '' (empty string) for clean unique index
UPDATE omi_quotations SET stato_conservazione = '' WHERE stato_conservazione IS NULL;
ALTER TABLE omi_quotations ALTER COLUMN stato_conservazione SET DEFAULT '';

-- Drop old functional unique index that used COALESCE (incompatible with Supabase upsert onConflict)
DROP INDEX IF EXISTS idx_omi_quotations_unique;

-- New clean unique index (no COALESCE needed since NULL → '' is handled at insert time)
CREATE UNIQUE INDEX IF NOT EXISTS idx_omi_quotations_unique
  ON omi_quotations (codice_comune, zona_omi, tipo_immobile, COALESCE(stato_conservazione, ''), semestre, operazione);
