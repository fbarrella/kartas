-- Phase 4.1 SR-01: Freeze sprint metrics after sprint end
-- Updates track_story_status_change() to only record metrics for active sprints.
-- Completed sprints are now immutable: no new metrics rows, no exited_at updates.

CREATE OR REPLACE FUNCTION track_story_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if story is in an ACTIVE sprint (prevents polluting completed sprint data)
  IF EXISTS (
    SELECT 1
    FROM sprint_stories ss
    JOIN sprints sp ON ss.sprint_id = sp.id
    WHERE ss.story_id = NEW.id
      AND sp.status = 'active'
  ) THEN
    -- Close previous status entry only for the active sprint
    UPDATE sprint_metrics sm
    SET exited_at = CURRENT_TIMESTAMP
    FROM sprint_stories ss
    JOIN sprints sp ON ss.sprint_id = sp.id
    WHERE sm.story_id = NEW.id
      AND sm.status = OLD.status
      AND sm.exited_at IS NULL
      AND sm.sprint_id = ss.sprint_id
      AND ss.story_id = NEW.id
      AND sp.status = 'active';

    -- Create new status entry only for the active sprint
    INSERT INTO sprint_metrics (sprint_id, story_id, status)
    SELECT ss.sprint_id, NEW.id, NEW.status
    FROM sprint_stories ss
    JOIN sprints sp ON ss.sprint_id = sp.id
    WHERE ss.story_id = NEW.id
      AND sp.status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS track_story_status_trigger ON stories;
CREATE TRIGGER track_story_status_trigger
AFTER UPDATE OF status ON stories
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_story_status_change();
