-- Migration: MLS - share listings with group workspaces
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shared_with_group boolean not null default false;
