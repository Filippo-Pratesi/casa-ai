-- Migration: Campaign email attachments
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attachment_name text;
