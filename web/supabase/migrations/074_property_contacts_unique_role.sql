-- 074_property_contacts_unique_role.sql
-- Remove duplicate (property_id, contact_id, role) rows, then add unique constraint

-- Step 1: delete duplicates keeping only the oldest row per (property_id, contact_id, role)
DELETE FROM property_contacts
WHERE id NOT IN (
  SELECT DISTINCT ON (property_id, contact_id, role) id
  FROM property_contacts
  ORDER BY property_id, contact_id, role, created_at ASC
);

-- Step 2: add unique constraint to prevent future duplicates
ALTER TABLE property_contacts
  ADD CONSTRAINT property_contacts_property_contact_role_unique
  UNIQUE (property_id, contact_id, role);
