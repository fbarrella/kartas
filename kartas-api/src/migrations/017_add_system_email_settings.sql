CREATE TABLE IF NOT EXISTS system_email_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    provider VARCHAR(20) NOT NULL DEFAULT 'smtp',
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_secure BOOLEAN,
    smtp_user VARCHAR(255),
    smtp_password VARCHAR(255),
    gmail_user VARCHAR(255),
    gmail_app_password VARCHAR(255),
    email_from VARCHAR(255),
    invite_message TEXT,
    invite_expiry_days INTEGER NOT NULL DEFAULT 7,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- No credential column is NOT NULL — an all-env-configured deployment has a
-- row that's entirely NULL except the two defaults below, and that's valid.
INSERT INTO system_email_settings (id, provider, invite_expiry_days)
VALUES (1, 'smtp', 7)
ON CONFLICT (id) DO NOTHING;
