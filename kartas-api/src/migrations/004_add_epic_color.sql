-- Add color field to epics table

ALTER TABLE epics ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#0052CC';

-- Update existing epics to have default color
UPDATE epics SET color = '#0052CC' WHERE color IS NULL;
