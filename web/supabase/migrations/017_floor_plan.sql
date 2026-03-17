-- Add floor plan URL to listings
alter table listings add column if not exists floor_plan_url text;
