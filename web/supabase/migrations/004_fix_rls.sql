-- Fix: Add a non-recursive policy so users can always read their own profile row.
-- The previous "users_see_workspace_members" policy used an inline subquery on the
-- same table, which returns NULL for new users and blocks them from seeing themselves.
-- PostgreSQL's permissive policies are OR'd together, so adding this second policy
-- allows: own row OR any row in same workspace.

create policy "users_see_own_profile"
  on users for select
  using (id = auth.uid());

-- Fix: Allow users to read their own workspace record directly (same recursion issue).
-- Previously workspace visibility relied on the recursive users subquery.
-- This adds a direct path: if you can see yourself in users, you can see your workspace.
create policy "users_see_own_workspace_direct"
  on workspaces for select
  using (id = (select workspace_id from users where id = auth.uid()));

-- Note: the original "users_see_own_workspace" policy uses the same subquery and
-- is now redundant but harmless. Both will OR together.
