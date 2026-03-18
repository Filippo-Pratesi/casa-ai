-- Migration 038: Add missing columns to properties table
-- Adds bathrooms, floor, total_floors, condition, features, incarico_notes
-- These columns are referenced in the API and UI but were missing from 031

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS floor INTEGER,
  ADD COLUMN IF NOT EXISTS total_floors INTEGER,
  ADD COLUMN IF NOT EXISTS condition TEXT,            -- nuovo, ottimo, buono, discreto, ristrutturato, da_ristrutturare
  ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS incarico_notes TEXT;

-- Index on condition for filtering
CREATE INDEX IF NOT EXISTS idx_properties_condition ON properties(condition) WHERE condition IS NOT NULL;

-- CHECK constraint for condition values
ALTER TABLE properties
  ADD CONSTRAINT property_condition_valid
    CHECK (condition IS NULL OR condition IN (
      'nuovo', 'ottimo', 'buono', 'discreto', 'ristrutturato', 'da_ristrutturare'
    ));
