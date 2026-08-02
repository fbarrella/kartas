-- Phase 9 RECAP-01: admin-configurable reCAPTCHA, mirroring system_email_settings'
-- exact singleton convention — env vars win when set, this row is the fallback.
CREATE TABLE IF NOT EXISTS system_recaptcha_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_key TEXT,
  secret_key TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_recaptcha_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
