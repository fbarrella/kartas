import { query } from '../config/database.js';

// SRCH-01: combined project search across epics/stories/sub-tasks/users.
// Deliberately separate from storyController.js's searchStories (still used
// by CMT-03's @mention autocomplete) and userController.js's searchUsers
// (still used by global-scope callers elsewhere) — neither is modified here.

const SECTIONS = ['epics', 'stories', 'subTasks', 'users'];

// One arm per entity type, matching the shared uniform row shape:
// type, id, title, code, context, storyId, relevance (relevance stripped
// before the response is sent — it only exists to drive ORDER BY).
//
// storyId is the NUMERIC id to navigate to a story's page with (the
// /story/:storyId route actually keys on the story's numeric primary key,
// not its human-readable code) — for a 'story' row this is its own id; for
// a 'sub_task' row this is the PARENT story's numeric id (a sub-task has no
// page of its own); null for epic/user, which navigate via their own `id`.
const sectionQuery = (section) => {
    switch (section) {
        // Matching uses ILIKE '%q%' (accelerated by the GIN trigram indexes from
        // migration 016 — that's what trigram indexes are actually for: fast
        // wildcard-anywhere ILIKE, per the original PRD research). similarity()
        // is used only in the ORDER BY, for ranking, never as the inclusion
        // filter — the pg_trgm `%` operator compares WHOLE-STRING similarity,
        // which scores a short query far too low against a long title (e.g.
        // "DEV" vs "[DEV] Modal de aviso de canal de texto +18" fails to pass
        // the default 0.3 threshold despite being a clear substring match).
        case 'epics':
            return {
                sql: `
                    SELECT 'epic' as type, e.id, e.title, e.epic_id as code, NULL as context, NULL::integer as story_id_num,
                           GREATEST(similarity(e.title, $2), CASE WHEN LOWER(e.epic_id) LIKE LOWER($2 || '%') THEN 1.0 ELSE 0 END) as relevance
                    FROM epics e
                    WHERE e.project_id = $1
                      AND (e.title ILIKE ('%' || $2 || '%') OR LOWER(e.epic_id) LIKE LOWER('%' || $2 || '%'))
                `
            };
        case 'stories':
            return {
                sql: `
                    SELECT 'story' as type, s.id, s.title, s.story_id as code, NULL as context, s.id as story_id_num,
                           GREATEST(similarity(s.title, $2), CASE WHEN LOWER(s.story_id) LIKE LOWER($2 || '%') THEN 1.0 ELSE 0 END) as relevance
                    FROM stories s
                    WHERE s.project_id = $1
                      AND (s.title ILIKE ('%' || $2 || '%') OR LOWER(s.story_id) LIKE LOWER('%' || $2 || '%'))
                `
            };
        case 'subTasks':
            return {
                sql: `
                    SELECT 'sub_task' as type, st.id, st.title, NULL as code, (s.story_id || ' · ' || s.title) as context, s.id as story_id_num,
                           similarity(st.title, $2) as relevance
                    FROM sub_tasks st
                    JOIN stories s ON s.id = st.story_id
                    WHERE s.project_id = $1
                      AND st.title ILIKE ('%' || $2 || '%')
                `
            };
        case 'users':
            return {
                sql: `
                    SELECT 'user' as type, u.id, (u.first_name || ' ' || u.last_name) as title, NULL as code, u.email as context, NULL::integer as story_id_num,
                           similarity(u.first_name || ' ' || u.last_name, $2) as relevance
                    FROM users u
                    JOIN project_members pm ON pm.user_id = u.id
                    WHERE pm.project_id = $1
                      AND (u.first_name || ' ' || u.last_name) ILIKE ('%' || $2 || '%')
                `
            };
        default:
            throw new Error(`Unknown search section: ${section}`);
    }
};

const toRow = (row) => ({
    type: row.type,
    id: row.id,
    title: row.title,
    code: row.code,
    context: row.context,
    storyId: row.story_id_num
});

async function searchCapped(res, projectId, q) {
    const unionSql = SECTIONS.map(s => sectionQuery(s).sql).join(' UNION ALL ');
    const result = await query(
        `SELECT * FROM (${unionSql}) combined ORDER BY relevance DESC, title ASC LIMIT 5`,
        [projectId, q]
    );
    const items = result.rows.slice(0, 4).map(toRow);
    res.json({ items, hasMore: result.rows.length > 4 });
}

async function searchFull(res, projectId, q, section, limit, offset) {
    if (!SECTIONS.includes(section)) {
        return res.status(400).json({ error: `Invalid section. Must be one of: ${SECTIONS.join(', ')}` });
    }
    const { sql } = sectionQuery(section);
    const result = await query(
        `SELECT * FROM (${sql}) matched ORDER BY relevance DESC, title ASC LIMIT $3 OFFSET $4`,
        [projectId, q, limit + 1, offset]
    );
    const items = result.rows.slice(0, limit).map(toRow);
    res.json({ items, hasMore: result.rows.length > limit });
}

export const searchController = {
    async search(req, res) {
        try {
            const { projectId } = req.params;
            const { q, full, section } = req.query;
            const userId = req.user.userId;

            if (!q || q.length < 2) {
                return res.json({ items: [], hasMore: false });
            }

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );
            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (full === 'true') {
                if (!section) {
                    return res.status(400).json({ error: 'section is required when full=true' });
                }
                const limit = parseInt(req.query.limit) || 10;
                const offset = parseInt(req.query.offset) || 0;
                return await searchFull(res, projectId, q, section, limit, offset);
            }

            return await searchCapped(res, projectId, q);
        } catch (error) {
            console.error('Error searching:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
