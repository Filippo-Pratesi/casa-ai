-- Migration: Add mocked listing stats columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count integer not null default 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS share_count integer not null default 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS portal_click_count integer not null default 0;
