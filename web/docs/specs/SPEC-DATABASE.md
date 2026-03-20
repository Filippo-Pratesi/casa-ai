# SPEC-DATABASE — Schema Completo Sprint I

## Enum Nuovi

### property_stage
```sql
CREATE TYPE property_stage AS ENUM (
  'sconosciuto',
  'ignoto',
  'conosciuto',
  'incarico',
  'venduto',
  'locato',
  'disponibile'
);
```

### owner_disposition
```sql
CREATE TYPE owner_disposition AS ENUM (
  'non_vende',
  'vende_sicuramente',
  'sta_pensando',
  'sta_esplorando',
  'in_attesa',
  'da_ricontattare',
  'notizia_ricevuta',
  'incarico_firmato',
  'appena_acquistato',
  'non_definito'
);
```

### property_event_type
```sql
CREATE TYPE property_event_type AS ENUM (
  'nota', 'telefonata', 'visita', 'citofono',
  'email_inviata', 'whatsapp_inviato', 'riunione',
  'documento_caricato', 'incarico_firmato',
  'proposta_ricevuta', 'proposta_accettata', 'proposta_rifiutata',
  'proprietario_identificato', 'proprietario_cambiato',
  'cambio_stage', 'annuncio_creato', 'annuncio_pubblicato',
  'venduto', 'locato', 'contratto_scaduto',
  'archiviato', 'ritorno', 'valutazione_ai', 'insight_ai', 'altro'
);
```

### proposal_type
```sql
CREATE TYPE proposal_type AS ENUM ('vendita', 'locazione');
```

### lease_type
```sql
CREATE TYPE lease_type AS ENUM (
  '4_plus_4', '3_plus_2', 'transitorio', 'foresteria', 'altro'
);
```

### property_contact_role
```sql
CREATE TYPE property_contact_role AS ENUM (
  'proprietario', 'moglie_marito', 'figlio_figlia', 'vicino',
  'portiere', 'amministratore', 'avvocato', 'commercialista',
  'precedente_proprietario', 'inquilino', 'altro'
);
```

---

## Tabella: properties

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stage e stato
  stage property_stage NOT NULL DEFAULT 'sconosciuto',
  owner_disposition owner_disposition NOT NULL DEFAULT 'non_definito',

  -- Indirizzo (sempre obbligatorio)
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zone TEXT NOT NULL,
  sub_zone TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  doorbell TEXT,
  building_notes TEXT,

  -- Dettagli immobile (da stage ignoto)
  property_type property_type,
  floor SMALLINT,
  total_floors SMALLINT,
  sqm INTEGER,
  rooms SMALLINT,
  bathrooms SMALLINT,
  condition TEXT CHECK (condition IN ('ottimo','buono','sufficiente','da_ristrutturare')),
  features TEXT[] NOT NULL DEFAULT '{}',
  estimated_value INTEGER,
  transaction_type TEXT CHECK (transaction_type IN ('vendita', 'affitto')),

  -- Proprietario (da stage conosciuto)
  owner_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Dati catastali (da stage incarico)
  foglio TEXT,
  particella TEXT,
  subalterno TEXT,
  categoria_catastale TEXT,
  rendita_catastale TEXT,

  -- Incarico (da stage incarico)
  incarico_type TEXT CHECK (incarico_type IN ('esclusivo', 'non_esclusivo', 'verbale')),
  incarico_date DATE,
  incarico_expiry DATE,
  incarico_commission_percent NUMERIC(5,2),
  incarico_notes TEXT,

  -- Link annuncio
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Locazione (da stage locato)
  lease_type lease_type,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent INTEGER,
  monthly_rent_discounted INTEGER,
  discount_notes TEXT,
  deposit INTEGER,
  tenant_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lease_notes TEXT,

  -- AI-friendly
  labels TEXT[] NOT NULL DEFAULT '{}',
  ai_score INTEGER,
  ai_notes JSONB NOT NULL DEFAULT '{}',

  -- Timestamp vendita (per auto-reset appena_acquistato dopo 3 mesi)
  sold_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indici
```sql
CREATE INDEX properties_workspace_id_idx ON properties(workspace_id);
CREATE INDEX properties_agent_id_idx ON properties(agent_id);
CREATE INDEX properties_stage_idx ON properties(stage);
CREATE INDEX properties_city_zone_idx ON properties(city, zone);
CREATE INDEX properties_owner_contact_id_idx ON properties(owner_contact_id);
CREATE INDEX properties_listing_id_idx ON properties(listing_id);
CREATE INDEX properties_tenant_contact_id_idx ON properties(tenant_contact_id);
CREATE INDEX properties_lat_lng_idx ON properties(latitude, longitude);
CREATE INDEX properties_owner_disposition_idx ON properties(owner_disposition);
```

### RLS
```sql
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_workspace_access" ON properties
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
```

### Trigger updated_at
```sql
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Tabella: property_events

```sql
CREATE TABLE property_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  event_type property_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Link opzionali
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,

  -- AI-friendly
  labels TEXT[] NOT NULL DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indici
```sql
CREATE INDEX property_events_property_id_idx ON property_events(property_id);
CREATE INDEX property_events_workspace_id_idx ON property_events(workspace_id);
CREATE INDEX property_events_event_type_idx ON property_events(event_type);
CREATE INDEX property_events_created_at_idx ON property_events(created_at DESC);
```

### RLS
```sql
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_events_workspace_access" ON property_events
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
```

---

## Tabella: zones

```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, city, name)
);
```

## Tabella: sub_zones

```sql
CREATE TABLE sub_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zone_id, name)
);
```

## Tabella: agent_zones

```sql
CREATE TABLE agent_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, zone_id)
);
```

### RLS per zones, sub_zones, agent_zones
```sql
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones_workspace_access" ON zones
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "sub_zones_workspace_access" ON sub_zones
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM zones WHERE id = zone_id))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM zones WHERE id = zone_id));

CREATE POLICY "agent_zones_workspace_access" ON agent_zones
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
```

---

## Tabella: property_contacts

```sql
CREATE TABLE property_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role property_contact_role NOT NULL DEFAULT 'altro',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, contact_id)
);
```

### RLS
```sql
ALTER TABLE property_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_contacts_workspace_access" ON property_contacts
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
```

---

## Modifiche a Tabelle Esistenti

### contacts
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partita_iva TEXT;

-- Backfill: copia type in roles
UPDATE contacts SET roles = ARRAY[type::TEXT] WHERE roles = '{}' OR roles IS NULL;
```

### listings
```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listings_property_id_idx ON listings(property_id);
```

### proposals
```sql
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';

-- Campi locazione
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_mensile INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canone_agevolato INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS durata_contratto_mesi INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tipo_contratto_locazione lease_type;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deposito_cauzionale INTEGER;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS spese_condominiali_incluse BOOLEAN DEFAULT false;
```

---

## Funzione Vicinanza (Haversine)

```sql
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
  ));
$$ LANGUAGE SQL IMMUTABLE;
```

Restituisce la distanza in **metri** tra due coordinate.
