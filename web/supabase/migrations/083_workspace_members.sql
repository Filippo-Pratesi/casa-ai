-- Migration 083: workspace_members table
-- Allows a user to belong to multiple workspaces (multi-agency network support)

CREATE TABLE IF NOT EXISTS workspace_members (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'agent',
  is_default    boolean NOT NULL DEFAULT false,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Populate from existing users table (backward compat)
INSERT INTO workspace_members (user_id, workspace_id, role, is_default)
SELECT id, workspace_id, role, true
FROM public.users
WHERE workspace_id IS NOT NULL
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "workspace_members_select_own"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Admins and group_admins can see all members in their workspaces
CREATE POLICY "workspace_members_select_admins"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'group_admin')
    )
  );

-- Only group_admin can insert/update/delete memberships
CREATE POLICY "workspace_members_insert_group_admin"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

CREATE POLICY "workspace_members_update_group_admin"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

CREATE POLICY "workspace_members_delete_group_admin"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members(workspace_id);
