-- Migration: Google Calendar OAuth tokens + event ID on appointments
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expiry timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id text;
