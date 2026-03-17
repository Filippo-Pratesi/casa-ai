-- Email campaigns table
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid not null references users(id) on delete set null,
  subject text not null,
  body_html text not null,
  body_text text not null default '',
  template text not null default 'custom',
  -- recipient filter (stored as json: {type: 'all'|'buyer'|'seller'|'renter', city?: string})
  recipient_filter jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  sent_count integer not null default 0,
  opened_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table campaigns enable row level security;

create policy "workspace members can manage campaigns"
  on campaigns for all
  using (
    workspace_id in (
      select workspace_id from users where id = auth.uid()
    )
  );
