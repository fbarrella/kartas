-- Phase 2: Kanban column configurations and sprint metrics

-- Kanban column configurations
CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  visible BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, status)
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_project ON kanban_columns(project_id);

-- Function to create default columns for new projects
CREATE OR REPLACE FUNCTION create_default_kanban_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO kanban_columns (project_id, status, display_name, visible, position)
  VALUES
    (NEW.id, 'backlog', 'Backlog', false, 1),
    (NEW.id, 'refining', 'Refining', false, 2),
    (NEW.id, 'ready', 'Ready', true, 3),
    (NEW.id, 'in_development', 'In Development', true, 4),
    (NEW.id, 'review', 'Review', true, 5),
    (NEW.id, 'test', 'Test', true, 6),
    (NEW.id, 'done', 'Done', true, 7),
    (NEW.id, 'cancelled', 'Cancelled', false, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create columns for new projects
DROP TRIGGER IF EXISTS create_kanban_columns_trigger ON projects;
CREATE TRIGGER create_kanban_columns_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_default_kanban_columns();

-- Create columns for existing projects
INSERT INTO kanban_columns (project_id, status, display_name, visible, position)
SELECT p.id, status, display_name, visible, position
FROM projects p
CROSS JOIN (VALUES
  ('backlog', 'Backlog', false, 1),
  ('refining', 'Refining', false, 2),
  ('ready', 'Ready', true, 3),
  ('in_development', 'In Development', true, 4),
  ('review', 'Review', true, 5),
  ('test', 'Test', true, 6),
  ('done', 'Done', true, 7),
  ('cancelled', 'Cancelled', false, 8)
) AS defaults(status, display_name, visible, position)
ON CONFLICT DO NOTHING;

-- Sprint metrics table for tracking story movement
CREATE TABLE IF NOT EXISTS sprint_metrics (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exited_at TIMESTAMP,
  UNIQUE(sprint_id, story_id, status, entered_at)
);

CREATE INDEX IF NOT EXISTS idx_sprint_metrics_sprint ON sprint_metrics(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_metrics_story ON sprint_metrics(story_id);

-- Trigger to track story status changes for metrics
CREATE OR REPLACE FUNCTION track_story_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if story is in a sprint
  IF EXISTS (SELECT 1 FROM sprint_stories WHERE story_id = NEW.id) THEN
    -- Close previous status entry
    UPDATE sprint_metrics
    SET exited_at = CURRENT_TIMESTAMP
    WHERE story_id = NEW.id
      AND status = OLD.status
      AND exited_at IS NULL;
    
    -- Create new status entry
    INSERT INTO sprint_metrics (sprint_id, story_id, status)
    SELECT ss.sprint_id, NEW.id, NEW.status
    FROM sprint_stories ss
    WHERE ss.story_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_story_status_trigger ON stories;
CREATE TRIGGER track_story_status_trigger
AFTER UPDATE OF status ON stories
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_story_status_change();
