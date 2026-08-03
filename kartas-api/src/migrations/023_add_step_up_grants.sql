-- Phase 9 STEPUP-01: short-lived, reusable-within-window re-verification
-- grants for destructive/sensitive actions — an "additive elevation" on top
-- of an already-authenticated session, not a replacement login. token is
-- plaintext (high-entropy random value), matching refresh_tokens.token's
-- existing precedent — hashing is reserved for low-entropy human secrets.
CREATE TABLE IF NOT EXISTS step_up_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_step_up_grants_token ON step_up_grants(token);
