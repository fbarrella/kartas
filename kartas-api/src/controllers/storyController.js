import { query } from '../config/database.js';
import { generateNextStoryId } from '../utils/ticketPrefix.js';

export const storyController = {
    // Create a new story
    async createStory(req, res) {
        try {
            const {
                projectId,
                epicId,
                type,
                title,
                description,
                storyPoints,
                assigneeId
            } = req.body;

            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Generate story ID
            const storyId = await generateNextStoryId(projectId);

            // Create story
            const result = await query(
                `INSERT INTO stories (
          story_id, project_id, epic_id, type, title, description, 
          story_points, assignee_id, creator_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'backlog')
        RETURNING *`,
                [storyId, projectId, epicId, type, title, description, storyPoints, assigneeId, userId]
            );

            const story = result.rows[0];

            res.status(201).json({
                id: story.id,
                storyId: story.story_id,
                projectId: story.project_id,
                epicId: story.epic_id,
                type: story.type,
                status: story.status,
                title: story.title,
                description: story.description,
                storyPoints: story.story_points,
                assigneeId: story.assignee_id,
                creatorId: story.creator_id,
                createdAt: story.created_at,
                updatedAt: story.updated_at
            });
        } catch (error) {
            console.error('Error creating story:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get stories for a project
    async getProjectStories(req, res) {
        try {
            const { projectId } = req.params;
            const { status, epicId, assigneeId, type } = req.query;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Build query with filters
            let queryText = `
        SELECT s.*,
               u1.first_name || ' ' || u1.last_name as assignee_name,
               u2.first_name || ' ' || u2.last_name as creator_name,
               e.title as epic_title
        FROM stories s
        LEFT JOIN users u1 ON s.assignee_id = u1.id
        LEFT JOIN users u2 ON s.creator_id = u2.id
        LEFT JOIN epics e ON s.epic_id = e.id
        WHERE s.project_id = $1
      `;

            const params = [projectId];
            let paramIndex = 2;

            if (status) {
                queryText += ` AND s.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (epicId) {
                queryText += ` AND s.epic_id = $${paramIndex}`;
                params.push(epicId);
                paramIndex++;
            }

            if (assigneeId) {
                queryText += ` AND s.assignee_id = $${paramIndex}`;
                params.push(assigneeId);
                paramIndex++;
            }

            if (type) {
                queryText += ` AND s.type = $${paramIndex}`;
                params.push(type);
                paramIndex++;
            }

            queryText += ' ORDER BY s.created_at DESC';

            const result = await query(queryText, params);

            // Get tags for each story
            const storyIds = result.rows.map(s => s.id);
            let tagsMap = {};
            let sprintsMap = {};

            if (storyIds.length > 0) {
                const tagsResult = await query(
                    `SELECT st.story_id, t.id, t.name, t.color
           FROM story_tags st
           JOIN tags t ON st.tag_id = t.id
           WHERE st.story_id = ANY($1)`,
                    [storyIds]
                );

                tagsResult.rows.forEach(tag => {
                    if (!tagsMap[tag.story_id]) {
                        tagsMap[tag.story_id] = [];
                    }
                    tagsMap[tag.story_id].push({
                        id: tag.id,
                        name: tag.name,
                        color: tag.color
                    });
                });

                // Get sprints for each story
                const sprintsResult = await query(
                    `SELECT ss.story_id, s.id, s.name, s.status, s.start_date, s.end_date
           FROM sprint_stories ss
           JOIN sprints s ON ss.sprint_id = s.id
           WHERE ss.story_id = ANY($1)
           ORDER BY s.start_date DESC`,
                    [storyIds]
                );

                sprintsResult.rows.forEach(sprint => {
                    if (!sprintsMap[sprint.story_id]) {
                        sprintsMap[sprint.story_id] = [];
                    }
                    sprintsMap[sprint.story_id].push({
                        id: sprint.id,
                        name: sprint.name,
                        status: sprint.status,
                        startDate: sprint.start_date,
                        endDate: sprint.end_date
                    });
                });
            }

            res.json(result.rows.map(story => ({
                id: story.id,
                storyId: story.story_id,
                projectId: story.project_id,
                epicId: story.epic_id,
                epicTitle: story.epic_title,
                type: story.type,
                status: story.status,
                title: story.title,
                description: story.description,
                storyPoints: story.story_points,
                assigneeId: story.assignee_id,
                assigneeName: story.assignee_name,
                creatorId: story.creator_id,
                creatorName: story.creator_name,
                tags: tagsMap[story.id] || [],
                sprints: sprintsMap[story.id] || [],
                createdAt: story.created_at,
                updatedAt: story.updated_at
            })));
        } catch (error) {
            console.error('Error fetching stories:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single story with full details
    async getStory(req, res) {
        try {
            const { storyId } = req.params;
            const userId = req.user.userId;

            // Get story
            const result = await query(
                `SELECT s.*,
                u1.first_name || ' ' || u1.last_name as assignee_name,
                u2.first_name || ' ' || u2.last_name as creator_name,
                e.title as epic_title,
                p.name as project_name
         FROM stories s
         LEFT JOIN users u1 ON s.assignee_id = u1.id
         LEFT JOIN users u2 ON s.creator_id = u2.id
         LEFT JOIN epics e ON s.epic_id = e.id
         LEFT JOIN projects p ON s.project_id = p.id
         WHERE s.id = $1`,
                [storyId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Story not found' });
            }

            const story = result.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [story.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get tags
            const tagsResult = await query(
                `SELECT t.id, t.name, t.color
         FROM story_tags st
         JOIN tags t ON st.tag_id = t.id
         WHERE st.story_id = $1`,
                [storyId]
            );

            // Get sub-tasks
            const subTasksResult = await query(
                `SELECT st.*,
                u.first_name || ' ' || u.last_name as assignee_name
         FROM sub_tasks st
         LEFT JOIN users u ON st.assignee_id = u.id
         WHERE st.story_id = $1
         ORDER BY st.created_at`,
                [storyId]
            );

            // Get comments
            const commentsResult = await query(
                `SELECT c.*,
                u.first_name || ' ' || u.last_name as user_name
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.story_id = $1
         ORDER BY c.created_at DESC`,
                [storyId]
            );

            // Get change history
            const historyResult = await query(
                `SELECT ch.*,
                u.first_name || ' ' || u.last_name as user_name
         FROM change_history ch
         LEFT JOIN users u ON ch.user_id = u.id
         WHERE ch.story_id = $1
         ORDER BY ch.changed_at DESC`,
                [storyId]
            );

            // Get sprints
            const sprintsResult = await query(
                `SELECT s.id, s.name, s.status, s.start_date, s.end_date
         FROM sprint_stories ss
         JOIN sprints s ON ss.sprint_id = s.id
         WHERE ss.story_id = $1
         ORDER BY s.start_date DESC`,
                [storyId]
            );

            res.json({
                id: story.id,
                storyId: story.story_id,
                projectId: story.project_id,
                projectName: story.project_name,
                epicId: story.epic_id,
                epicTitle: story.epic_title,
                type: story.type,
                status: story.status,
                title: story.title,
                description: story.description,
                storyPoints: story.story_points,
                assigneeId: story.assignee_id,
                assigneeName: story.assignee_name,
                creatorId: story.creator_id,
                creatorName: story.creator_name,
                tags: tagsResult.rows,
                sprints: sprintsResult.rows.map(s => ({
                    id: s.id,
                    name: s.name,
                    status: s.status,
                    startDate: s.start_date,
                    endDate: s.end_date
                })),
                subTasks: subTasksResult.rows.map(st => ({
                    id: st.id,
                    type: st.type,
                    title: st.title,
                    description: st.description,
                    status: st.status,
                    assigneeId: st.assignee_id,
                    assigneeName: st.assignee_name,
                    createdAt: st.created_at,
                    updatedAt: st.updated_at
                })),
                comments: commentsResult.rows.map(c => ({
                    id: c.id,
                    userId: c.user_id,
                    userName: c.user_name,
                    content: c.content,
                    createdAt: c.created_at,
                    updatedAt: c.updated_at
                })),
                history: historyResult.rows.map(h => ({
                    id: h.id,
                    userId: h.user_id,
                    userName: h.user_name,
                    fieldChanged: h.field_changed,
                    oldValue: h.old_value,
                    newValue: h.new_value,
                    changedAt: h.changed_at
                })),
                createdAt: story.created_at,
                updatedAt: story.updated_at
            });
        } catch (error) {
            console.error('Error fetching story:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update story
    async updateStory(req, res) {
        try {
            const { storyId } = req.params;
            const {
                epicId,
                type,
                status,
                title,
                description,
                storyPoints,
                assigneeId
            } = req.body;
            const userId = req.user.userId;

            // Get current story
            const currentStory = await query(
                'SELECT * FROM stories WHERE id = $1',
                [storyId]
            );

            if (currentStory.rows.length === 0) {
                return res.status(404).json({ error: 'Story not found' });
            }

            const story = currentStory.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [story.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Track changes for history
            const changes = [];

            if (epicId !== undefined && epicId !== story.epic_id) {
                changes.push({ field: 'epic_id', oldValue: story.epic_id, newValue: epicId });
            }
            if (type !== undefined && type !== story.type) {
                changes.push({ field: 'type', oldValue: story.type, newValue: type });
            }
            if (status !== undefined && status !== story.status) {
                changes.push({ field: 'status', oldValue: story.status, newValue: status });
            }
            if (title !== undefined && title !== story.title) {
                changes.push({ field: 'title', oldValue: story.title, newValue: title });
            }
            if (description !== undefined && description !== story.description) {
                changes.push({ field: 'description', oldValue: story.description, newValue: description });
            }
            if (storyPoints !== undefined && storyPoints !== story.story_points) {
                changes.push({ field: 'story_points', oldValue: story.story_points, newValue: storyPoints });
            }
            if (assigneeId !== undefined && assigneeId !== story.assignee_id) {
                changes.push({ field: 'assignee_id', oldValue: story.assignee_id, newValue: assigneeId });
            }

            // Update story
            const result = await query(
                `UPDATE stories
         SET epic_id = COALESCE($1, epic_id),
             type = COALESCE($2, type),
             status = COALESCE($3, status),
             title = COALESCE($4, title),
             description = COALESCE($5, description),
             story_points = COALESCE($6, story_points),
             assignee_id = COALESCE($7, assignee_id)
         WHERE id = $8
         RETURNING *`,
                [epicId, type, status, title, description, storyPoints, assigneeId, storyId]
            );

            // Record changes in history
            for (const change of changes) {
                await query(
                    `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
                    [storyId, userId, change.field, String(change.oldValue), String(change.newValue)]
                );
            }

            const updatedStory = result.rows[0];

            res.json({
                id: updatedStory.id,
                storyId: updatedStory.story_id,
                projectId: updatedStory.project_id,
                epicId: updatedStory.epic_id,
                type: updatedStory.type,
                status: updatedStory.status,
                title: updatedStory.title,
                description: updatedStory.description,
                storyPoints: updatedStory.story_points,
                assigneeId: updatedStory.assignee_id,
                creatorId: updatedStory.creator_id,
                createdAt: updatedStory.created_at,
                updatedAt: updatedStory.updated_at
            });
        } catch (error) {
            console.error('Error updating story:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete story
    async deleteStory(req, res) {
        try {
            const { storyId } = req.params;
            const userId = req.user.userId;

            // Get story
            const storyResult = await query(
                'SELECT project_id FROM stories WHERE id = $1',
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

            await query('DELETE FROM stories WHERE id = $1', [storyId]);

            res.json({ message: 'Story deleted successfully' });
        } catch (error) {
            console.error('Error deleting story:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Add comment to story
    async addComment(req, res) {
        try {
            const { storyId } = req.params;
            const { content } = req.body;
            const userId = req.user.userId;

            // Verify story exists and user has access
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

            // Add comment
            const result = await query(
                `INSERT INTO comments (story_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [storyId, userId, content]
            );

            const comment = result.rows[0];

            res.status(201).json({
                id: comment.id,
                storyId: comment.story_id,
                userId: comment.user_id,
                content: comment.content,
                createdAt: comment.created_at
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
