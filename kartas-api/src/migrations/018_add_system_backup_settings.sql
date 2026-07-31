CREATE TABLE IF NOT EXISTS system_backup_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    destination_type VARCHAR(10) NOT NULL DEFAULT 'local' CHECK (destination_type IN ('local', 's3')),
    local_path VARCHAR(500) NOT NULL DEFAULT './backups',
    s3_bucket VARCHAR(255),
    s3_region VARCHAR(50),
    s3_access_key_id VARCHAR(255),
    s3_secret_access_key VARCHAR(255),
    schedule_frequency VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (schedule_frequency IN ('hourly', 'daily', 'weekly')),
    schedule_time VARCHAR(5) NOT NULL DEFAULT '02:00',
    schedule_day_of_week INTEGER CHECK (schedule_day_of_week BETWEEN 0 AND 6),
    retention_count INTEGER NOT NULL DEFAULT 7,
    enabled BOOLEAN NOT NULL DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disabled by default — a fresh install shouldn't start dumping the DB on a
-- schedule the admin hasn't reviewed yet.
INSERT INTO system_backup_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    size_bytes BIGINT,
    destination VARCHAR(10) NOT NULL CHECK (destination IN ('local', 's3')),
    -- Resolved absolute local path at write time — system_backup_settings.local_path
    -- can change later, so re-deriving a path from current settings at download/
    -- restore time would silently break older rows. NULL for s3/failed rows.
    file_path VARCHAR(500),
    status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed')),
    triggered_by VARCHAR(10) NOT NULL CHECK (triggered_by IN ('cron', 'manual')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);
