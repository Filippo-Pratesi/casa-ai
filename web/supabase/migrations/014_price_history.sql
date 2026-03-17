-- Price history for listings
create table if not exists listing_price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  old_price integer not null,
  new_price integer not null,
  changed_at timestamptz not null default now()
);

alter table listing_price_history enable row level security;

create policy "workspace members can read price history"
  on listing_price_history for select
  using (
    listing_id in (
      select l.id from listings l
      join users u on u.workspace_id = l.workspace_id
      where u.id = auth.uid()
    )
  );

create policy "workspace members can insert price history"
  on listing_price_history for insert
  with check (
    listing_id in (
      select l.id from listings l
      join users u on u.workspace_id = l.workspace_id
      where u.id = auth.uid()
    )
  );
