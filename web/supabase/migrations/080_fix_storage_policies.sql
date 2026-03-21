-- Migration 080: Harden storage bucket policies
--
-- Issues fixed:
-- 1. contact-docs: policies only checked auth.uid() != null, not workspace isolation
--    → Any authenticated user could read/delete other workspaces' contact documents
-- 2. listing-docs: same vulnerability as contact-docs
-- 3. listings: INSERT/DELETE allowed any authenticated user to write to any folder
--    → Tightened to own user folder only (path prefix = auth.uid())
-- 4. user-avatars: no policies at all → added explicit read/write/delete policies

-- ============================================================
-- FIX 1: contact-docs — workspace-scoped policies
-- ============================================================
DROP POLICY IF EXISTS "auth_read_contact_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_contact_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_contact_docs" ON storage.objects;

CREATE POLICY "workspace_read_contact_docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contact-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "workspace_upload_contact_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contact-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "workspace_delete_contact_docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contact-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- FIX 2: listing-docs — workspace-scoped policies
-- ============================================================
DROP POLICY IF EXISTS "auth_read_listing_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_listing_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_listing_docs" ON storage.objects;

CREATE POLICY "workspace_read_listing_docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'listing-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "workspace_upload_listing_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "workspace_delete_listing_docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- FIX 3: listings — tighten INSERT/DELETE to own user folder
-- ============================================================
DROP POLICY IF EXISTS "authenticated_upload_listings" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_listings" ON storage.objects;

CREATE POLICY "own_folder_upload_listings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "own_folder_delete_listings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- FIX 4: user-avatars — add explicit policies
-- ============================================================
CREATE POLICY "public_read_user_avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

CREATE POLICY "own_avatar_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "own_avatar_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "own_avatar_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
