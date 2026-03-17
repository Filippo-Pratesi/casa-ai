-- Create listings storage bucket (public — property photos are public)
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

-- Anyone authenticated can upload (path scoped per workspace/agent in code)
create policy "authenticated_upload_listings"
  on storage.objects for insert
  with check (bucket_id = 'listings' and auth.uid() is not null);

-- Public read (photos served in listings)
create policy "public_read_listings"
  on storage.objects for select
  using (bucket_id = 'listings');

-- Authenticated users can delete (admins delete any, agents delete own — enforced in code)
create policy "authenticated_delete_listings"
  on storage.objects for delete
  using (bucket_id = 'listings' and auth.uid() is not null);
