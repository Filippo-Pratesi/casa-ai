-- Migration: Archive tables for deleted listings and contacts

-- 1. Archived listings
create table archived_listings (
  id uuid primary key default uuid_generate_v4(),
  original_id uuid not null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null,
  property_type text not null,
  floor integer,
  total_floors integer,
  address text not null,
  city text not null,
  neighborhood text,
  price numeric not null,
  sqm integer not null,
  rooms integer not null,
  bathrooms integer not null,
  features text[] not null default '{}',
  notes text,
  tone text not null,
  photos_urls text[] not null default '{}',
  generated_content jsonb,
  -- Sale info
  sold boolean not null default false,
  sold_to_contact_id uuid,      -- original contact id (may no longer exist)
  sold_to_name text,             -- contact name snapshot
  -- Audit
  archived_at timestamptz not null default now(),
  archived_by_user_id uuid not null
);

alter table archived_listings enable row level security;

create policy "workspace_see_archived_listings"
  on archived_listings for select
  using (workspace_id in (select get_accessible_workspace_ids()));

create policy "workspace_insert_archived_listings"
  on archived_listings for insert
  with check (workspace_id in (select get_accessible_workspace_ids()));

-- 2. Archived contacts
create table archived_contacts (
  id uuid primary key default uuid_generate_v4(),
  original_id uuid not null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null,
  name text not null,
  type text not null,
  email text,
  phone text,
  city_of_residence text,
  address_of_residence text,
  notes text,
  budget_min numeric,
  budget_max numeric,
  preferred_cities text[] not null default '{}',
  preferred_types text[] not null default '{}',
  min_sqm integer,
  min_rooms integer,
  desired_features text[] not null default '{}',
  -- Purchase info
  bought_listing boolean not null default false,
  bought_listing_id uuid,        -- original listing id (may now be in archived_listings)
  bought_listing_address text,   -- address snapshot
  -- Audit
  archived_at timestamptz not null default now(),
  archived_by_user_id uuid not null
);

alter table archived_contacts enable row level security;

create policy "workspace_see_archived_contacts"
  on archived_contacts for select
  using (workspace_id in (select get_accessible_workspace_ids()));

create policy "workspace_insert_archived_contacts"
  on archived_contacts for insert
  with check (workspace_id in (select get_accessible_workspace_ids()));
