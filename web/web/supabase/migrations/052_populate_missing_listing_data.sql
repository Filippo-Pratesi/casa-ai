-- Fix null values in contacts preferences
UPDATE contacts SET preferred_cities = '{}' WHERE preferred_cities IS NULL;
UPDATE contacts SET preferred_types = '{}' WHERE preferred_types IS NULL;
UPDATE contacts SET desired_features = '{}' WHERE desired_features IS NULL;

-- Populate contacts with realistic preferences matching Italian cities and property types
UPDATE contacts
SET
  preferred_cities = CASE
    WHEN city_of_residence LIKE '%Milano%' THEN ARRAY['Milano', 'Monza', 'Como']
    WHEN city_of_residence LIKE '%Roma%' THEN ARRAY['Roma', 'Frascati', 'Grottaferrata']
    WHEN city_of_residence LIKE '%Firenze%' THEN ARRAY['Firenze', 'Fiesole', 'Greve']
    WHEN city_of_residence LIKE '%Torino%' THEN ARRAY['Torino', 'Moncalieri', 'Collegno']
    WHEN city_of_residence LIKE '%Bologna%' THEN ARRAY['Bologna', 'Imola', 'Castenaso']
    WHEN city_of_residence LIKE '%Napoli%' THEN ARRAY['Napoli', 'Salerno', 'Castellammare']
    WHEN city_of_residence LIKE '%Venezia%' THEN ARRAY['Venezia', 'Mestre', 'Padova']
    ELSE ARRAY['Milano', 'Roma', 'Firenze', 'Bologna']
  END,
  preferred_types = ARRAY['apartment', 'house', 'villa'],
  budget_max = COALESCE(budget_max, 750000),
  min_rooms = COALESCE(min_rooms, 2),
  min_sqm = COALESCE(min_sqm, 80),
  desired_features = ARRAY['terrace', 'garage', 'garden', 'parking']
WHERE type IN ('buyer', 'renter');

-- Populate missing fields in listings with realistic data
UPDATE listings
SET
  bathrooms = COALESCE(bathrooms, CASE WHEN rooms >= 3 THEN 2 ELSE 1 END),
  features = CASE
    WHEN property_type = 'villa' THEN ARRAY['garden', 'garage', 'terrace', 'parking', 'panoramic_view']
    WHEN property_type IN ('house', 'apartment') THEN ARRAY['terrace', 'garage', 'elevator', 'parking']
    WHEN property_type = 'commercial' THEN ARRAY['parking', 'storage']
    ELSE ARRAY['terrace', 'garage']
  END,
  photos_urls = COALESCE(NULLIF(photos_urls, '{}'),
    ARRAY[
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197a96f3286?w=800'
    ]
  ),
  vision_labels = COALESCE(vision_labels, '[]'::jsonb),
  notes = COALESCE(notes, 'Bellissima proprietà con dettagli di pregio')
WHERE bathrooms IS NULL OR features = '{}' OR photos_urls = '{}';
