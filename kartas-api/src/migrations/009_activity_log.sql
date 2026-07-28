-- Phase 4.8 FY-01b: Generalize change_history into a cross-entity activity log
ALTER TABLE change_history ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20);
ALTER TABLE change_history ADD COLUMN IF NOT EXISTS entity_id INTEGER;
ALTER TABLE change_history ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE change_history ADD COLUMN IF NOT EXISTS action_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_change_history_project_id ON change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_change_history_user_id ON change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_change_history_changed_at ON change_history(changed_at DESC);
