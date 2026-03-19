-- Tabella quotazioni OMI (import da CSV AdE o cache 3eurotools)
CREATE TABLE IF NOT EXISTS omi_quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice_comune TEXT NOT NULL,
  comune_nome TEXT NOT NULL,
  provincia TEXT,
  zona_omi TEXT NOT NULL,
  tipo_immobile TEXT NOT NULL, -- abitazioni_civili, ville_e_villini, box, negozi, uffici, capannoni...
  stato_conservazione TEXT, -- ottimo, normale, scadente
  valore_min_mq NUMERIC(10,2) NOT NULL,
  valore_max_mq NUMERIC(10,2) NOT NULL,
  semestre TEXT NOT NULL, -- es. "2025_2"
  fonte TEXT NOT NULL DEFAULT 'csv', -- 'csv' o 'api'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omi_quotations_lookup
  ON omi_quotations (codice_comune, zona_omi, tipo_immobile);

CREATE INDEX IF NOT EXISTS idx_omi_quotations_semestre
  ON omi_quotations (semestre);

-- Evita duplicati per la stessa combinazione + semestre
CREATE UNIQUE INDEX IF NOT EXISTS idx_omi_quotations_unique
  ON omi_quotations (codice_comune, zona_omi, tipo_immobile, COALESCE(stato_conservazione, ''), semestre);

-- Configurazione app (singleton per workspace)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cache risposte 3eurotools (TTL gestito applicativamente)
CREATE TABLE IF NOT EXISTS omi_api_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice_comune TEXT NOT NULL,
  zona_omi TEXT NOT NULL,
  tipo_immobile TEXT NOT NULL,
  operazione TEXT NOT NULL DEFAULT 'acquisto', -- acquisto o affitto
  response JSONB NOT NULL,
  semestre TEXT, -- semestre dei dati restituiti
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_omi_api_cache_lookup
  ON omi_api_cache (codice_comune, zona_omi, tipo_immobile, operazione);

-- Aggiungi campi catastali cache a properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cadastral_data JSONB;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cadastral_data_fetched_at TIMESTAMPTZ;
