-- Phase 6 CMT-04: tracks @mentions in comments so the mentioned user sees them
-- in their "Latest Activities" feed (FY-04) even when not assigned to the story.
-- Deliberately not written into change_history, whose user_id column means
-- "who performed the action" everywhere else it's used.
CREATE TABLE IF NOT EXISTS comment_mentions (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
