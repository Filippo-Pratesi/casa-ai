-- Social account connections (per user, per platform)
create table social_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  page_id text not null,          -- Facebook Page ID or Instagram Business Account ID
  page_name text,                 -- Display name for UI
  access_token text not null,     -- Long-lived page access token
  token_expires_at timestamptz,   -- null = never expires (page tokens)
  instagram_account_id text,      -- IG Business Account ID (only for Instagram connections)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, platform, page_id)
);

-- Social post publish history
create table social_posts (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  post_id text,                   -- Platform's post ID after publish
  status text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index social_connections_user_id_idx on social_connections(user_id);
create index social_posts_listing_id_idx on social_posts(listing_id);
create index social_posts_user_id_idx on social_posts(user_id);

-- RLS
alter table social_connections enable row level security;
alter table social_posts enable row level security;

-- Users manage their own social connections
create policy "users_manage_own_connections"
  on social_connections for all
  using (user_id = auth.uid());

-- Users see own posts; workspace admins see all workspace posts
create policy "users_see_social_posts"
  on social_posts for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from users u
      where u.id = auth.uid()
        and u.role = 'admin'
        and u.workspace_id = social_posts.workspace_id
    )
  );

create policy "users_insert_social_posts"
  on social_posts for insert
  with check (user_id = auth.uid());

create policy "users_update_own_social_posts"
  on social_posts for update
  using (user_id = auth.uid());
