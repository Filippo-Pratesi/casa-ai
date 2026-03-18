-- Add proposal_type to proposals (vendita vs locazione)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';

-- Rental-specific fields
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_mensile INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_agevolato INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS durata_contratto_mesi INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tipo_contratto_locazione lease_type;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposito_cauzionale INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS spese_condominiali_incluse BOOLEAN DEFAULT false;
