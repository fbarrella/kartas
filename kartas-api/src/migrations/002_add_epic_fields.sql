-- Add missing columns to epics table

-- Add project_id column
ALTER TABLE epics ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Add start_date and end_date columns
ALTER TABLE epics ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE epics ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update status column to use new values
ALTER TABLE epics ALTER COLUMN status DROP DEFAULT;
ALTER TABLE epics ALTER COLUMN status SET DEFAULT 'planning';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
