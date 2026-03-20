-- 077_fratello_sorella_role.sql
-- Add 'fratello_sorella' to property_contact_role enum
-- and extend the contact_relationships relationship_type CHECK constraint

-- 1. Extend the property_contact_role enum
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'fratello_sorella';

-- 2. Extend contact_relationships to allow fratello_sorella as relationship type
ALTER TABLE contact_relationships
  DROP CONSTRAINT contact_relationships_relationship_type_check;

ALTER TABLE contact_relationships
  ADD CONSTRAINT contact_relationships_relationship_type_check
  CHECK (relationship_type IN ('moglie_marito', 'figlio_figlia', 'parente_altro', 'fratello_sorella'));
