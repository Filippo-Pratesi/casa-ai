-- Step 1: Match listings to properties by exact address + city (case-insensitive)
UPDATE listings l
SET property_id = p.id
FROM properties p
WHERE lower(trim(l.address)) = lower(trim(p.address))
  AND lower(trim(l.city)) = lower(trim(p.city))
  AND l.property_id IS NULL
  AND p.listing_id IS NULL;

-- Step 2: Sync the reverse — set listing_id on properties where matched
UPDATE properties p
SET listing_id = l.id
FROM listings l
WHERE l.property_id = p.id
  AND p.listing_id IS NULL;

-- Step 3: For remaining properties in 'incarico' without listing_id,
-- link to listings in the same city that are still unlinked
WITH ranked AS (
  SELECT DISTINCT ON (p.id)
    p.id AS property_id,
    l.id AS listing_id
  FROM properties p
  JOIN listings l
    ON lower(trim(l.city)) = lower(trim(p.city))
    AND l.property_id IS NULL
    AND p.listing_id IS NULL
  WHERE p.stage = 'incarico'
  ORDER BY p.id, l.created_at
)
UPDATE properties p
SET listing_id = r.listing_id
FROM ranked r
WHERE p.id = r.property_id;

-- Step 4: Sync reverse for step 3
UPDATE listings l
SET property_id = p.id
FROM properties p
WHERE p.listing_id = l.id
  AND l.property_id IS NULL;
