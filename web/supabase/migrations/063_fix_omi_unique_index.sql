-- Drop COALESCE-based functional index (incompatible with Supabase upsert onConflict)
DROP INDEX IF EXISTS idx_omi_quotations_unique;

-- Plain unique index — stato_conservazione is always '' (not NULL) due to migration 062 DEFAULT
CREATE UNIQUE INDEX idx_omi_quotations_unique
  ON omi_quotations (codice_comune, zona_omi, tipo_immobile, stato_conservazione, semestre, operazione);
