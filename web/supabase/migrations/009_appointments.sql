-- Migration: Appointments / Calendar

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references users(id) on delete cascade,
  -- What kind of appointment
  type text not null check (type in ('viewing', 'meeting', 'signing', 'call', 'other')),
  title text not null,
  notes text,
  -- When
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- Linked to
  listing_id uuid references listings(id) on delete set null,
  contact_id uuid,  -- soft reference to contacts (no FK as contacts table may not exist yet in migration order)
  contact_name text,  -- snapshot for display
  -- Status
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

-- Agents see only their own appointments; admins see all in workspace
create policy "agents_see_own_appointments"
  on appointments for select
  using (
    agent_id = auth.uid()
    or (
      workspace_id = get_user_workspace_id()
      and (select role from users where id = auth.uid()) in ('admin', 'group_admin')
    )
  );

create policy "agents_insert_appointments"
  on appointments for insert
  with check (
    agent_id = auth.uid()
    and workspace_id = get_user_workspace_id()
  );

create policy "agents_update_appointments"
  on appointments for update
  using (
    agent_id = auth.uid()
    or (
      workspace_id = get_user_workspace_id()
      and (select role from users where id = auth.uid()) in ('admin', 'group_admin')
    )
  );

create policy "agents_delete_appointments"
  on appointments for delete
  using (
    agent_id = auth.uid()
    or (
      workspace_id = get_user_workspace_id()
      and (select role from users where id = auth.uid()) in ('admin', 'group_admin')
    )
  );

create index appointments_workspace_agent_idx on appointments(workspace_id, agent_id);
create index appointments_starts_at_idx on appointments(starts_at);
create index appointments_listing_id_idx on appointments(listing_id);
