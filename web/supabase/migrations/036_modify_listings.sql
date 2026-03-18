-- Add property reference to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listings_property_id_idx ON listings(property_id);
