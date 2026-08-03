-- Phase 8 TFA-01/TFA-03/TFA-05: in-progress 2FA verification attempts, for
-- both login step-up (purpose='login') and email-method enrollment
-- (purpose='enable_email'). code_hash is NULL for the totp method, which is
-- verified live against users.totp_secret rather than a server-generated code.
CREATE TABLE IF NOT EXISTS two_factor_challenges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL,
  method VARCHAR(10) NOT NULL,
  code_hash VARCHAR(255),
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  last_sent_at TIMESTAMP,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_two_factor_challenges_user_id ON two_factor_challenges(user_id);
