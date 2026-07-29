import { query } from '../config/database.js';

export const subTaskController = {
    // Create a sub-task/sub-test on a story
    async createSubTask(req, res) {
        try {
            const { storyId } = req.params;
            const { type, title, description, storyPoints, assigneeId, status } = req.body;
            const userId = req.user.userId;

            const storyResult = await query(
                'SELECT project_id FROM stories WHERE id = $1',
                [storyId]
            );

            if (storyResult.rows.length === 0) {
                return res.status(404).json({ error: 'Story not found' });
            }

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [storyResult.rows[0].project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await query(
                `INSERT INTO sub_tasks (story_id, type, title, description, status, story_points, assignee_id)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'backlog'), $6, $7)
         RETURNING *`,
                [storyId, type, title, description, status, storyPoints, assigneeId]
            );

            const st = result.rows[0];

            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, $2, 'creation', $3, 'sub_task', $4, $5, 'created')`,
                [storyId, userId, title, st.id, storyResult.rows[0].project_id]
            );

            res.status(201).json({
                id: st.id,
                storyId: st.story_id,
                type: st.type,
                title: st.title,
                description: st.description,
                status: st.status,
                storyPoints: st.story_points,
                assigneeId: st.assignee_id,
                createdAt: st.created_at,
                updatedAt: st.updated_at
            });
        } catch (error) {
            console.error('Error creating sub-task:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update a sub-task/sub-test
    async updateSubTask(req, res) {
        try {
            const { id } = req.params;
            const { type, title, description, storyPoints, assigneeId, status } = req.body;
            const userId = req.user.userId;

            const subTaskResult = await query(
                `SELECT st.*, s.project_id
         FROM sub_tasks st
         JOIN stories s ON st.story_id = s.id
         WHERE st.id = $1`,
                [id]
            );

            if (subTaskResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sub-task not found' });
            }

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [subTaskResult.rows[0].project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // assignee_id is nullable (unassigning is valid), so COALESCE can't be used for it —
            // COALESCE can't distinguish "field omitted" from "field explicitly set to null".
            const assigneeIdToSet = assigneeId !== undefined ? assigneeId : subTaskResult.rows[0].assignee_id;

            const result = await query(
                `UPDATE sub_tasks
         SET type = COALESCE($1, type),
             title = COALESCE($2, title),
             description = COALESCE($3, description),
             status = COALESCE($4, status),
             story_points = COALESCE($5, story_points),
             assignee_id = $6
         WHERE id = $7
         RETURNING *`,
                [type, title, description, status, storyPoints, assigneeIdToSet, id]
            );

            const st = result.rows[0];

            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, $2, 'sub_task', $3, 'sub_task', $4, $5, 'edited')`,
                [st.story_id, userId, st.title, id, subTaskResult.rows[0].project_id]
            );

            res.json({
                id: st.id,
                storyId: st.story_id,
                type: st.type,
                title: st.title,
                description: st.description,
                status: st.status,
                storyPoints: st.story_points,
                assigneeId: st.assignee_id,
                createdAt: st.created_at,
                updatedAt: st.updated_at
            });
        } catch (error) {
            console.error('Error updating sub-task:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete a sub-task/sub-test
    async deleteSubTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const subTaskResult = await query(
                `SELECT s.project_id
         FROM sub_tasks st
         JOIN stories s ON st.story_id = s.id
         WHERE st.id = $1`,
                [id]
            );

            if (subTaskResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sub-task not found' });
            }

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [subTaskResult.rows[0].project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            await query('DELETE FROM sub_tasks WHERE id = $1', [id]);

            res.json({ message: 'Sub-task deleted successfully' });
        } catch (error) {
            console.error('Error deleting sub-task:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
