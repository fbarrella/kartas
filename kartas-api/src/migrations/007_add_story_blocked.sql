-- Phase 4.3 BL-02: Blocked task indicator
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
