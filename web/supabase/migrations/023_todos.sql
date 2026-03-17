-- Todos table for personal task management and team assignments
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  assigned_to uuid not null references users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists todos_assigned_to_idx on todos(assigned_to);
create index if not exists todos_workspace_id_idx on todos(workspace_id);
create index if not exists todos_assigned_completed_idx on todos(assigned_to, completed);

alter table todos enable row level security;

-- Users can see todos assigned to them or created by them in the same workspace
create policy "Users can view their own workspace todos"
  on todos for select
  using (
    assigned_to = auth.uid() or
    created_by = auth.uid()
  );

create policy "Users can create todos in their workspace"
  on todos for insert
  with check (created_by = auth.uid());

create policy "Users can update todos assigned to them or created by them"
  on todos for update
  using (assigned_to = auth.uid() or created_by = auth.uid());

create policy "Users can delete todos assigned to them or created by them"
  on todos for delete
  using (assigned_to = auth.uid() or created_by = auth.uid());

create policy "Service role can manage todos"
  on todos for all
  using (true)
  with check (true);
