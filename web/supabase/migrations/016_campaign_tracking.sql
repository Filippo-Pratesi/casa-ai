-- RPC function to safely increment campaign opened_count
create or replace function increment_campaign_opened(campaign_id uuid)
returns void
language sql
security definer
as $$
  update campaigns
  set opened_count = coalesce(opened_count, 0) + 1
  where id = campaign_id;
$$;
