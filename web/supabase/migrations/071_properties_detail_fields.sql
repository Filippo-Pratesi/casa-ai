-- Add detail fields to properties table (visible from ignoto stage)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS bathrooms SMALLINT,
  ADD COLUMN IF NOT EXISTS floor SMALLINT,
  ADD COLUMN IF NOT EXISTS total_floors SMALLINT,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

ALTER TABLE properties ADD CONSTRAINT properties_bathrooms_positive
  CHECK (bathrooms IS NULL OR bathrooms >= 0);

ALTER TABLE properties ADD CONSTRAINT properties_floor_valid
  CHECK (floor IS NULL OR floor >= -5);
