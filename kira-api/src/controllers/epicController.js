import { query } from '../config/database.js';

export const epicController = {
    // Get all epics for a project
    async getEpics(req, res) {
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

            // Get epics with story count
            const result = await query(
                `SELECT e.*, 
                        u.first_name || ' ' || u.last_name as creator_name,
                        COUNT(s.id) as story_count
                 FROM epics e
                 LEFT JOIN users u ON e.created_by = u.id
                 LEFT JOIN stories s ON e.id = s.epic_id
                 WHERE e.project_id = $1
                 GROUP BY e.id, u.first_name, u.last_name
                 ORDER BY e.created_at DESC`,
                [projectId]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching epics:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single epic
    async getEpic(req, res) {
        try {
            const { epicId } = req.params;
            const userId = req.user.userId;

            const result = await query(
                `SELECT e.*, 
                        u.first_name || ' ' || u.last_name as creator_name,
                        COUNT(s.id) as story_count
                 FROM epics e
                 LEFT JOIN users u ON e.created_by = u.id
                 LEFT JOIN stories s ON e.id = s.epic_id
                 WHERE e.id = $1
                 GROUP BY e.id, u.first_name, u.last_name`,
                [epicId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Epic not found' });
            }

            const epic = result.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [epic.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(epic);
        } catch (error) {
            console.error('Error fetching epic:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Create epic
    async createEpic(req, res) {
        try {
            const { projectId } = req.params;
            const { title, description, startDate, endDate, color } = req.body;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Validate required fields
            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }

            // Generate epic_id (EPIC-0001, EPIC-0002, etc.)
            const countResult = await query(
                'SELECT COUNT(*) as count FROM epics WHERE project_id = $1',
                [projectId]
            );
            const epicNumber = parseInt(countResult.rows[0].count) + 1;
            const epicId = `EPIC-${epicNumber.toString().padStart(4, '0')}`;

            const result = await query(
                `INSERT INTO epics (epic_id, project_id, title, description, start_date, end_date, color, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [epicId, projectId, title, description, startDate, endDate, color || '#0052CC', userId]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating epic:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update epic
    async updateEpic(req, res) {
        try {
            const { epicId } = req.params;
            const { title, description, startDate, endDate, status, color } = req.body;
            const userId = req.user.userId;

            // Get epic to verify access
            const epicResult = await query('SELECT project_id FROM epics WHERE id = $1', [epicId]);

            if (epicResult.rows.length === 0) {
                return res.status(404).json({ error: 'Epic not found' });
            }

            const epic = epicResult.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [epic.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await query(
                `UPDATE epics 
                 SET title = COALESCE($1, title),
                     description = COALESCE($2, description),
                     start_date = COALESCE($3, start_date),
                     end_date = COALESCE($4, end_date),
                     status = COALESCE($5, status),
                     color = COALESCE($6, color)
                 WHERE id = $7
                 RETURNING *`,
                [title, description, startDate, endDate, status, color, epicId]
            );

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating epic:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete epic
    async deleteEpic(req, res) {
        try {
            const { epicId } = req.params;
            const userId = req.user.userId;

            // Get epic to verify access
            const epicResult = await query('SELECT project_id FROM epics WHERE id = $1', [epicId]);

            if (epicResult.rows.length === 0) {
                return res.status(404).json({ error: 'Epic not found' });
            }

            const epic = epicResult.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [epic.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Check if epic has stories
            const storyCheck = await query('SELECT COUNT(*) as count FROM stories WHERE epic_id = $1', [epicId]);

            if (parseInt(storyCheck.rows[0].count) > 0) {
                return res.status(400).json({
                    error: 'Cannot delete epic with associated stories. Please remove or reassign stories first.'
                });
            }

            await query('DELETE FROM epics WHERE id = $1', [epicId]);

            res.json({ message: 'Epic deleted successfully' });
        } catch (error) {
            console.error('Error deleting epic:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
