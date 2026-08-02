-- Phase 9 TRUST-01: per-browser "remember this device" opt-in — skips the
-- login-time 2FA challenge only, never anything step-up gates. token is
-- plaintext (high-entropy random value), matching refresh_tokens.token's
-- and step_up_grants.token's existing precedent.
CREATE TABLE IF NOT EXISTS trusted_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(token);
