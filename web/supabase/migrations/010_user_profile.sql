-- Add extended profile fields to users table
alter table users
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists partita_iva text,
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Add sold_to_contact_id to archived_listings to support internal buyers
alter table archived_listings
  add column if not exists sold_to_contact_id uuid references contacts(id) on delete set null;
