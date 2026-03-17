-- Complete RLS fix: replace ALL inline subqueries on users/workspaces tables
-- with SECURITY DEFINER functions that bypass RLS and prevent infinite recursion.
-- Root cause: any policy that reads from the same table it protects causes 42P17.

-- Step 1: Add helper function for current user's role (same pattern as get_my_workspace_id)
create or replace function get_my_role()
returns user_role language sql stable security definer as $$
  select role from users where id = auth.uid()
$$;

-- Step 2: Fix users table — drop all policies and re-create using helper functions
drop policy if exists "users_see_workspace_members" on users;
drop policy if exists "users_update_own_profile" on users;
drop policy if exists "admin_manage_users" on users;

create policy "users_see_workspace_members"
  on users for select
  using (workspace_id = get_my_workspace_id());

create policy "users_update_own_profile"
  on users for update
  using (id = auth.uid());

create policy "admin_manage_users"
  on users for all
  using (workspace_id = get_my_workspace_id() and get_my_role() = 'admin');

-- Step 3: Fix workspaces table
drop policy if exists "users_see_own_workspace" on workspaces;
drop policy if exists "users_see_own_workspace_direct" on workspaces;
drop policy if exists "admin_update_workspace" on workspaces;

create policy "users_see_own_workspace"
  on workspaces for select
  using (id = get_my_workspace_id());

create policy "admin_update_workspace"
  on workspaces for update
  using (id = get_my_workspace_id() and get_my_role() = 'admin');

-- Step 4: Fix listings table
drop policy if exists "agents_see_own_listings" on listings;
drop policy if exists "agents_insert_listings" on listings;
drop policy if exists "agents_update_own_listings" on listings;

create policy "agents_see_own_listings"
  on listings for select
  using (
    workspace_id = get_my_workspace_id()
    and (agent_id = auth.uid() or get_my_role() = 'admin')
  );

create policy "agents_insert_listings"
  on listings for insert
  with check (
    workspace_id = get_my_workspace_id()
    and agent_id = auth.uid()
  );

create policy "agents_update_own_listings"
  on listings for update
  using (agent_id = auth.uid() or get_my_role() = 'admin');

-- Step 5: Fix invites table
drop policy if exists "admin_manage_invites" on invites;

create policy "admin_manage_invites"
  on invites for all
  using (workspace_id = get_my_workspace_id() and get_my_role() = 'admin');
