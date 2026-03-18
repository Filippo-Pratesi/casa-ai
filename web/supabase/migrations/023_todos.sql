-- Todos table
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookup
CREATE INDEX todos_assigned_to_idx ON todos(assigned_to);
CREATE INDEX todos_created_by_idx ON todos(created_by);
CREATE INDEX todos_workspace_id_idx ON todos(workspace_id);

-- RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_select" ON todos
  FOR SELECT USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "todos_insert" ON todos
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "todos_update" ON todos
  FOR UPDATE USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "todos_delete" ON todos
  FOR DELETE USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );
