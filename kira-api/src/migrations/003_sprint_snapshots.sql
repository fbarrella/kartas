-- Add sprint daily snapshots table for burndown chart data
CREATE TABLE IF NOT EXISTS sprint_daily_snapshots (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  remaining_points INTEGER DEFAULT 0,
  remaining_stories INTEGER DEFAULT 0,
  completed_points INTEGER DEFAULT 0,
  completed_stories INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sprint_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint ON sprint_daily_snapshots(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_date ON sprint_daily_snapshots(snapshot_date);

-- Function to capture daily sprint snapshot
CREATE OR REPLACE FUNCTION capture_sprint_snapshot(p_sprint_id INTEGER)
RETURNS void AS $$
DECLARE
  v_completed_points INTEGER;
  v_completed_stories INTEGER;
  v_total_points INTEGER;
  v_total_stories INTEGER;
BEGIN
  -- Calculate metrics for the sprint
  SELECT 
    COALESCE(SUM(s.story_points) FILTER (WHERE s.status = 'done'), 0),
    COUNT(*) FILTER (WHERE s.status = 'done'),
    COALESCE(SUM(s.story_points), 0),
    COUNT(*)
  INTO v_completed_points, v_completed_stories, v_total_points, v_total_stories
  FROM sprint_stories ss
  JOIN stories s ON ss.story_id = s.id
  WHERE ss.sprint_id = p_sprint_id;

  -- Insert or update today's snapshot
  INSERT INTO sprint_daily_snapshots (
    sprint_id, 
    snapshot_date, 
    remaining_points, 
    remaining_stories,
    completed_points,
    completed_stories
  )
  VALUES (
    p_sprint_id,
    CURRENT_DATE,
    v_total_points - v_completed_points,
    v_total_stories - v_completed_stories,
    v_completed_points,
    v_completed_stories
  )
  ON CONFLICT (sprint_id, snapshot_date)
  DO UPDATE SET
    remaining_points = EXCLUDED.remaining_points,
    remaining_stories = EXCLUDED.remaining_stories,
    completed_points = EXCLUDED.completed_points,
    completed_stories = EXCLUDED.completed_stories,
    created_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
