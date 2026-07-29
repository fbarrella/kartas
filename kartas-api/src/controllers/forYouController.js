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
    },

    // FY-01's "Team Workload" bar graph — each assignee's currently-assigned
    // stories/sub-tasks in the active sprint, broken down by status. 404 (no
    // active sprint) is treated the same way getKanbanBoard/getActiveSprint
    // already do — the frontend shows a placeholder instead of an empty chart.
    async getTeamWorkload(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const sprintResult = await query(
                `SELECT id, name FROM sprints WHERE project_id = $1 AND status = 'active'`,
                [projectId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'No active sprint found' });
            }

            const sprint = sprintResult.rows[0];

            const itemsResult = await query(
                `SELECT s.assignee_id, u.first_name || ' ' || u.last_name as assignee_name, s.status
                 FROM sprint_stories ss
                 JOIN stories s ON ss.story_id = s.id
                 LEFT JOIN users u ON s.assignee_id = u.id
                 WHERE ss.sprint_id = $1 AND s.assignee_id IS NOT NULL
                 UNION ALL
                 SELECT st.assignee_id, u.first_name || ' ' || u.last_name as assignee_name, st.status
                 FROM sub_tasks st
                 JOIN stories s ON st.story_id = s.id
                 JOIN sprint_stories ss ON ss.story_id = s.id
                 LEFT JOIN users u ON st.assignee_id = u.id
                 WHERE ss.sprint_id = $1 AND st.assignee_id IS NOT NULL`,
                [sprint.id]
            );

            const byAssignee = {};
            itemsResult.rows.forEach(row => {
                if (!byAssignee[row.assignee_id]) {
                    byAssignee[row.assignee_id] = { assigneeId: row.assignee_id, assigneeName: row.assignee_name };
                }
                byAssignee[row.assignee_id][row.status] = (byAssignee[row.assignee_id][row.status] || 0) + 1;
            });

            res.json({
                sprintId: sprint.id,
                sprintName: sprint.name,
                data: Object.values(byAssignee)
            });
        } catch (error) {
            console.error('Error fetching team workload:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // FY-04's "Latest Activities" — a *new*, separate feed from getMyActivity
    // ("Actions History", my own actions, unchanged): this shows other users'
    // changes to items assigned to me, plus comment @mentions of me anywhere in
    // the project, merged and sorted together. Two heterogeneous sources can't
    // share one SQL LIMIT/OFFSET cleanly, so both are fetched in full (bounded
    // to a sane cap — this is a small-scale team tool, not a firehose) and
    // paginated in JS after merging.
    async getLatestActivities(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;
            const limit = Math.min(parseInt(req.query.limit) || 10, 100);
            const offset = parseInt(req.query.offset) || 0;
            const FETCH_CAP = 200;

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const changesResult = await query(
                `SELECT ch.id, ch.field_changed, ch.old_value, ch.new_value, ch.changed_at,
                        actor.first_name || ' ' || actor.last_name as actor_name,
                        COALESCE(ch.entity_type, 'story') as entity_type,
                        COALESCE(ch.action_type, CASE WHEN ch.field_changed = 'status' THEN 'moved' ELSE 'edited' END) as action_type,
                        ch.story_id, s.story_id as story_code
                 FROM change_history ch
                 LEFT JOIN stories s ON s.id = ch.story_id
                 LEFT JOIN sub_tasks subt ON subt.id = COALESCE(ch.entity_id, ch.story_id) AND COALESCE(ch.entity_type, 'story') = 'sub_task'
                 LEFT JOIN users actor ON actor.id = ch.user_id
                 WHERE COALESCE(ch.project_id, s.project_id) = $1
                   AND ch.user_id != $2
                   AND ch.field_changed != 'comment'
                   AND (
                        (COALESCE(ch.entity_type, 'story') = 'story' AND s.assignee_id = $2)
                        OR (COALESCE(ch.entity_type, 'story') = 'sub_task' AND subt.assignee_id = $2)
                   )
                 ORDER BY ch.changed_at DESC
                 LIMIT $3`,
                [projectId, userId, FETCH_CAP]
            );

            const mentionsResult = await query(
                `SELECT cm.id, cm.comment_id, cm.created_at as changed_at,
                        c.story_id, s.story_id as story_code,
                        cu.first_name || ' ' || cu.last_name as actor_name
                 FROM comment_mentions cm
                 JOIN comments c ON c.id = cm.comment_id
                 JOIN stories s ON s.id = c.story_id
                 JOIN users cu ON cu.id = c.user_id
                 WHERE cm.mentioned_user_id = $2 AND s.project_id = $1
                 ORDER BY cm.created_at DESC
                 LIMIT $3`,
                [projectId, userId, FETCH_CAP]
            );

            const changeItems = changesResult.rows.map(row => ({
                id: `change-${row.id}`,
                kind: 'change',
                actorName: row.actor_name,
                entityType: row.entity_type,
                actionType: row.action_type,
                fieldChanged: row.field_changed,
                oldValue: row.old_value,
                newValue: row.new_value,
                storyId: row.story_id,
                storyCode: row.story_code,
                changedAt: row.changed_at
            }));

            const mentionItems = mentionsResult.rows.map(row => ({
                id: `mention-${row.id}`,
                kind: 'mention',
                actorName: row.actor_name,
                commentId: row.comment_id,
                storyId: row.story_id,
                storyCode: row.story_code,
                changedAt: row.changed_at
            }));

            const merged = [...changeItems, ...mentionItems].sort(
                (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
            );

            const hasMore = merged.length > offset + limit;
            const items = merged.slice(offset, offset + limit);

            res.json({ items, hasMore });
        } catch (error) {
            console.error('Error fetching latest activities:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
