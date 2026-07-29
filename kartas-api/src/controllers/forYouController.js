import { query } from '../config/database.js';

// "In-progress first" rank per FY-01a's acceptance criteria — active work states
// surface before ready/refining/backlog, with done/cancelled always last.
const STATUS_RANK = {
    in_development: 1,
    review: 2,
    test: 3,
    ready: 4,
    refining: 5,
    backlog: 6,
    done: 7,
    cancelled: 8
};

export const forYouController = {
    // Assigned tasks (stories + sub-tasks) within a single project, for either the
    // caller ("My Tasks" / "For You") or an arbitrary target user (UD-01/UD-02's
    // "[Name]'s Details" page) — the route optionally carries :userId; when absent,
    // this defaults to the caller. Either way, the caller must be a project member;
    // the target user is looked up regardless of their own membership/assignment.
    async getMyTasks(req, res) {
        try {
            const { projectId } = req.params;
            const callerId = req.user.userId;
            const targetUserId = req.params.userId || callerId;

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, callerId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const storiesResult = await query(
                `SELECT s.id, s.story_id as code, s.title, s.status, s.story_points,
                        s.project_id, s.epic_id, e.title as epic_title, e.color as epic_color,
                        s.updated_at
                 FROM stories s
                 LEFT JOIN epics e ON e.id = s.epic_id
                 WHERE s.project_id = $1 AND s.assignee_id = $2`,
                [projectId, targetUserId]
            );

            const subTasksResult = await query(
                `SELECT st.id, st.title, st.status, st.story_points,
                        s.project_id, s.epic_id, e.title as epic_title, e.color as epic_color,
                        st.updated_at, s.id as parent_story_id, s.story_id as parent_story_code
                 FROM sub_tasks st
                 JOIN stories s ON s.id = st.story_id
                 LEFT JOIN epics e ON e.id = s.epic_id
                 WHERE s.project_id = $1 AND st.assignee_id = $2`,
                [projectId, targetUserId]
            );

            const storyIds = storiesResult.rows.map(s => s.id).concat(
                subTasksResult.rows.map(st => st.parent_story_id)
            );

            let sprintByStoryId = {};
            if (storyIds.length > 0) {
                const sprintsResult = await query(
                    `SELECT DISTINCT ON (ss.story_id) ss.story_id, sp.id, sp.name, sp.status
                     FROM sprint_stories ss
                     JOIN sprints sp ON sp.id = ss.sprint_id
                     WHERE ss.story_id = ANY($1)
                     ORDER BY ss.story_id, (sp.status = 'active') DESC, sp.start_date DESC`,
                    [storyIds]
                );
                sprintByStoryId = sprintsResult.rows.reduce((acc, row) => {
                    acc[row.story_id] = { id: row.id, name: row.name, status: row.status };
                    return acc;
                }, {});
            }

            const tasks = [
                ...storiesResult.rows.map(s => ({
                    itemType: 'story',
                    id: s.id,
                    code: s.code,
                    title: s.title,
                    status: s.status,
                    storyPoints: s.story_points,
                    projectId: s.project_id,
                    epicId: s.epic_id,
                    epicTitle: s.epic_title,
                    epicColor: s.epic_color,
                    sprint: sprintByStoryId[s.id] || null,
                    storyId: s.id,
                    updatedAt: s.updated_at
                })),
                ...subTasksResult.rows.map(st => ({
                    itemType: 'subtask',
                    id: st.id,
                    code: st.parent_story_code,
                    title: st.title,
                    status: st.status,
                    storyPoints: st.story_points,
                    projectId: st.project_id,
                    epicId: st.epic_id,
                    epicTitle: st.epic_title,
                    epicColor: st.epic_color,
                    sprint: sprintByStoryId[st.parent_story_id] || null,
                    storyId: st.parent_story_id,
                    updatedAt: st.updated_at
                }))
            ];

            tasks.sort((a, b) => {
                const rankDiff = (STATUS_RANK[a.status] || 99) - (STATUS_RANK[b.status] || 99);
                if (rankDiff !== 0) return rankDiff;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            res.json(tasks);
        } catch (error) {
            console.error('Error fetching assigned tasks:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Recent activity within a single project, paginated latest-first — for either
    // the caller or an arbitrary target user, same :userId convention as getMyTasks.
    // UD-01/UD-02 pass ?limit=15 and never paginate further (no "Load More" there),
    // unlike the "For You" page's own use of this endpoint.
    async getMyActivity(req, res) {
        try {
            const { projectId } = req.params;
            const callerId = req.user.userId;
            const targetUserId = req.params.userId || callerId;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = parseInt(req.query.offset) || 0;

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, callerId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Fetch one extra row to determine hasMore without a second COUNT query.
            // COALESCE fallbacks cover rows written before migration 009 (entity_type/
            // action_type/project_id were NULL): those are always story field-updates,
            // so entity_type defaults to 'story' and action_type is derived from
            // field_changed the same way the old (pre-extension) code implied it.
            const result = await query(
                `SELECT ch.id, ch.field_changed, ch.old_value, ch.new_value, ch.changed_at,
                        COALESCE(ch.entity_type, 'story') as entity_type,
                        COALESCE(ch.entity_id, ch.story_id) as entity_id,
                        COALESCE(ch.action_type, CASE WHEN ch.field_changed = 'status' THEN 'moved' ELSE 'edited' END) as action_type,
                        ch.story_id,
                        s.story_id as story_code
                 FROM change_history ch
                 LEFT JOIN stories s ON s.id = ch.story_id
                 WHERE ch.user_id = $1 AND COALESCE(ch.project_id, s.project_id) = $2
                 ORDER BY ch.changed_at DESC
                 LIMIT $3 OFFSET $4`,
                [targetUserId, projectId, limit + 1, offset]
            );

            const hasMore = result.rows.length > limit;
            const rows = result.rows.slice(0, limit);

            res.json({
                items: rows.map(row => ({
                    id: row.id,
                    actionType: row.action_type,
                    entityType: row.entity_type,
                    entityId: row.entity_id,
                    fieldChanged: row.field_changed,
                    oldValue: row.old_value,
                    newValue: row.new_value,
                    storyId: row.story_id,
                    storyCode: row.story_code,
                    changedAt: row.changed_at
                })),
                hasMore
            });
        } catch (error) {
            console.error('Error fetching activity:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
