-- Migration 048: Note di credito support

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'fattura'
    CHECK (document_type IN ('fattura', 'nota_credito')),
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_related_invoice ON invoices(related_invoice_id);

-- Backfill existing rows
UPDATE invoices SET document_type = 'fattura' WHERE document_type IS NULL;
