import { query } from '../config/database.js';
import { generateUniqueTicketPrefix } from '../utils/ticketPrefix.js';

export const projectController = {
    // Create a new project
    async createProject(req, res) {
        try {
            const { name, description } = req.body;
            const userId = req.user.userId;

            // Generate unique ticket prefix
            const ticketPrefix = await generateUniqueTicketPrefix(name);

            // Create project
            const result = await query(
                `INSERT INTO projects (name, ticket_prefix, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [name, ticketPrefix, description, userId]
            );

            const project = result.rows[0];

            // Add creator as project owner
            await query(
                `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
                [project.id, userId]
            );

            res.status(201).json({
                id: project.id,
                name: project.name,
                ticketPrefix: project.ticket_prefix,
                description: project.description,
                createdBy: project.created_by,
                createdAt: project.created_at
            });
        } catch (error) {
            console.error('Error creating project:', error);

            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Project with this name already exists' });
            }

            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get all projects for current user
    async getUserProjects(req, res) {
        try {
            const userId = req.user.userId;
            const isAdmin = req.user.role === 'admin';

            let projectsQuery;
            let params;

            if (isAdmin) {
                // Admins can see all projects
                projectsQuery = `
          SELECT p.*,
                 u.first_name || ' ' || u.last_name as created_by_name,
                 pm.role as user_role,
                 pus.default_landing_page
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
          LEFT JOIN project_user_settings pus ON pus.project_id = p.id AND pus.user_id = $1
          ORDER BY p.created_at DESC
        `;
                params = [userId];
            } else {
                // Regular users only see projects they're members of
                projectsQuery = `
          SELECT p.*,
                 u.first_name || ' ' || u.last_name as created_by_name,
                 pm.role as user_role,
                 pus.default_landing_page
          FROM projects p
          INNER JOIN project_members pm ON p.id = pm.project_id
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN project_user_settings pus ON pus.project_id = p.id AND pus.user_id = $1
          WHERE pm.user_id = $1
          ORDER BY p.created_at DESC
        `;
                params = [userId];
            }

            const result = await query(projectsQuery, params);

            res.json(result.rows.map(project => ({
                id: project.id,
                name: project.name,
                ticketPrefix: project.ticket_prefix,
                description: project.description,
                createdBy: project.created_by,
                createdByName: project.created_by_name,
                userRole: project.user_role,
                defaultLandingPage: project.default_landing_page || 'backlog',
                createdAt: project.created_at
            })));
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single project
    async getProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;
            const isAdmin = req.user.role === 'admin';

            // Check if user has access to this project
            const accessCheck = await query(
                `SELECT pm.role FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2`,
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && !isAdmin) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get project details
            const result = await query(
                `SELECT p.*, 
                u.first_name || ' ' || u.last_name as created_by_name
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = $1`,
                [projectId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const project = result.rows[0];

            // Get project members
            const membersResult = await query(
                `SELECT u.id, u.email, u.first_name, u.last_name, pm.role, pm.joined_at
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = $1
         ORDER BY pm.joined_at`,
                [projectId]
            );

            res.json({
                id: project.id,
                name: project.name,
                ticketPrefix: project.ticket_prefix,
                description: project.description,
                createdBy: project.created_by,
                createdByName: project.created_by_name,
                createdAt: project.created_at,
                members: membersResult.rows.map(member => ({
                    id: member.id,
                    email: member.email,
                    firstName: member.first_name,
                    lastName: member.last_name,
                    role: member.role,
                    joinedAt: member.joined_at
                }))
            });
        } catch (error) {
            console.error('Error fetching project:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update project
    async updateProject(req, res) {
        try {
            const { projectId } = req.params;
            const { name, description } = req.body;
            const userId = req.user.userId;

            // Check if user is project owner or admin
            const accessCheck = await query(
                `SELECT pm.role FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.role = 'owner'`,
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only project owners can update projects' });
            }

            const result = await query(
                `UPDATE projects 
         SET name = COALESCE($1, name), 
             description = COALESCE($2, description)
         WHERE id = $3
         RETURNING *`,
                [name, description, projectId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const project = result.rows[0];

            res.json({
                id: project.id,
                name: project.name,
                ticketPrefix: project.ticket_prefix,
                description: project.description,
                createdBy: project.created_by,
                createdAt: project.created_at
            });
        } catch (error) {
            console.error('Error updating project:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete project
    async deleteProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;

            // Check if user is project owner or admin
            const accessCheck = await query(
                `SELECT pm.role FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.role = 'owner'`,
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only project owners can delete projects' });
            }

            const result = await query(
                'DELETE FROM projects WHERE id = $1 RETURNING id',
                [projectId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({ message: 'Project deleted successfully' });
        } catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Add member to project
    async addMember(req, res) {
        try {
            const { projectId } = req.params;
            const { userId: newMemberId, email, role } = req.body;
            const userId = req.user.userId;

            // Check if user is project owner or admin
            const accessCheck = await query(
                `SELECT pm.role FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.role = 'owner'`,
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only project owners can add members' });
            }

            let targetUserId = newMemberId;

            // If email provided, look up user
            if (email) {
                const emailCheck = await query(
                    'SELECT id FROM users WHERE email = $1',
                    [email]
                );

                if (emailCheck.rows.length === 0) {
                    return res.status(404).json({ error: 'User with this email not found' });
                }
                targetUserId = emailCheck.rows[0].id;
            } else if (!targetUserId) {
                return res.status(400).json({ error: 'User ID or Email is required' });
            }

            // Check if user exists (redundant if found by email, but safe for ID)
            if (!email) {
                const userCheck = await query(
                    'SELECT id FROM users WHERE id = $1',
                    [targetUserId]
                );

                if (userCheck.rows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
            }

            // Add member
            await query(
                `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) 
         DO UPDATE SET role = $3`,
                [projectId, targetUserId, role || 'member']
            );

            res.json({ message: 'Member added successfully' });
        } catch (error) {
            console.error('Error adding member:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Remove member from project
    async removeMember(req, res) {
        try {
            const { projectId, userId: memberIdToRemove } = req.params;
            const userId = req.user.userId;

            // Check if user is project owner or admin
            const accessCheck = await query(
                `SELECT pm.role FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.role = 'owner'`,
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only project owners can remove members' });
            }

            // Don't allow removing the last owner
            const ownerCount = await query(
                `SELECT COUNT(*) as count FROM project_members
         WHERE project_id = $1 AND role = 'owner'`,
                [projectId]
            );

            const memberRole = await query(
                `SELECT role FROM project_members
         WHERE project_id = $1 AND user_id = $2`,
                [projectId, memberIdToRemove]
            );

            if (memberRole.rows.length > 0 &&
                memberRole.rows[0].role === 'owner' &&
                parseInt(ownerCount.rows[0].count) === 1) {
                return res.status(400).json({ error: 'Cannot remove the last project owner' });
            }

            const result = await query(
                'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING user_id',
                [projectId, memberIdToRemove]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Member not found in project' });
            }

            res.json({ message: 'Member removed successfully' });
        } catch (error) {
            console.error('Error removing member:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get project members (for dropdowns)
    async getProjectMembers(req, res) {
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

            // Get project members
            const result = await query(
                `SELECT u.id, u.email, u.first_name, u.last_name, pm.role
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = $1
         ORDER BY u.first_name, u.last_name`,
                [projectId]
            );

            res.json(result.rows.map(member => ({
                id: member.id,
                email: member.email,
                firstName: member.first_name,
                lastName: member.last_name,
                role: member.role
            })));
        } catch (error) {
            console.error('Error fetching project members:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get the current user's settings for a project (e.g. default landing page)
    async getProjectSettings(req, res) {
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

            const result = await query(
                'SELECT default_landing_page FROM project_user_settings WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            res.json({
                defaultLandingPage: result.rows[0]?.default_landing_page || 'backlog'
            });
        } catch (error) {
            console.error('Error fetching project settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update the current user's settings for a project
    async updateProjectSettings(req, res) {
        try {
            const { projectId } = req.params;
            const { defaultLandingPage } = req.body;
            const userId = req.user.userId;

            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            await query(
                `INSERT INTO project_user_settings (project_id, user_id, default_landing_page)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (project_id, user_id)
                 DO UPDATE SET default_landing_page = $3, updated_at = CURRENT_TIMESTAMP`,
                [projectId, userId, defaultLandingPage]
            );

            res.json({ defaultLandingPage });
        } catch (error) {
            console.error('Error updating project settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
