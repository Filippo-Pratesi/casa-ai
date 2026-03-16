-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Enums
create type user_role as enum ('admin', 'agent');
create type property_type as enum ('apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other');
create type tone as enum ('standard', 'luxury', 'approachable', 'investment');
create type listing_status as enum ('draft', 'published');
create type workspace_plan as enum ('trial', 'starter', 'growth', 'network');

-- Workspaces (one per office branch)
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  tone_default tone not null default 'standard',
  plan workspace_plan not null default 'trial',
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- Users (extend Supabase auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'agent',
  created_at timestamptz not null default now()
);

-- Listings
create table listings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references users(id) on delete cascade,
  property_type property_type not null,
  floor smallint,
  total_floors smallint,
  address text not null,
  city text not null,
  neighborhood text,
  price integer not null,  -- in euros, no decimals
  sqm integer not null,
  rooms smallint not null,
  bathrooms smallint not null default 1,
  features text[] not null default '{}',
  notes text,
  tone tone not null default 'standard',
  photos_urls text[] not null default '{}',
  vision_labels jsonb not null default '[]',
  generated_content jsonb,
  status listing_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- Invite tokens (for workspace member invitations)
create table invites (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role user_role not null default 'agent',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid not null references users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- Indexes
create index listings_workspace_id_idx on listings(workspace_id);
create index listings_agent_id_idx on listings(agent_id);
create index listings_created_at_idx on listings(created_at desc);
create index users_workspace_id_idx on users(workspace_id);
create index invites_token_idx on invites(token);

-- Row Level Security
alter table workspaces enable row level security;
alter table users enable row level security;
alter table listings enable row level security;
alter table invites enable row level security;

-- RLS: Users can only see their own workspace
create policy "users_see_own_workspace"
  on workspaces for select
  using (id = (select workspace_id from users where id = auth.uid()));

create policy "admin_update_workspace"
  on workspaces for update
  using (id = (select workspace_id from users where id = auth.uid() and role = 'admin'));

-- RLS: Users see others in same workspace
create policy "users_see_workspace_members"
  on users for select
  using (workspace_id = (select workspace_id from users where id = auth.uid()));

create policy "users_update_own_profile"
  on users for update
  using (id = auth.uid());

create policy "admin_manage_users"
  on users for all
  using (
    workspace_id = (select workspace_id from users where id = auth.uid() and role = 'admin')
  );

-- RLS: Listings scoped to workspace; agents only see their own
create policy "agents_see_own_listings"
  on listings for select
  using (
    workspace_id = (select workspace_id from users where id = auth.uid())
    and (
      agent_id = auth.uid()
      or exists (select 1 from users where id = auth.uid() and role = 'admin')
    )
  );

create policy "agents_insert_listings"
  on listings for insert
  with check (
    workspace_id = (select workspace_id from users where id = auth.uid())
    and agent_id = auth.uid()
  );

create policy "agents_update_own_listings"
  on listings for update
  using (agent_id = auth.uid() or exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- RLS: Invites visible to workspace admins
create policy "admin_manage_invites"
  on invites for all
  using (
    workspace_id = (select workspace_id from users where id = auth.uid() and role = 'admin')
  );

-- Function: get current user's workspace_id (helper)
create or replace function get_my_workspace_id()
returns uuid language sql stable security definer as $$
  select workspace_id from users where id = auth.uid()
$$;
