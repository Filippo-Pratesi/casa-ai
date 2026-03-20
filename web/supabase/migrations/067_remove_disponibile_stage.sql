-- Migration 067: Remove 'disponibile' stage
-- Convert existing 'disponibile' properties:
--   → 'ignoto' if they have any associated contacts
--   → 'sconosciuto' if they have no contacts
--
-- Note: PostgreSQL does not support DROP VALUE from an enum.
-- The value is left in the enum definition but will not be used by the application.

-- Properties with contacts (owner_contact_id, tenant_contact_id, or property_contacts entries)
UPDATE properties
SET stage = 'ignoto'
WHERE stage = 'disponibile'
  AND (
    owner_contact_id IS NOT NULL
    OR tenant_contact_id IS NOT NULL
    OR id IN (
      SELECT DISTINCT property_id FROM property_contacts
    )
  );

-- Properties with no contacts at all
UPDATE properties
SET stage = 'sconosciuto'
WHERE stage = 'disponibile';
