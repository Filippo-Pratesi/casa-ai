-- Add property_id column to listings table for bidirectional relationship
ALTER TABLE listings ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX listings_property_id_idx ON listings(property_id);

-- Update existing listings to link to properties if listing_id is set in properties
UPDATE listings l
SET property_id = p.id
FROM properties p
WHERE p.listing_id = l.id AND l.property_id IS NULL;
