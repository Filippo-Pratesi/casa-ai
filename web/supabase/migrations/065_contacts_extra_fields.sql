-- Add extra optional fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS professione TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS data_nascita DATE;
