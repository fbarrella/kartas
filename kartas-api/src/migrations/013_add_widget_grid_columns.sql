-- Phase 6 follow-up (post-FY-05, user-requested): lets each user choose 2 or 3
-- columns for their For You widget grid. NULL means "use the default" (2).
ALTER TABLE project_user_settings ADD COLUMN IF NOT EXISTS grid_columns INTEGER;
