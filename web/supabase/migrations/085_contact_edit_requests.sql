-- Migration 085: contact_edit_requests table
-- Stores proposed modifications to contacts owned by other agencies in the network

CREATE TABLE IF NOT EXISTS contact_edit_requests (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id            uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requester_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requester_workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  changes               jsonb NOT NULL,  -- { "field": { "old": ..., "new": ... } }
  note                  text,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason      text,
  reviewed_by           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_edit_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own requests
CREATE POLICY "contact_edit_requests_select_requester"
  ON contact_edit_requests FOR SELECT
  USING (requester_id = auth.uid());

-- Admins of the owner workspace can see requests for their contacts
CREATE POLICY "contact_edit_requests_select_owner_admin"
  ON contact_edit_requests FOR SELECT
  USING (
    owner_workspace_id IN (
      SELECT workspace_id FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'group_admin')
    )
  );

-- Any authenticated user can create a request (security enforced at API level)
CREATE POLICY "contact_edit_requests_insert"
  ON contact_edit_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Only admins of the owner workspace (or group_admin) can update status
CREATE POLICY "contact_edit_requests_update_owner_admin"
  ON contact_edit_requests FOR UPDATE
  USING (
    owner_workspace_id IN (
      SELECT workspace_id FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'group_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'group_admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS contact_edit_requests_contact_id_idx ON contact_edit_requests(contact_id);
CREATE INDEX IF NOT EXISTS contact_edit_requests_owner_workspace_idx ON contact_edit_requests(owner_workspace_id);
CREATE INDEX IF NOT EXISTS contact_edit_requests_requester_id_idx ON contact_edit_requests(requester_id);
CREATE INDEX IF NOT EXISTS contact_edit_requests_status_idx ON contact_edit_requests(status);
