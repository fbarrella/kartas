-- Phase 6 FY-06: per-user, per-project "For You" widget visibility. NULL means
-- "use the default set" (My Tasks + Actions History) rather than an empty array,
-- so existing rows (from Phase 4's default-landing-page feature) aren't
-- interpreted as "show nothing".
ALTER TABLE project_user_settings ADD COLUMN IF NOT EXISTS visible_widgets JSONB;
