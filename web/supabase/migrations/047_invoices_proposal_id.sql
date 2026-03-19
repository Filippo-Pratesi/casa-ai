-- Migration 047: Link invoices to proposals
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_proposal_id ON invoices(proposal_id);
