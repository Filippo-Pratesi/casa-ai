-- Migration 081: Fix minor RLS issues on todos and users tables
--
-- Fix 1: todos INSERT policy was missing workspace_id check.
--   A user could insert a todo with a foreign workspace_id.
--   Now enforces: created_by = auth.uid() AND workspace_id = own workspace.
--
-- Fix 2: users table had two identical SELECT policies
--   (users_see_own_profile and users_read_own_profile, both: id = auth.uid()).
--   Removed the duplicate.

-- Fix todos INSERT
DROP POLICY IF EXISTS "Users can create todos in their workspace" ON public.todos;

CREATE POLICY "Users can create todos in their workspace"
  ON public.todos FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Remove duplicate SELECT policy on users
DROP POLICY IF EXISTS "users_see_own_profile" ON public.users;
