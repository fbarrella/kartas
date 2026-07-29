import { query } from '../config/database.js';
import { generateNextStoryId } from '../utils/ticketPrefix.js';
import { resolveMentionedUsers, resolveMentionedTickets } from '../utils/mentions.js';

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

            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, $2, 'creation', NULL, $3, 'story', $1, $4, 'created')`,
                [story.id, userId, title, projectId]
            );

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
               u1.role as assignee_role,
               u1.email as assignee_email,
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
                assigneeRole: story.assignee_role,
                assigneeEmail: story.assignee_email,
                creatorId: story.creator_id,
                creatorName: story.creator_name,
                isBlocked: story.is_blocked,
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
                u.first_name || ' ' || u.last_name as assignee_name,
                u.role as assignee_role,
                u.email as assignee_email
         FROM sub_tasks st
         LEFT JOIN users u ON st.assignee_id = u.id
         WHERE st.story_id = $1
         ORDER BY st.created_at`,
                [storyId]
            );

            // Get comments
            const commentsResult = await query(
                `SELECT c.*,
                u.first_name || ' ' || u.last_name as user_name,
                u.role as user_role,
                u.email as user_email
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.story_id = $1
         ORDER BY c.created_at DESC`,
                [storyId]
            );

            // Fetched once per request (not once per comment) so mention markup
            // can be rendered client-side without extra round-trips — each comment
            // below is checked against these same two lists.
            const mentionCandidateUsers = await query(
                `SELECT u.id, u.first_name, u.last_name
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1`,
                [story.project_id]
            );
            const mentionCandidateTickets = await query(
                `SELECT id, story_id as code, 'story' as type FROM stories WHERE project_id = $1
         UNION ALL
         SELECT id, epic_id as code, 'epic' as type FROM epics WHERE project_id = $1`,
                [story.project_id]
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
                isBlocked: story.is_blocked,
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
                    storyPoints: st.story_points,
                    assigneeId: st.assignee_id,
                    assigneeName: st.assignee_name,
                    assigneeRole: st.assignee_role,
                    assigneeEmail: st.assignee_email,
                    createdAt: st.created_at,
                    updatedAt: st.updated_at
                })),
                comments: commentsResult.rows.map(c => ({
                    id: c.id,
                    userId: c.user_id,
                    userName: c.user_name,
                    userRole: c.user_role,
                    userEmail: c.user_email,
                    content: c.content,
                    createdAt: c.created_at,
                    updatedAt: c.updated_at,
                    mentions: {
                        users: mentionCandidateUsers.rows
                            .filter(u => c.content.includes(`@${u.first_name} ${u.last_name}`))
                            .map(u => ({ id: u.id, firstName: u.first_name, lastName: u.last_name })),
                        tickets: mentionCandidateTickets.rows.filter(t => c.content.includes(t.code))
                    }
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

    // Paginated change history for a single story, including its sub-tasks'
    // changes (sub-task edits already carry the parent story_id). Comment rows
    // are excluded here since they're shown in the story's Comments section
    // instead — field_changed is filtered rather than action_type since it has
    // always been set as a literal, even on rows from before entity_type/
    // action_type existed (migration 009).
    async getStoryHistory(req, res) {
        try {
            const { storyId } = req.params;
            const userId = req.user.userId;
            const limit = Math.min(parseInt(req.query.limit) || 10, 100);
            const offset = parseInt(req.query.offset) || 0;

            const storyResult = await query('SELECT project_id FROM stories WHERE id = $1', [storyId]);
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
                `SELECT ch.id, ch.field_changed, ch.old_value, ch.new_value, ch.changed_at, ch.user_id,
                        u.first_name || ' ' || u.last_name as user_name,
                        COALESCE(ch.entity_type, 'story') as entity_type,
                        COALESCE(ch.action_type, CASE WHEN ch.field_changed = 'status' THEN 'moved' ELSE 'edited' END) as action_type
                 FROM change_history ch
                 LEFT JOIN users u ON u.id = ch.user_id
                 WHERE ch.story_id = $1 AND ch.field_changed != 'comment'
                 ORDER BY ch.changed_at DESC
                 LIMIT $2 OFFSET $3`,
                [storyId, limit + 1, offset]
            );

            const hasMore = result.rows.length > limit;
            const rows = result.rows.slice(0, limit);

            res.json({
                items: rows.map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    userName: row.user_name,
                    actionType: row.action_type,
                    entityType: row.entity_type,
                    fieldChanged: row.field_changed,
                    oldValue: row.old_value,
                    newValue: row.new_value,
                    changedAt: row.changed_at
                })),
                hasMore
            });
        } catch (error) {
            console.error('Error fetching story history:', error);
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
                assigneeId,
                isBlocked
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
            if (isBlocked !== undefined && isBlocked !== story.is_blocked) {
                changes.push({ field: 'is_blocked', oldValue: story.is_blocked, newValue: isBlocked });
            }

            // assignee_id is nullable (unassigning is valid), so COALESCE can't be used for it —
            // COALESCE can't distinguish "field omitted" from "field explicitly set to null".
            const assigneeIdToSet = assigneeId !== undefined ? assigneeId : story.assignee_id;

            // Update story
            const result = await query(
                `UPDATE stories
         SET epic_id = COALESCE($1, epic_id),
             type = COALESCE($2, type),
             status = COALESCE($3, status),
             title = COALESCE($4, title),
             description = COALESCE($5, description),
             story_points = COALESCE($6, story_points),
             assignee_id = $7,
             is_blocked = COALESCE($8, is_blocked)
         WHERE id = $9
         RETURNING *`,
                [epicId, type, status, title, description, storyPoints, assigneeIdToSet, isBlocked, storyId]
            );

            // Record changes in history
            for (const change of changes) {
                await query(
                    `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
           VALUES ($1, $2, $3, $4, $5, 'story', $1, $6, $7)`,
                    [
                        storyId, userId, change.field, String(change.oldValue), String(change.newValue),
                        story.project_id, change.field === 'status' ? 'moved' : 'edited'
                    ]
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
                isBlocked: updatedStory.is_blocked,
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

            await query(
                `INSERT INTO change_history (story_id, user_id, field_changed, old_value, new_value, entity_type, entity_id, project_id, action_type)
                 VALUES ($1, $2, 'comment', NULL, $3, 'story', $1, $4, 'commented')`,
                [storyId, userId, content.slice(0, 200), storyResult.rows[0].project_id]
            );

            const mentionedUsers = await resolveMentionedUsers(content, storyResult.rows[0].project_id);
            for (const mentioned of mentionedUsers) {
                if (mentioned.id === userId) continue; // no self-notifications
                await query(
                    'INSERT INTO comment_mentions (comment_id, mentioned_user_id) VALUES ($1, $2)',
                    [comment.id, mentioned.id]
                );
            }

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
    },

    // Update own comment
    async updateComment(req, res) {
        try {
            const { storyId, commentId } = req.params;
            const { content } = req.body;
            const userId = req.user.userId;

            const commentResult = await query(
                'SELECT * FROM comments WHERE id = $1 AND story_id = $2',
                [commentId, storyId]
            );

            if (commentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            if (commentResult.rows[0].user_id !== userId) {
                return res.status(403).json({ error: 'You can only edit your own comments' });
            }

            const storyResult = await query('SELECT project_id FROM stories WHERE id = $1', [storyId]);

            const updated = await query(
                `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING *`,
                [content, commentId]
            );

            // Re-resolve mentions from scratch rather than diffing — reflects
            // who is *currently* mentioned after the edit, so a removed mention
            // stops surfacing in that user's Latest Activities feed (FY-04).
            await query('DELETE FROM comment_mentions WHERE comment_id = $1', [commentId]);
            const mentionedUsers = await resolveMentionedUsers(content, storyResult.rows[0].project_id);
            for (const mentioned of mentionedUsers) {
                if (mentioned.id === userId) continue;
                await query(
                    'INSERT INTO comment_mentions (comment_id, mentioned_user_id) VALUES ($1, $2)',
                    [commentId, mentioned.id]
                );
            }

            res.json({
                id: updated.rows[0].id,
                content: updated.rows[0].content,
                updatedAt: updated.rows[0].updated_at
            });
        } catch (error) {
            console.error('Error updating comment:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete own comment, or any comment if caller is a global admin
    async deleteComment(req, res) {
        try {
            const { storyId, commentId } = req.params;
            const userId = req.user.userId;

            const commentResult = await query(
                'SELECT * FROM comments WHERE id = $1 AND story_id = $2',
                [commentId, storyId]
            );

            if (commentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            if (commentResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'You can only delete your own comments' });
            }

            // comment_mentions rows cascade-delete via their FK
            await query('DELETE FROM comments WHERE id = $1', [commentId]);

            res.json({ message: 'Comment deleted successfully' });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Search stories and epics by code/title within a project, for the ticket
    // half of the @mention autocomplete (CMT-03). Sub-tasks are excluded — they
    // have no unique, user-facing short code to link them by.
    async searchStories(req, res) {
        try {
            const { projectId, q } = req.query;
            const userId = req.user.userId;

            if (!projectId || !q || q.length < 2) {
                return res.json([]);
            }

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await query(
                `SELECT id, story_id as code, title, 'story' as type FROM stories
                 WHERE project_id = $1 AND (LOWER(story_id) LIKE LOWER($2) OR LOWER(title) LIKE LOWER($2))
                 UNION ALL
                 SELECT id, epic_id as code, title, 'epic' as type FROM epics
                 WHERE project_id = $1 AND (LOWER(epic_id) LIKE LOWER($2) OR LOWER(title) LIKE LOWER($2))
                 ORDER BY code ASC
                 LIMIT 10`,
                [projectId, `%${q}%`]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error searching stories/epics:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
