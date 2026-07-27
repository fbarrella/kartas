-- Phase 4.5 ST-01: Sub-task story points
ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;
