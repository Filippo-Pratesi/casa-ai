-- Add venditore and acquirente to property_contact_role enum
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'venditore';
ALTER TYPE property_contact_role ADD VALUE IF NOT EXISTS 'acquirente';
