-- SRCH-01: enable trigram similarity search for the top search bar
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_epics_title_trgm ON epics USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stories_title_trgm ON stories USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_title_trgm ON sub_tasks USING GIN (title gin_trgm_ops);

-- Expression index — the query matches the concatenated full name, and a
-- GIN trigram index can only be used for an expression it matches verbatim
-- against the query, not a plain per-column index on first_name/last_name.
CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm
    ON users USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);
