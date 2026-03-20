-- 076_property_contact_role_genitore.sql
-- Add 'genitore' role to property_contact_role enum

ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'genitore';
