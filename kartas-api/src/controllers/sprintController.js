import { query } from '../config/database.js';

export const sprintController = {
    // Create a new sprint
    async createSprint(req, res) {
        try {
            const { projectId, name, objective, startDate, endDate } = req.body;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Validate dates
            if (new Date(endDate) <= new Date(startDate)) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }

            // Create sprint
            const result = await query(
                `INSERT INTO sprints (project_id, name, objective, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, 'planned')
         RETURNING *`,
                [projectId, name, objective, startDate, endDate]
            );

            const sprint = result.rows[0];

            await query(
                `INSERT INTO change_history (user_id, field_changed, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, 'creation', $2, 'sprint', $3, $4, 'created')`,
                [userId, name, sprint.id, projectId]
            );

            res.status(201).json({
                id: sprint.id,
                projectId: sprint.project_id,
                name: sprint.name,
                objective: sprint.objective,
                startDate: sprint.start_date,
                endDate: sprint.end_date,
                status: sprint.status,
                createdAt: sprint.created_at
            });
        } catch (error) {
            console.error('Error creating sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get all sprints for a project
    async getProjectSprints(req, res) {
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

            // Get sprints with story counts
            const result = await query(
                `SELECT s.*,
                COUNT(DISTINCT ss.story_id) as story_count,
                COALESCE(SUM(st.story_points), 0) as total_points
         FROM sprints s
         LEFT JOIN sprint_stories ss ON s.id = ss.sprint_id
         LEFT JOIN stories st ON ss.story_id = st.id
         WHERE s.project_id = $1
         GROUP BY s.id
         ORDER BY 
           CASE s.status
             WHEN 'active' THEN 1
             WHEN 'planned' THEN 2
             WHEN 'completed' THEN 3
           END,
           s.start_date DESC`,
                [projectId]
            );

            res.json(result.rows.map(sprint => ({
                id: sprint.id,
                projectId: sprint.project_id,
                name: sprint.name,
                objective: sprint.objective,
                startDate: sprint.start_date,
                endDate: sprint.end_date,
                status: sprint.status,
                storyCount: parseInt(sprint.story_count),
                totalPoints: parseInt(sprint.total_points),
                createdAt: sprint.created_at,
                updatedAt: sprint.updated_at
            })));
        } catch (error) {
            console.error('Error fetching sprints:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single sprint with stories
    async getSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
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

            // Get sprint stories
            const storiesResult = await query(
                `SELECT s.*,
                u1.first_name || ' ' || u1.last_name as assignee_name,
                u2.first_name || ' ' || u2.last_name as creator_name
         FROM sprint_stories ss
         JOIN stories s ON ss.story_id = s.id
         LEFT JOIN users u1 ON s.assignee_id = u1.id
         LEFT JOIN users u2 ON s.creator_id = u2.id
         WHERE ss.sprint_id = $1
         ORDER BY s.created_at`,
                [sprintId]
            );

            res.json({
                id: sprint.id,
                projectId: sprint.project_id,
                name: sprint.name,
                objective: sprint.objective,
                startDate: sprint.start_date,
                endDate: sprint.end_date,
                status: sprint.status,
                stories: storiesResult.rows.map(story => ({
                    id: story.id,
                    storyId: story.story_id,
                    type: story.type,
                    status: story.status,
                    title: story.title,
                    storyPoints: story.story_points,
                    assigneeId: story.assignee_id,
                    assigneeName: story.assignee_name,
                    creatorName: story.creator_name
                })),
                createdAt: sprint.created_at,
                updatedAt: sprint.updated_at
            });
        } catch (error) {
            console.error('Error fetching sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get active sprint for a project
    async getActiveSprint(req, res) {
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
            const result = await query(
                `SELECT s.*,
                COUNT(DISTINCT ss.story_id) as story_count,
                COALESCE(SUM(st.story_points), 0) as total_points
         FROM sprints s
         LEFT JOIN sprint_stories ss ON s.id = ss.sprint_id
         LEFT JOIN stories st ON ss.story_id = st.id
         WHERE s.project_id = $1 AND s.status = 'active'
         GROUP BY s.id`,
                [projectId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No active sprint found' });
            }

            const sprint = result.rows[0];

            res.json({
                id: sprint.id,
                projectId: sprint.project_id,
                name: sprint.name,
                objective: sprint.objective,
                startDate: sprint.start_date,
                endDate: sprint.end_date,
                status: sprint.status,
                storyCount: parseInt(sprint.story_count),
                totalPoints: parseInt(sprint.total_points),
                createdAt: sprint.created_at,
                updatedAt: sprint.updated_at
            });
        } catch (error) {
            console.error('Error fetching active sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update sprint
    async updateSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const { name, objective, startDate, endDate } = req.body;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Cannot modify completed sprints
            if (sprint.status === 'completed') {
                return res.status(400).json({ error: 'Cannot modify completed sprint' });
            }

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Validate dates if provided
            const newStartDate = startDate || sprint.start_date;
            const newEndDate = endDate || sprint.end_date;

            if (new Date(newEndDate) <= new Date(newStartDate)) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }

            // Update sprint
            const result = await query(
                `UPDATE sprints
         SET name = COALESCE($1, name),
             objective = COALESCE($2, objective),
             start_date = COALESCE($3, start_date),
             end_date = COALESCE($4, end_date)
         WHERE id = $5
         RETURNING *`,
                [name, objective, startDate, endDate, sprintId]
            );

            const updatedSprint = result.rows[0];

            await query(
                `INSERT INTO change_history (user_id, field_changed, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, 'sprint', $2, 'sprint', $3, $4, 'edited')`,
                [userId, updatedSprint.name, sprintId, sprint.project_id]
            );

            res.json({
                id: updatedSprint.id,
                projectId: updatedSprint.project_id,
                name: updatedSprint.name,
                objective: updatedSprint.objective,
                startDate: updatedSprint.start_date,
                endDate: updatedSprint.end_date,
                status: updatedSprint.status,
                createdAt: updatedSprint.created_at,
                updatedAt: updatedSprint.updated_at
            });
        } catch (error) {
            console.error('Error updating sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Start sprint
    async startSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
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

            // Check if sprint is already active or completed
            if (sprint.status === 'active') {
                return res.status(400).json({ error: 'Sprint is already active' });
            }

            if (sprint.status === 'completed') {
                return res.status(400).json({ error: 'Cannot start completed sprint' });
            }

            // Check if sprint has stories
            const storyCount = await query(
                'SELECT COUNT(*) as count FROM sprint_stories WHERE sprint_id = $1',
                [sprintId]
            );

            if (parseInt(storyCount.rows[0].count) === 0) {
                return res.status(400).json({ error: 'Cannot start sprint without stories' });
            }

            // Check if another sprint is active
            const activeSprintCheck = await query(
                'SELECT id FROM sprints WHERE project_id = $1 AND status = $2 AND id != $3',
                [sprint.project_id, 'active', sprintId]
            );

            if (activeSprintCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Another sprint is already active. Please end it first.' });
            }

            // Start sprint
            const result = await query(
                `UPDATE sprints SET status = 'active' WHERE id = $1 RETURNING *`,
                [sprintId]
            );

            const updatedSprint = result.rows[0];

            await query(
                `INSERT INTO change_history (user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, 'status', $2, 'active', 'sprint', $3, $4, 'edited')`,
                [userId, sprint.status, sprintId, sprint.project_id]
            );

            res.json({
                id: updatedSprint.id,
                projectId: updatedSprint.project_id,
                name: updatedSprint.name,
                objective: updatedSprint.objective,
                startDate: updatedSprint.start_date,
                endDate: updatedSprint.end_date,
                status: updatedSprint.status,
                createdAt: updatedSprint.created_at,
                updatedAt: updatedSprint.updated_at
            });
        } catch (error) {
            console.error('Error starting sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // End sprint
    async endSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
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

            // Check if sprint is active
            if (sprint.status !== 'active') {
                return res.status(400).json({ error: 'Only active sprints can be ended' });
            }

            // End sprint
            const result = await query(
                `UPDATE sprints SET status = 'completed' WHERE id = $1 RETURNING *`,
                [sprintId]
            );

            // Snapshot each story's current status so the report is immutable.
            // This is the source-of-truth for completed sprint reports.
            await query(
                `UPDATE sprint_stories
                 SET snapshot_status = s.status
                 FROM stories s
                 WHERE sprint_stories.sprint_id = $1
                   AND sprint_stories.story_id = s.id`,
                [sprintId]
            );

            const updatedSprint = result.rows[0];

            await query(
                `INSERT INTO change_history (user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, 'status', 'active', 'completed', 'sprint', $2, $3, 'edited')`,
                [userId, sprintId, sprint.project_id]
            );

            res.json({
                id: updatedSprint.id,
                projectId: updatedSprint.project_id,
                name: updatedSprint.name,
                objective: updatedSprint.objective,
                startDate: updatedSprint.start_date,
                endDate: updatedSprint.end_date,
                status: updatedSprint.status,
                createdAt: updatedSprint.created_at,
                updatedAt: updatedSprint.updated_at
            });
        } catch (error) {
            console.error('Error ending sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Add stories to sprint
    async addStoriesToSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const { storyIds } = req.body;
            const userId = req.user.userId;

            if (!Array.isArray(storyIds) || storyIds.length === 0) {
                return res.status(400).json({ error: 'storyIds must be a non-empty array' });
            }

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Cannot modify completed sprints
            if (sprint.status === 'completed') {
                return res.status(400).json({ error: 'Cannot modify completed sprint' });
            }

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // SPR-01: reject any story already in a DIFFERENT active/planned
            // sprint. endSprint never deletes sprint_stories rows (only stamps
            // snapshot_status), so row existence alone isn't enough — must join
            // sprints and filter status.
            const conflictCheck = await query(
                `SELECT ss.story_id, s.name as conflicting_sprint_name
                 FROM sprint_stories ss
                 JOIN sprints s ON ss.sprint_id = s.id
                 WHERE ss.story_id = ANY($1)
                   AND ss.sprint_id != $2
                   AND s.status IN ('active', 'planned')`,
                [storyIds, sprintId]
            );

            if (conflictCheck.rows.length > 0) {
                const conflict = conflictCheck.rows[0];
                return res.status(400).json({
                    error: `Story ${conflict.story_id} is already in sprint "${conflict.conflicting_sprint_name}"`
                });
            }

            // Add stories to sprint (using ON CONFLICT to handle duplicates)
            const values = storyIds.map((storyId, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            await query(
                `INSERT INTO sprint_stories (sprint_id, story_id)
         VALUES ${values}
         ON CONFLICT (sprint_id, story_id) DO NOTHING`,
                [sprintId, ...storyIds]
            );

            res.json({ message: 'Stories added to sprint successfully', count: storyIds.length });
        } catch (error) {
            console.error('Error adding stories to sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Remove story from sprint
    async removeStoryFromSprint(req, res) {
        try {
            const { sprintId, storyId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Cannot modify completed sprints
            if (sprint.status === 'completed') {
                return res.status(400).json({ error: 'Cannot modify completed sprint' });
            }

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Remove story from sprint
            const result = await query(
                'DELETE FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2 RETURNING story_id',
                [sprintId, storyId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Story not found in sprint' });
            }

            res.json({ message: 'Story removed from sprint successfully' });
        } catch (error) {
            console.error('Error removing story from sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete sprint
    async deleteSprint(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint
            const sprintResult = await query(
                'SELECT * FROM sprints WHERE id = $1',
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Cannot delete active or completed sprints
            if (sprint.status !== 'planned') {
                return res.status(400).json({ error: 'Can only delete planned sprints' });
            }

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Delete sprint
            await query('DELETE FROM sprints WHERE id = $1', [sprintId]);

            res.json({ message: 'Sprint deleted successfully' });
        } catch (error) {
            console.error('Error deleting sprint:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
