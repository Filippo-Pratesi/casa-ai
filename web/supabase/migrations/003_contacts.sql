-- Contact type enum
create type contact_type as enum ('buyer', 'seller', 'renter', 'landlord', 'other');

-- Contacts (clienti)
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references users(id) on delete cascade,

  -- Identity
  name text not null,
  email text,
  phone text,
  type contact_type not null default 'buyer',
  city_of_residence text,
  address_of_residence text,
  notes text,

  -- Buyer preferences (for buyers/renters)
  budget_min integer,           -- in euros
  budget_max integer,           -- in euros
  preferred_cities text[],      -- ['Milano', 'Monza']
  preferred_types text[],       -- ['apartment', 'house']
  min_sqm integer,
  min_rooms smallint,
  desired_features text[],      -- same keys as listing features

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for common lookups
create index contacts_workspace_id_idx on contacts(workspace_id);
create index contacts_agent_id_idx on contacts(agent_id);

-- Junction: contacts ↔ listings (visits, interests)
create table contact_listings (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null default 'interested',  -- interested, visited, offered, sold
  notes text,
  created_at timestamptz not null default now(),
  unique(contact_id, listing_id)
);

create index contact_listings_contact_id_idx on contact_listings(contact_id);
create index contact_listings_listing_id_idx on contact_listings(listing_id);

-- RLS
alter table contacts enable row level security;
alter table contact_listings enable row level security;

-- Helper: check workspace membership (reuse pattern from other tables)
create or replace function get_user_workspace_id()
returns uuid
language sql stable security definer
as $$
  select workspace_id from users where id = auth.uid()
$$;

-- Contacts: users can read/write their workspace's contacts
create policy "contacts_workspace_access" on contacts
  for all
  using (workspace_id = get_user_workspace_id())
  with check (workspace_id = get_user_workspace_id());

-- contact_listings: same workspace scope
create policy "contact_listings_workspace_access" on contact_listings
  for all
  using (workspace_id = get_user_workspace_id())
  with check (workspace_id = get_user_workspace_id());

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();
