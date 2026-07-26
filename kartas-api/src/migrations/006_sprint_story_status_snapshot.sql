-- Phase 4.1 SR-01 (revised): Snapshot story status at sprint completion
--
-- Adds sprint_stories.snapshot_status so getSprintReport can read the
-- immutable status captured at sprint-end rather than the live stories.status.

ALTER TABLE sprint_stories
    ADD COLUMN IF NOT EXISTS snapshot_status VARCHAR(50);

-- Back-fill already-completed sprints.
-- PostgreSQL UPDATE...FROM does not allow referencing the target table inside
-- a JOIN...ON condition. Use comma-separated FROM tables and move all join
-- predicates into WHERE instead.
UPDATE sprint_stories
SET snapshot_status = s.status
FROM stories s, sprints sp
WHERE sprint_stories.story_id = s.id
  AND sprint_stories.sprint_id = sp.id
  AND sp.status = 'completed'
  AND sprint_stories.snapshot_status IS NULL;
