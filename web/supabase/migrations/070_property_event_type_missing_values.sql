-- Add missing values to property_event_type enum
-- These were used in application code but never added to the DB enum,
-- causing silent insert failures in the property cronistoria.

ALTER TYPE property_event_type ADD VALUE IF NOT EXISTS 'contatto_aggiunto';
ALTER TYPE property_event_type ADD VALUE IF NOT EXISTS 'cambio_disposizione';
