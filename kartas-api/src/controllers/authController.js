import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { query } from '../config/database.js';
import { jwtConfig } from '../config/auth.js';
import { createEmailChallenge, resendEmailChallenge } from '../utils/twoFactor.js';

const SALT_ROUNDS = 10;
const LOGIN_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;

// TFA-05: the single place a successful authentication (with or without a
// 2FA step-up) turns into real tokens — used by both login()'s non-2FA path
// and verifyTwoFactor()'s success path, so their response shapes can never
// drift apart.
async function issueSession(user) {
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
    );

    // jti (random, not just userId) guarantees a unique token string even
    // when two sessions are issued for the same user within the same
    // wall-clock second — jwt.sign's HS256 output is otherwise deterministic
    // per (payload, iat, secret), and refresh_tokens.token is UNIQUE. Found
    // via a genuine collision while curl-testing the login->2fa/verify
    // sequence back-to-back.
    const refreshToken = jwt.sign(
        { userId: user.id, jti: crypto.randomBytes(16).toString('hex') },
        jwtConfig.refreshSecret,
        { expiresIn: jwtConfig.refreshExpiresIn }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, expiresAt]
    );

    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            firstLogin: user.first_login,
            themePreference: user.theme_preference,
            languagePreference: user.language_preference,
            twoFactorEnabled: user.two_factor_enabled,
            twoFactorMethod: user.two_factor_method
        },
        accessToken,
        refreshToken
    };
}

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
         RETURNING id, email, first_name, last_name, role, theme_preference, language_preference`,
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
                    role: user.role,
                    themePreference: user.theme_preference,
                    languagePreference: user.language_preference
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

            // TFA-05: non-2FA accounts authenticate exactly as before. A 2FA-
            // enabled account gets a challenge instead of tokens — no user
            // object, no tokens, so a partially-completed login never leaks
            // profile data before the second factor is proven.
            if (!user.two_factor_enabled) {
                const session = await issueSession(user);
                return res.json(session);
            }

            if (user.two_factor_method === 'email') {
                const { challengeId } = await createEmailChallenge({
                    userId: user.id,
                    purpose: 'login',
                    to: user.email,
                    expiresInMs: LOGIN_CHALLENGE_TTL_MS
                });
                return res.json({ requiresTwoFactor: true, method: 'email', challengeId });
            }

            const challengeResult = await query(
                `INSERT INTO two_factor_challenges (user_id, purpose, method, expires_at)
                 VALUES ($1, 'login', 'totp', $2) RETURNING id`,
                [user.id, new Date(Date.now() + LOGIN_CHALLENGE_TTL_MS)]
            );
            res.json({ requiresTwoFactor: true, method: 'totp', challengeId: challengeResult.rows[0].id });
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
    },

    // TFA-05: completes a 2FA-challenged login. No authenticateToken — this
    // endpoint IS how a challenged login becomes an authenticated session.
    // Every failure path returns the same generic message, never revealing
    // which specific check failed (method, code, backup code).
    async verifyTwoFactor(req, res) {
        try {
            const { challengeId, code, isBackupCode } = req.body;

            if (!challengeId || !code) {
                return res.status(400).json({ error: 'challengeId and code are required' });
            }

            const challengeResult = await query(
                `SELECT * FROM two_factor_challenges WHERE id = $1 AND purpose = 'login'`,
                [challengeId]
            );

            if (challengeResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }

            const challenge = challengeResult.rows[0];

            if (challenge.consumed_at || new Date(challenge.expires_at) < new Date() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }

            const userResult = await query('SELECT * FROM users WHERE id = $1', [challenge.user_id]);

            if (userResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }

            const user = userResult.rows[0];

            let valid = false;
            let matchedBackupCodeId = null;

            if (isBackupCode) {
                const backupCodes = await query(
                    'SELECT id, code_hash FROM two_factor_backup_codes WHERE user_id = $1 AND used_at IS NULL',
                    [user.id]
                );
                for (const row of backupCodes.rows) {
                    if (await bcrypt.compare(code, row.code_hash)) {
                        valid = true;
                        matchedBackupCodeId = row.id;
                        break;
                    }
                }
            } else if (challenge.method === 'totp') {
                valid = authenticator.verify({ token: code, secret: user.totp_secret, window: 1 });
            } else if (challenge.method === 'email') {
                valid = await bcrypt.compare(code, challenge.code_hash);
            }

            if (!valid) {
                const newAttempts = challenge.attempts + 1;
                const lockedOut = newAttempts >= MAX_CHALLENGE_ATTEMPTS;

                await query(
                    `UPDATE two_factor_challenges SET attempts = $1${lockedOut ? ', consumed_at = CURRENT_TIMESTAMP' : ''} WHERE id = $2`,
                    [newAttempts, challenge.id]
                );

                return res.status(400).json({
                    error: lockedOut ? 'Too many failed attempts. Please log in again.' : 'Invalid code'
                });
            }

            await query('UPDATE two_factor_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1', [challenge.id]);

            if (matchedBackupCodeId) {
                await query('UPDATE two_factor_backup_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [matchedBackupCodeId]);
            }

            const session = await issueSession(user);
            res.json(session);
        } catch (error) {
            console.error('Error verifying two-factor challenge:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async resendTwoFactorChallenge(req, res) {
        try {
            const { challengeId } = req.body;

            if (!challengeId) {
                return res.status(400).json({ error: 'challengeId is required' });
            }

            const result = await resendEmailChallenge({ challengeId, purpose: 'login' });

            if (result.error === 'not_found') {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }
            if (result.error === 'cooldown') {
                return res.status(429).json({ error: 'Please wait before requesting another code' });
            }

            res.json({ message: 'Code resent' });
        } catch (error) {
            console.error('Error resending two-factor challenge code:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
