-- Migration: Multi-agency group support
-- group_admin > admin > agent

-- 1. Groups table
create table groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  show_cross_agency_results boolean not null default false,
  created_at timestamptz not null default now()
);

alter table groups enable row level security;

-- 2. Add group_id to workspaces
alter table workspaces
  add column group_id uuid references groups(id) on delete set null;

create index workspaces_group_id_idx on workspaces(group_id);

-- 3. Add group_admin to user_role enum
-- NOTE: alter type add value cannot run inside a transaction
alter type user_role add value if not exists 'group_admin';

-- 4. Add group_id to users (populated only for group_admin users)
alter table users
  add column group_id uuid references groups(id) on delete set null;

-- 5. Helper: get current user's group_id
create or replace function get_user_group_id()
returns uuid language sql stable security definer as $$
  select group_id from users where id = auth.uid()
$$;

-- 6. Helper: get workspace IDs accessible to current user
--    For group_admin: all workspaces in their group
--    For others: just their own workspace_id
create or replace function get_accessible_workspace_ids()
returns setof uuid language sql stable security definer as $$
  select case
    when (select role from users where id = auth.uid()) = 'group_admin'
    then (
      select w.id from workspaces w
      where w.group_id = (select group_id from users where id = auth.uid())
    )
    else (select workspace_id from users where id = auth.uid())
  end
$$;

-- 7. Helper: get active workspace for current user
--    Uses session variable for group_admin switching, falls back to home workspace
create or replace function get_user_workspace_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    case
      when (select role from users where id = auth.uid()) = 'group_admin'
           and nullif(current_setting('app.active_workspace_id', true), '') is not null
           and (nullif(current_setting('app.active_workspace_id', true), ''))::uuid in (
             select w.id from workspaces w
             where w.group_id = (select group_id from users where id = auth.uid())
           )
      then (nullif(current_setting('app.active_workspace_id', true), ''))::uuid
      else null
    end,
    (select workspace_id from users where id = auth.uid())
  )
$$;

-- 8. Helper: set active workspace (called server-side before queries)
create or replace function set_active_workspace(workspace_id uuid)
returns void language plpgsql security definer as $$
begin
  perform set_config('app.active_workspace_id', workspace_id::text, true);
end;
$$;

-- 9. RLS for groups
create policy "group_admin_see_own_group"
  on groups for select
  using (id = get_user_group_id());

create policy "group_admin_update_own_group"
  on groups for update
  using (
    id = get_user_group_id()
    and (select role from users where id = auth.uid()) = 'group_admin'
  );

-- 10. Update workspaces RLS: group_admin sees all workspaces in their group
drop policy if exists "users_see_own_workspace" on workspaces;
drop policy if exists "admin_update_workspace" on workspaces;

create policy "users_see_own_workspace"
  on workspaces for select
  using (id in (select get_accessible_workspace_ids()));

create policy "admin_update_workspace"
  on workspaces for update
  using (
    (id = get_user_workspace_id() and (select role from users where id = auth.uid()) in ('admin', 'group_admin'))
    or (id in (select get_accessible_workspace_ids()) and (select role from users where id = auth.uid()) = 'group_admin')
  );

-- 11. Update users RLS: group_admin sees all users in their group workspaces
drop policy if exists "users_see_workspace_members" on users;
drop policy if exists "admin_manage_users" on users;

create policy "users_see_workspace_members"
  on users for select
  using (workspace_id in (select get_accessible_workspace_ids()));

create policy "admin_manage_users"
  on users for all
  using (
    (workspace_id = get_user_workspace_id() and (select role from users where id = auth.uid()) = 'admin')
    or ((select role from users where id = auth.uid()) = 'group_admin' and workspace_id in (select get_accessible_workspace_ids()))
  );

-- 12. Update invites RLS
drop policy if exists "admin_manage_invites" on invites;

create policy "admin_manage_invites"
  on invites for all
  using (
    (workspace_id = get_user_workspace_id() and (select role from users where id = auth.uid()) in ('admin', 'group_admin'))
    or ((select role from users where id = auth.uid()) = 'group_admin' and workspace_id in (select get_accessible_workspace_ids()))
  );
