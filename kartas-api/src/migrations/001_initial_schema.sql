-- Initial database schema for Kartas project management tool

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- admin, project_owner, member
  first_login BOOLEAN DEFAULT TRUE,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects/Teams table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ticket_prefix VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- owner, member
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

-- Epics table
CREATE TABLE IF NOT EXISTS epics (
  id SERIAL PRIMARY KEY,
  epic_id VARCHAR(20) UNIQUE NOT NULL, -- EPIC-0001, EPIC-0002, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories table (user stories, tasks, bugs)
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  story_id VARCHAR(20) UNIQUE NOT NULL, -- GGY-0001, GOC-0042, etc.
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- story, task, bug
  status VARCHAR(50) NOT NULL DEFAULT 'backlog', -- backlog, refining, ready, in_development, review, test, done, cancelled
  title VARCHAR(255) NOT NULL,
  description TEXT,
  story_points INTEGER,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  objective TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint stories junction table
CREATE TABLE IF NOT EXISTS sprint_stories (
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sprint_id, story_id)
);

-- Sub-tasks/Sub-tests table
CREATE TABLE IF NOT EXISTS sub_tasks (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- sub_task, sub_test
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'backlog',
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Change history table
CREATE TABLE IF NOT EXISTS change_history (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  field_changed VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#0052CC', -- Hex color code
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Story tags junction table
CREATE TABLE IF NOT EXISTS story_tags (
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, tag_id)
);

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_project_id ON stories(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON stories(assignee_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_story_id ON sub_tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments(story_id);
CREATE INDEX IF NOT EXISTS idx_change_history_story_id ON change_history(story_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_epics_updated_at ON epics;
CREATE TRIGGER update_epics_updated_at BEFORE UPDATE ON epics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sub_tasks_updated_at ON sub_tasks;
CREATE TRIGGER update_sub_tasks_updated_at BEFORE UPDATE ON sub_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User invites table
CREATE TABLE IF NOT EXISTS user_invites (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

