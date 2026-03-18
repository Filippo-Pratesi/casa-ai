-- Migration 030: Add channel to campaigns
-- Distinguishes email campaigns from WhatsApp campaigns

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email'
  CHECK (channel IN ('email', 'whatsapp'));

-- Update index
CREATE INDEX IF NOT EXISTS campaigns_channel_idx ON campaigns(workspace_id, channel);
