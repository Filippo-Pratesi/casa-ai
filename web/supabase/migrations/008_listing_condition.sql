-- Migration: Add condition field to listings

-- condition: ottimo | buono | sufficiente | da ristrutturare
alter table listings
  add column condition text check (condition in ('ottimo', 'buono', 'sufficiente', 'da_ristrutturare')) default null;

-- Also add to archived_listings for snapshot consistency
alter table archived_listings
  add column condition text default null;
