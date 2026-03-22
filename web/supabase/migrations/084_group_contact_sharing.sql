-- Migration 084: group_contact_sharing table
-- Controls which pairs of agencies in a group can share contacts

CREATE TABLE IF NOT EXISTS group_contact_sharing (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  workspace_a_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_b_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  enabled         boolean NOT NULL DEFAULT false,
  enabled_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  enabled_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, workspace_a_id, workspace_b_id),
  -- Ensure workspace_a_id < workspace_b_id to prevent duplicate pairs (A,B) and (B,A)
  CHECK (workspace_a_id < workspace_b_id)
);

-- Enable RLS
ALTER TABLE group_contact_sharing ENABLE ROW LEVEL SECURITY;

-- Any member of a workspace in the group can see sharing settings
CREATE POLICY "group_contact_sharing_select"
  ON group_contact_sharing FOR SELECT
  USING (
    workspace_a_id IN (
      SELECT workspace_id FROM public.users WHERE id = auth.uid()
    )
    OR
    workspace_b_id IN (
      SELECT workspace_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only group_admin can manage sharing settings
CREATE POLICY "group_contact_sharing_insert_group_admin"
  ON group_contact_sharing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

CREATE POLICY "group_contact_sharing_update_group_admin"
  ON group_contact_sharing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

CREATE POLICY "group_contact_sharing_delete_group_admin"
  ON group_contact_sharing FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS group_contact_sharing_group_id_idx ON group_contact_sharing(group_id);
CREATE INDEX IF NOT EXISTS group_contact_sharing_workspace_a_idx ON group_contact_sharing(workspace_a_id);
CREATE INDEX IF NOT EXISTS group_contact_sharing_workspace_b_idx ON group_contact_sharing(workspace_b_id);
