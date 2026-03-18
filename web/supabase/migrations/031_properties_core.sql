-- Property lifecycle stage enum
CREATE TYPE property_stage AS ENUM (
  'sconosciuto',    -- Only address known
  'ignoto',         -- Details without contact
  'conosciuto',     -- Contact identified
  'incarico',       -- Mandate signed + listing
  'venduto',        -- Sale completed
  'locato',         -- Rental contract active
  'disponibile'     -- Rental contract expired
);

-- Owner disposition enum
CREATE TYPE owner_disposition AS ENUM (
  'non_definito',           -- Default initial state
  'non_vende',              -- Owner not interested
  'vende_sicuramente',      -- Owner decided
  'sta_pensando',           -- Owner undecided
  'sta_esplorando',         -- Owner evaluating
  'in_attesa',              -- Waiting for event (inheritance, moving)
  'da_ricontattare',        -- Needs follow-up
  'notizia_ricevuta',       -- Agent received intel
  'incarico_firmato',       -- AUTOMATIC on mandate, also manual
  'appena_acquistato'       -- AUTOMATIC on sale, resets to non_definito after 3 months
);

-- Property transaction type enum
CREATE TYPE property_transaction_type AS ENUM (
  'vendita',    -- Sale
  'affitto'     -- Rental
);

-- Lease type enum
CREATE TYPE lease_type AS ENUM (
  '4_plus_4',   -- 4+4 contract
  '3_plus_2',   -- 3+2 contract
  'transitorio',
  'foresteria',
  'altro'
);

-- Main properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  zone TEXT,
  sub_zone TEXT,

  -- Building notes
  doorbell TEXT,
  building_notes TEXT,

  -- Stage & disposition
  stage property_stage NOT NULL DEFAULT 'sconosciuto',
  owner_disposition owner_disposition NOT NULL DEFAULT 'non_definito',
  transaction_type property_transaction_type DEFAULT 'vendita',

  -- Owner contact
  owner_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Property details (filled from Ignoto stage)
  property_type TEXT DEFAULT 'apartment',    -- apartment, house, villa, commercial, land, garage, other
  sqm INTEGER,
  rooms INTEGER,
  estimated_value INTEGER,

  -- Mandate (Incarico stage)
  incarico_type TEXT,                        -- esclusivo, non_esclusivo, etc.
  incarico_date DATE,
  incarico_expiry DATE,
  incarico_commission_percent DECIMAL(5, 2),

  -- Cadastral data
  foglio TEXT,
  particella TEXT,
  subalterno TEXT,
  categoria_catastale TEXT,
  rendita_catastale DECIMAL(10, 2),

  -- Listing reference
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Rental data (Locato stage)
  lease_type lease_type,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent INTEGER,
  monthly_rent_discounted INTEGER,
  discount_notes TEXT,
  deposit INTEGER,
  tenant_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lease_notes TEXT,

  -- Sale history
  sold_at TIMESTAMPTZ,
  sold_to_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  sold_price INTEGER,

  -- AI & future
  labels TEXT[] DEFAULT '{}',
  ai_score INTEGER DEFAULT 0,
  ai_notes JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Haversine distance function for nearby search (in meters)
-- Pure SQL implementation for performance (matches SPEC-DATABASE.md)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 NUMERIC,
  lng1 NUMERIC,
  lat2 NUMERIC,
  lng2 NUMERIC
) RETURNS NUMERIC AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
  ));
$$ LANGUAGE SQL IMMUTABLE;

-- Indexes
CREATE INDEX properties_workspace_id_idx ON properties(workspace_id);
CREATE INDEX properties_agent_id_idx ON properties(agent_id);
CREATE INDEX properties_stage_idx ON properties(stage);
CREATE INDEX properties_city_zone_idx ON properties(city, zone);
CREATE INDEX properties_city_idx ON properties(city);
CREATE INDEX properties_owner_contact_id_idx ON properties(owner_contact_id);
CREATE INDEX properties_tenant_contact_id_idx ON properties(tenant_contact_id);
CREATE INDEX properties_listing_id_idx ON properties(listing_id);
CREATE INDEX properties_lease_end_date_idx ON properties(lease_end_date);
-- BTREE index on coordinates for Haversine bounding box pre-filter (no earthdistance extension needed)
CREATE INDEX properties_lat_lng_idx ON properties(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "properties_insert" ON properties
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND agent_id = auth.uid()
  );

CREATE POLICY "properties_update" ON properties
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (
      agent_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
    )
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "properties_delete" ON properties
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin')))
    AND stage IN ('sconosciuto', 'ignoto')
  );

-- Auto-update updated_at
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- CHECK constraints for data quality
ALTER TABLE properties ADD CONSTRAINT property_type_valid
  CHECK (property_type IS NULL OR property_type IN ('apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other'));

ALTER TABLE properties ADD CONSTRAINT estimated_value_positive
  CHECK (estimated_value IS NULL OR estimated_value >= 0);

ALTER TABLE properties ADD CONSTRAINT monthly_rent_positive
  CHECK (monthly_rent IS NULL OR monthly_rent >= 0);

ALTER TABLE properties ADD CONSTRAINT monthly_rent_discounted_positive
  CHECK (monthly_rent_discounted IS NULL OR monthly_rent_discounted >= 0);

ALTER TABLE properties ADD CONSTRAINT deposit_positive
  CHECK (deposit IS NULL OR deposit >= 0);

ALTER TABLE properties ADD CONSTRAINT lease_dates_valid
  CHECK (lease_end_date IS NULL OR lease_start_date IS NULL OR lease_end_date >= lease_start_date);

ALTER TABLE properties ADD CONSTRAINT incarico_dates_valid
  CHECK (incarico_expiry IS NULL OR incarico_date IS NULL OR incarico_expiry >= incarico_date);

-- Comment documenting the circular FK with listings (intentional, both SET NULL)
COMMENT ON COLUMN properties.listing_id IS 'FK to listings. Circular with listings.property_id — both ON DELETE SET NULL. Intentional: a property without a listing or a listing without a property_id are valid states.';

-- Comment documenting valid property_stage transitions
COMMENT ON TYPE property_stage IS 'Property lifecycle stages.
Valid transitions:
  sconosciuto (only address) → ignoto (details, no contact) → conosciuto (owner known) → incarico (mandate signed)
  incarico → venduto | locato
  locato → disponibile (contract expired)
  disponibile → incarico (new mandate)
  Reverse allowed: conosciuto ← ignoto (contact lost), incarico ← conosciuto (mandate expired)
';
