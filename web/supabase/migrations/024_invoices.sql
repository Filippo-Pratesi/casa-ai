-- Invoice status enum
CREATE TYPE invoice_status AS ENUM ('bozza', 'inviata', 'pagata', 'scaduta');

-- Tax regime enum
CREATE TYPE regime_fiscale AS ENUM ('ordinario', 'forfettario', 'esente');

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Invoice identity
  numero_fattura TEXT NOT NULL,
  anno INTEGER NOT NULL,
  progressivo INTEGER NOT NULL,

  -- Parties (optional links to CRM)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Client data — denormalized snapshot at issuance (legal requirement)
  cliente_nome TEXT NOT NULL,
  cliente_indirizzo TEXT,
  cliente_citta TEXT,
  cliente_cap TEXT,
  cliente_provincia TEXT,
  cliente_codice_fiscale TEXT,
  cliente_pec TEXT,
  cliente_codice_sdi TEXT DEFAULT '0000000',

  -- Emitter data — denormalized snapshot
  emittente_nome TEXT NOT NULL,
  emittente_indirizzo TEXT,
  emittente_citta TEXT,
  emittente_cap TEXT,
  emittente_provincia TEXT,
  emittente_partita_iva TEXT,
  emittente_codice_fiscale TEXT,

  -- Tax regime and financial
  regime regime_fiscale NOT NULL DEFAULT 'ordinario',
  descrizione TEXT NOT NULL DEFAULT 'Provvigione per intermediazione immobiliare',
  imponibile INTEGER NOT NULL DEFAULT 0,        -- euro cents
  aliquota_iva SMALLINT NOT NULL DEFAULT 22,    -- percentage
  importo_iva INTEGER NOT NULL DEFAULT 0,       -- euro cents
  ritenuta_acconto BOOLEAN NOT NULL DEFAULT false,
  aliquota_ritenuta SMALLINT NOT NULL DEFAULT 20,
  importo_ritenuta INTEGER NOT NULL DEFAULT 0,  -- euro cents
  contributo_cassa BOOLEAN NOT NULL DEFAULT false,
  aliquota_cassa SMALLINT NOT NULL DEFAULT 0,
  importo_cassa INTEGER NOT NULL DEFAULT 0,     -- euro cents
  totale_documento INTEGER NOT NULL DEFAULT 0,  -- euro cents
  netto_a_pagare INTEGER NOT NULL DEFAULT 0,    -- euro cents

  -- Line items as JSONB array: [{descrizione, quantita, prezzo_unitario, importo}]
  voci JSONB NOT NULL DEFAULT '[]',

  -- Payment
  metodo_pagamento TEXT NOT NULL DEFAULT 'bonifico',
  iban TEXT,
  data_emissione DATE NOT NULL DEFAULT CURRENT_DATE,
  data_scadenza DATE,
  data_pagamento DATE,
  note TEXT,

  -- Status & send tracking
  status invoice_status NOT NULL DEFAULT 'bozza',
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique invoice number per workspace per year
ALTER TABLE invoices ADD CONSTRAINT invoices_workspace_anno_progressivo_unique
  UNIQUE (workspace_id, anno, progressivo);

-- Indexes
CREATE INDEX invoices_workspace_id_idx ON invoices(workspace_id);
CREATE INDEX invoices_agent_id_idx ON invoices(agent_id);
CREATE INDEX invoices_contact_id_idx ON invoices(contact_id);
CREATE INDEX invoices_listing_id_idx ON invoices(listing_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_data_emissione_idx ON invoices(data_emissione DESC);
CREATE INDEX invoices_anno_idx ON invoices(anno);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE id = auth.uid()
    )
    AND agent_id = auth.uid()
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE id = auth.uid()
    )
    AND (
      agent_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    agent_id = auth.uid()
    AND status = 'bozza'
  );

-- Auto-update updated_at
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: next sequential invoice number for workspace + year
CREATE OR REPLACE FUNCTION next_invoice_number(p_workspace_id UUID, p_anno INTEGER)
RETURNS INTEGER
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(MAX(progressivo), 0) + 1
  FROM invoices
  WHERE workspace_id = p_workspace_id AND anno = p_anno;
$$;
