-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
  'bozza',
  'inviata',
  'accettata',
  'rifiutata',
  'scaduta',
  'controproposta',
  'ritirata'
);

-- Condition type enum
CREATE TYPE condition_type AS ENUM (
  'mutuo',
  'vendita_immobile',
  'libera',
  'perizia',
  'personalizzata'
);

-- Purchase proposals table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- References (live links)
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Denormalized snapshots (legal document integrity)
  immobile_indirizzo TEXT NOT NULL,
  immobile_citta TEXT NOT NULL,
  immobile_tipo TEXT NOT NULL DEFAULT 'apartment',
  prezzo_richiesto INTEGER NOT NULL DEFAULT 0,

  proponente_nome TEXT NOT NULL,
  proponente_codice_fiscale TEXT,
  proponente_indirizzo TEXT,
  proponente_telefono TEXT,
  proponente_email TEXT,

  proprietario_nome TEXT,
  proprietario_codice_fiscale TEXT,

  agente_nome TEXT NOT NULL,
  agente_agenzia TEXT NOT NULL,

  -- Financial (integer = euros, not cents, for proposals)
  prezzo_offerto INTEGER NOT NULL,
  caparra_confirmatoria INTEGER NOT NULL DEFAULT 0,
  caparra_in_gestione_agenzia BOOLEAN NOT NULL DEFAULT false,

  -- Dates
  data_proposta DATE NOT NULL DEFAULT CURRENT_DATE,
  validita_proposta DATE NOT NULL,
  data_rogito_proposta DATE,

  -- Optional
  notaio_preferito TEXT,
  note TEXT,

  -- Conditions (vincoli) as JSONB array
  -- Each: { tipo, descrizione?, importo_mutuo?, nome_banca?, indirizzo_immobile_vendita? }
  vincoli JSONB NOT NULL DEFAULT '[]',

  -- Numbering
  numero_proposta TEXT NOT NULL,
  anno INTEGER NOT NULL,
  progressivo INTEGER NOT NULL,

  -- Status & seller response
  status proposal_status NOT NULL DEFAULT 'bozza',
  risposta_venditore TEXT,
  data_risposta TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Counter-proposals table
CREATE TABLE counter_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  prezzo_controproposta INTEGER NOT NULL,
  data_rogito_proposta DATE,
  validita_controproposta DATE NOT NULL,
  vincoli_modificati JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  numero_controproposta TEXT NOT NULL,

  -- Buyer response
  status proposal_status NOT NULL DEFAULT 'inviata',
  risposta_proponente TEXT,
  data_risposta TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique proposal number per workspace per year
ALTER TABLE proposals ADD CONSTRAINT proposals_workspace_anno_progressivo_unique
  UNIQUE (workspace_id, anno, progressivo);

-- Indexes
CREATE INDEX proposals_workspace_id_idx ON proposals(workspace_id);
CREATE INDEX proposals_agent_id_idx ON proposals(agent_id);
CREATE INDEX proposals_listing_id_idx ON proposals(listing_id);
CREATE INDEX proposals_buyer_contact_id_idx ON proposals(buyer_contact_id);
CREATE INDEX proposals_status_idx ON proposals(status);
CREATE INDEX proposals_validita_idx ON proposals(validita_proposta);
CREATE INDEX counter_proposals_proposal_id_idx ON counter_proposals(proposal_id);
CREATE INDEX counter_proposals_workspace_id_idx ON counter_proposals(workspace_id);

-- RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON proposals
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "proposals_insert" ON proposals
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND agent_id = auth.uid()
  );

CREATE POLICY "proposals_update" ON proposals
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (
      agent_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
    )
  );

CREATE POLICY "proposals_delete" ON proposals
  FOR DELETE USING (
    agent_id = auth.uid()
    AND status = 'bozza'
  );

CREATE POLICY "counter_proposals_select" ON counter_proposals
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "counter_proposals_insert" ON counter_proposals
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "counter_proposals_update" ON counter_proposals
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- Auto-update updated_at
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER counter_proposals_updated_at
  BEFORE UPDATE ON counter_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Next proposal number function
CREATE OR REPLACE FUNCTION next_proposal_number(p_workspace_id UUID, p_anno INTEGER)
RETURNS INTEGER
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(MAX(progressivo), 0) + 1
  FROM proposals
  WHERE workspace_id = p_workspace_id AND anno = p_anno;
$$;
