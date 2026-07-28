import { query } from '../config/database.js';

export const kanbanController = {
    // Get kanban board data for active sprint
    async getKanbanBoard(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get active sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE project_id = $1 AND status = $2',
                [projectId, 'active']
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'No active sprint found' });
            }

            const sprint = sprintResult.rows[0];

            // Get column configuration
            const columnsResult = await query(
                `SELECT status, display_name, visible, position
         FROM kanban_columns
         WHERE project_id = $1 AND visible = true
         ORDER BY position`,
                [projectId]
            );

            // Get stories for active sprint with sub-tasks
            const storiesResult = await query(
                `SELECT s.*,
                u1.first_name || ' ' || u1.last_name as assignee_name,
                u2.first_name || ' ' || u2.last_name as creator_name,
                e.title as epic_title,
                COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'done') as completed_subtasks,
                COUNT(DISTINCT st.id) as total_subtasks
         FROM sprint_stories ss
         JOIN stories s ON ss.story_id = s.id
         LEFT JOIN users u1 ON s.assignee_id = u1.id
         LEFT JOIN users u2 ON s.creator_id = u2.id
         LEFT JOIN epics e ON s.epic_id = e.id
         LEFT JOIN sub_tasks st ON s.id = st.story_id
         WHERE ss.sprint_id = $1
         GROUP BY s.id, u1.first_name, u1.last_name, u2.first_name, u2.last_name, e.title
         ORDER BY s.created_at`,
                [sprint.id]
            );

            // Get individual sub-tasks for stories in the active sprint
            const subTasksResult = await query(
                `SELECT st.*,
                u.first_name || ' ' || u.last_name as assignee_name,
                s.story_id as parent_story_code
         FROM sub_tasks st
         JOIN stories s ON st.story_id = s.id
         JOIN sprint_stories ss ON ss.story_id = s.id
         LEFT JOIN users u ON st.assignee_id = u.id
         WHERE ss.sprint_id = $1
         ORDER BY st.created_at`,
                [sprint.id]
            );

            // Group stories by status
            const storiesByStatus = {};
            storiesResult.rows.forEach(story => {
                if (!storiesByStatus[story.status]) {
                    storiesByStatus[story.status] = [];
                }
                storiesByStatus[story.status].push({
                    itemType: 'story',
                    id: story.id,
                    storyId: story.story_id,
                    type: story.type,
                    status: story.status,
                    title: story.title,
                    description: story.description,
                    storyPoints: story.story_points,
                    assigneeId: story.assignee_id,
                    assigneeName: story.assignee_name,
                    creatorName: story.creator_name,
                    epicId: story.epic_id,
                    epicTitle: story.epic_title,
                    isBlocked: story.is_blocked,
                    completedSubtasks: parseInt(story.completed_subtasks),
                    totalSubtasks: parseInt(story.total_subtasks)
                });
            });

            // Append sub-tasks after stories in their own status column
            subTasksResult.rows.forEach(st => {
                if (!storiesByStatus[st.status]) {
                    storiesByStatus[st.status] = [];
                }
                storiesByStatus[st.status].push({
                    itemType: 'subtask',
                    id: st.id,
                    type: st.type,
                    status: st.status,
                    title: st.title,
                    description: st.description,
                    storyPoints: st.story_points,
                    assigneeId: st.assignee_id,
                    assigneeName: st.assignee_name,
                    parentStoryId: st.story_id,
                    parentStoryCode: st.parent_story_code
                });
            });

            // Build columns with stories
            const columns = columnsResult.rows.map(col => ({
                status: col.status,
                displayName: col.display_name,
                visible: col.visible,
                position: col.position,
                stories: storiesByStatus[col.status] || []
            }));

            res.json({
                sprint: {
                    id: sprint.id,
                    name: sprint.name,
                    objective: sprint.objective,
                    startDate: sprint.start_date,
                    endDate: sprint.end_date,
                    status: sprint.status
                },
                columns
            });
        } catch (error) {
            console.error('Error fetching kanban board:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update story status (for drag-and-drop)
    async updateStoryStatus(req, res) {
        try {
            const { storyId } = req.params;
            const { status } = req.body;
            const userId = req.user.userId;

            // Get story
            const storyResult = await query(
                'SELECT project_id, status FROM stories WHERE id = $1',
                [storyId]
            );

            if (storyResult.rows.length === 0) {
                return res.status(404).json({ error: 'Story not found' });
            }

            const story = storyResult.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [story.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Validate status
            const validStatuses = ['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            // Update story status
            const result = await query(
                'UPDATE stories SET status = $1 WHERE id = $2 RETURNING *',
                [status, storyId]
            );

            const updatedStory = result.rows[0];

            // Record change in history
            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
         VALUES ($1, $2, 'status', $3, $4, 'story', $1, $5, 'moved')`,
                [storyId, userId, story.status, status, story.project_id]
            );

            res.json({
                id: updatedStory.id,
                storyId: updatedStory.story_id,
                status: updatedStory.status
            });
        } catch (error) {
            console.error('Error updating story status:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update sub-task status (for drag-and-drop)
    async updateSubTaskStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.userId;

            const subTaskResult = await query(
                `SELECT s.project_id, st.status as current_status, st.story_id as parent_story_id
         FROM sub_tasks st
         JOIN stories s ON st.story_id = s.id
         WHERE st.id = $1`,
                [id]
            );

            if (subTaskResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sub-task not found' });
            }

            const subTask = subTaskResult.rows[0];

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [subTask.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const validStatuses = ['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const result = await query(
                'UPDATE sub_tasks SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );

            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, $2, 'status', $3, $4, 'sub_task', $5, $6, 'moved')`,
                [subTask.parent_story_id, userId, subTask.current_status, status, id, subTask.project_id]
            );

            res.json({ id: result.rows[0].id, status: result.rows[0].status });
        } catch (error) {
            console.error('Error updating sub-task status:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get column configuration
    async getColumnConfig(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get column configuration
            const result = await query(
                `SELECT status, display_name, visible, position
         FROM kanban_columns
         WHERE project_id = $1
         ORDER BY position`,
                [projectId]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching column config:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update column configuration
    async updateColumnConfig(req, res) {
        try {
            const { projectId } = req.params;
            const { columns } = req.body;
            const userId = req.user.userId;

            if (!Array.isArray(columns)) {
                return res.status(400).json({ error: 'columns must be an array' });
            }

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Update each column
            for (const column of columns) {
                await query(
                    `UPDATE kanban_columns
           SET display_name = $1, visible = $2, position = $3
           WHERE project_id = $4 AND status = $5`,
                    [column.displayName, column.visible, column.position, projectId, column.status]
                );
            }

            res.json({ message: 'Column configuration updated successfully' });
        } catch (error) {
            console.error('Error updating column config:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get sprint metrics
    async getSprintMetrics(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT project_id FROM sprints WHERE id = $1',
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get story completion metrics
            const completionResult = await query(
                `SELECT 
           COUNT(*) FILTER (WHERE s.status = 'done') as completed_stories,
           COUNT(*) as total_stories,
           COALESCE(SUM(s.story_points) FILTER (WHERE s.status = 'done'), 0) as completed_points,
           COALESCE(SUM(s.story_points), 0) as total_points
         FROM sprint_stories ss
         JOIN stories s ON ss.story_id = s.id
         WHERE ss.sprint_id = $1`,
                [sprintId]
            );

            // Get time in status metrics
            const timeMetrics = await query(
                `SELECT 
           sm.status,
           COUNT(DISTINCT sm.story_id) as story_count,
           AVG(EXTRACT(EPOCH FROM (COALESCE(sm.exited_at, CURRENT_TIMESTAMP) - sm.entered_at))) as avg_time_seconds
         FROM sprint_metrics sm
         WHERE sm.sprint_id = $1
         GROUP BY sm.status`,
                [sprintId]
            );

            const metrics = completionResult.rows[0];

            res.json({
                completedStories: parseInt(metrics.completed_stories),
                totalStories: parseInt(metrics.total_stories),
                completedPoints: parseInt(metrics.completed_points),
                totalPoints: parseInt(metrics.total_points),
                completionRate: metrics.total_stories > 0
                    ? (parseInt(metrics.completed_stories) / parseInt(metrics.total_stories) * 100).toFixed(1)
                    : 0,
                timeInStatus: timeMetrics.rows.map(row => ({
                    status: row.status,
                    storyCount: parseInt(row.story_count),
                    avgTimeHours: row.avg_time_seconds ? (parseFloat(row.avg_time_seconds) / 3600).toFixed(1) : 0
                }))
            });
        } catch (error) {
            console.error('Error fetching sprint metrics:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
