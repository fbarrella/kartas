import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

export const userController = {
    // Get all users (admin only)
    async getAllUsers(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const result = await query(
                `SELECT id, email, first_name, last_name, role, created_at
                 FROM users
                 ORDER BY created_at DESC`
            );

            res.json(result.rows.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                createdAt: user.created_at
            })));
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Create a user directly, bypassing the invite flow (admin only)
    async createUser(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { email, password, firstName, lastName, role } = req.body;

            const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const result = await query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, first_login)
                 VALUES ($1, $2, $3, $4, $5, true)
                 RETURNING id, email, first_name, last_name, role, created_at`,
                [email, passwordHash, firstName, lastName, role || 'member']
            );

            const user = result.rows[0];

            res.status(201).json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                createdAt: user.created_at
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Search users (authenticated users)
    async searchUsers(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json([]);
            }

            const result = await query(
                `SELECT id, email, first_name, last_name, role, avatar_url
                 FROM users
                 WHERE (
                    LOWER(first_name) LIKE LOWER($1) OR 
                    LOWER(last_name) LIKE LOWER($1) OR 
                    LOWER(email) LIKE LOWER($1)
                 )
                 ORDER BY first_name ASC
                 LIMIT 10`,
                [`%${q}%`]
            );

            res.json(result.rows.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                avatarUrl: user.avatar_url
            })));
        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get current user profile
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;

            const result = await query(
                `SELECT id, email, first_name, last_name, role, avatar_url, theme_preference, language_preference, created_at
                 FROM users WHERE id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                avatarUrl: user.avatar_url,
                themePreference: user.theme_preference,
                languagePreference: user.language_preference,
                createdAt: user.created_at
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update user profile
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { firstName, lastName, email } = req.body;

            // Check if email is already taken by another user
            if (email) {
                const emailCheck = await query(
                    'SELECT id FROM users WHERE email = $1 AND id != $2',
                    [email, userId]
                );

                if (emailCheck.rows.length > 0) {
                    return res.status(400).json({ error: 'Email already in use' });
                }
            }

            const result = await query(
                `UPDATE users 
                 SET first_name = COALESCE($1, first_name),
                     last_name = COALESCE($2, last_name),
                     email = COALESCE($3, email)
                 WHERE id = $4
                 RETURNING id, email, first_name, last_name, role, avatar_url`,
                [firstName, lastName, email, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                avatarUrl: user.avatar_url
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Change password
    async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;

            // Get current password hash
            const userResult = await query(
                'SELECT password_hash FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult.rows[0];

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password_hash);

            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await query(
                'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
                [hashedPassword, userId]
            );

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update the current user's light/dark theme preference (DM-03)
    async updateThemePreference(req, res) {
        try {
            const userId = req.user.userId;
            const { theme } = req.body;

            if (!['light', 'dark'].includes(theme)) {
                return res.status(400).json({ error: 'Theme must be "light" or "dark"' });
            }

            const result = await query(
                'UPDATE users SET theme_preference = $1 WHERE id = $2 RETURNING theme_preference',
                [theme, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ themePreference: result.rows[0].theme_preference });
        } catch (error) {
            console.error('Error updating theme preference:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // I18N-03: update the current user's language preference — same shape as
    // updateThemePreference above.
    async updateLanguagePreference(req, res) {
        try {
            const userId = req.user.userId;
            const { language } = req.body;

            if (!['en', 'es', 'pt-BR'].includes(language)) {
                return res.status(400).json({ error: 'Language must be "en", "es", or "pt-BR"' });
            }

            const result = await query(
                'UPDATE users SET language_preference = $1 WHERE id = $2 RETURNING language_preference',
                [language, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ languagePreference: result.rows[0].language_preference });
        } catch (error) {
            console.error('Error updating language preference:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update a user's role (admin only)
    async updateUserRole(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { id } = req.params;
            const { role } = req.body;

            // Prevent self-demotion
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({ error: 'Cannot change your own role' });
            }

            const result = await query(
                'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, role',
                [role, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            });
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete user (admin only)
    async deleteUser(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { id } = req.params;

            // Prevent deleting self
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
