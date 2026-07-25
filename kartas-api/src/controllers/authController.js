import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { jwtConfig } from '../config/auth.js';

const SALT_ROUNDS = 10;

export const authController = {
    // Check if admin exists (for first-run setup)
    async checkAdminExists(req, res) {
        try {
            const result = await query(
                "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
            );

            const adminExists = parseInt(result.rows[0].count) > 0;

            res.json({ adminExists });
        } catch (error) {
            console.error('Error checking admin:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Create first admin account
    async createAdmin(req, res) {
        try {
            const { email, password, firstName, lastName } = req.body;

            // Check if admin already exists
            const adminCheck = await query(
                "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
            );

            if (parseInt(adminCheck.rows[0].count) > 0) {
                return res.status(400).json({ error: 'Admin already exists' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

            // Create admin user
            const result = await query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, first_login)
         VALUES ($1, $2, $3, $4, 'admin', FALSE)
         RETURNING id, email, first_name, last_name, role`,
                [email, passwordHash, firstName, lastName]
            );

            const user = result.rows[0];

            // Generate tokens
            const accessToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                jwtConfig.secret,
                { expiresIn: jwtConfig.expiresIn }
            );

            const refreshToken = jwt.sign(
                { userId: user.id },
                jwtConfig.refreshSecret,
                { expiresIn: jwtConfig.refreshExpiresIn }
            );

            // Store refresh token
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await query(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, refreshToken, expiresAt]
            );

            res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            });
        } catch (error) {
            console.error('Error creating admin:', error);

            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Email already exists' });
            }

            res.status(500).json({ error: 'Server error' });
        }
    },

    // Login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const result = await query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result.rows[0];

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate tokens
            const accessToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                jwtConfig.secret,
                { expiresIn: jwtConfig.expiresIn }
            );

            const refreshToken = jwt.sign(
                { userId: user.id },
                jwtConfig.refreshSecret,
                { expiresIn: jwtConfig.refreshExpiresIn }
            );

            // Store refresh token
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await query(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, refreshToken, expiresAt]
            );

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    firstLogin: user.first_login
                },
                accessToken,
                refreshToken
            });
        } catch (error) {
            console.error('Error logging in:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Refresh access token
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token required' });
            }

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

            // Check if refresh token exists and is valid
            const tokenResult = await query(
                'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
                [refreshToken, decoded.userId]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            // Get user
            const userResult = await query(
                'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }

            const user = userResult.rows[0];

            // Generate new access token
            const accessToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                jwtConfig.secret,
                { expiresIn: jwtConfig.expiresIn }
            );

            res.json({ accessToken });
        } catch (error) {
            console.error('Error refreshing token:', error);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Refresh token expired' });
            }

            res.status(403).json({ error: 'Invalid refresh token' });
        }
    },

    // Change password (for first login)
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;

            // Get user
            const result = await query(
                'SELECT * FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password and first_login flag
            await query(
                'UPDATE users SET password_hash = $1, first_login = FALSE WHERE id = $2',
                [newPasswordHash, userId]
            );

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Logout
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                // Delete refresh token
                await query(
                    'DELETE FROM refresh_tokens WHERE token = $1',
                    [refreshToken]
                );
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Error logging out:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
