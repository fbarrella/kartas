-- Phase 4 UX polish: per-user, per-project settings (e.g. default landing page)
CREATE TABLE IF NOT EXISTS project_user_settings (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  default_landing_page VARCHAR(50) NOT NULL DEFAULT 'backlog',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);
