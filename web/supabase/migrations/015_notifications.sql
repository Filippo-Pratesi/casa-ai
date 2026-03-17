-- Notifications table for in-app agent notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references users(id) on delete cascade,
  type text not null default 'birthday_message',
  title text not null,
  body text not null,
  contact_id uuid references contacts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_agent_id_idx on notifications(agent_id);
create index if not exists notifications_workspace_id_idx on notifications(workspace_id);
create index if not exists notifications_read_idx on notifications(agent_id, read);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (agent_id = auth.uid());

create policy "Service role can manage notifications"
  on notifications for all
  using (true)
  with check (true);
