-- Migration 046: Invoice reminders table + workspace reminder setting

CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN (
    'pre_scadenza_7g',
    'giorno_scadenza',
    'post_scadenza_7g',
    'post_scadenza_30g'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_workspace
  ON invoice_reminders(workspace_id);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_pending
  ON invoice_reminders(scheduled_at)
  WHERE sent_at IS NULL;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS reminder_automatici BOOLEAN DEFAULT TRUE;

ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_reminders_workspace_isolation"
  ON invoice_reminders FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));
