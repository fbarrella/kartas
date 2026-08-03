import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { query } from '../config/database.js';
import { jwtConfig } from '../config/auth.js';
import { createEmailChallenge, resendEmailChallenge } from '../utils/twoFactor.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

const SALT_ROUNDS = 10;
const LOGIN_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;
const STEP_UP_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const STEP_UP_GRANT_TTL_MS = 5 * 60 * 1000;
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// TRUST-01: best-effort, human-readable device label from the User-Agent
// header — never blocks the trust-device flow if it can't produce one.
function parseDeviceLabel(userAgent) {
    if (!userAgent) return null;
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/);
    const browser = browserMatch ? browserMatch[1].replace('OPR', 'Opera') : 'Unknown browser';
    const osMatch = userAgent.match(/(Windows|Mac OS X|Linux|Android|iPhone|iPad)/);
    const os = osMatch ? osMatch[1] : 'Unknown OS';
    return `${browser} on ${os}`;
}

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
            const { email, password, firstName, lastName, recaptchaToken } = req.body;

            // CAPTCHA-01: no-ops when RECAPTCHA_SECRET_KEY is unset.
            const captchaResult = await verifyRecaptcha(recaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({ error: 'reCAPTCHA verification failed' });
            }

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
            const { email, password, recaptchaToken, trustedDeviceToken } = req.body;

            // CAPTCHA-01: no-ops when RECAPTCHA_SECRET_KEY is unset.
            const captchaResult = await verifyRecaptcha(recaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({ error: 'reCAPTCHA verification failed' });
            }

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

            // TRUST-01: a valid trusted-device token skips the challenge
            // entirely — but only ever the login challenge. Step-up-gated
            // actions never consult this table, per nextsteps.txt's explicit
            // "still ask for the code before dangerous actions" ask. An
            // absent/expired/wrong-account token is never an error, just
            // silently falls through to the normal challenge flow below.
            if (trustedDeviceToken) {
                const deviceResult = await query(
                    'SELECT id FROM trusted_devices WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
                    [trustedDeviceToken, user.id]
                );
                if (deviceResult.rows.length > 0) {
                    await query('UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [deviceResult.rows[0].id]);
                    const session = await issueSession(user);
                    return res.json(session);
                }
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
            const { challengeId, code, isBackupCode, trustDevice } = req.body;

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

            // TRUST-01: opt-in, only ever affects future login challenges —
            // never anything step-up gates.
            if (trustDevice) {
                const deviceToken = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_MS);
                const label = parseDeviceLabel(req.headers['user-agent']);
                await query(
                    'INSERT INTO trusted_devices (user_id, token, label, expires_at) VALUES ($1, $2, $3, $4)',
                    [user.id, deviceToken, label, expiresAt]
                );
                session.trustedDeviceToken = deviceToken;
            }

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
    },

    // STEPUP-01: creates a fresh challenge for a step-up re-verification —
    // identical shape to login()'s challenge creation, just authenticated
    // (the caller already has a session; this proves they can still produce
    // a second factor right now, before a sensitive action).
    async requestStepUp(req, res) {
        try {
            if (!req.user.twoFactorEnabled) {
                return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
            }

            const userResult = await query('SELECT email, two_factor_method FROM users WHERE id = $1', [req.user.userId]);
            const user = userResult.rows[0];

            if (user.two_factor_method === 'email') {
                const { challengeId } = await createEmailChallenge({
                    userId: req.user.userId,
                    purpose: 'step_up',
                    to: user.email,
                    expiresInMs: STEP_UP_CHALLENGE_TTL_MS
                });
                return res.json({ challengeId, method: 'email' });
            }

            const challengeResult = await query(
                `INSERT INTO two_factor_challenges (user_id, purpose, method, expires_at)
                 VALUES ($1, 'step_up', 'totp', $2) RETURNING id`,
                [req.user.userId, new Date(Date.now() + STEP_UP_CHALLENGE_TTL_MS)]
            );
            res.json({ challengeId: challengeResult.rows[0].id, method: 'totp' });
        } catch (error) {
            console.error('Error requesting step-up challenge:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // STEPUP-01: verifies a step-up challenge and, on success, issues a
    // short-lived, reusable-within-window grant token — never a session.
    // Same verification logic/lockout as verifyTwoFactor, but authenticated
    // and additionally scoped to the caller's own user id.
    async verifyStepUp(req, res) {
        try {
            const { challengeId, code, isBackupCode } = req.body;

            if (!challengeId || !code) {
                return res.status(400).json({ error: 'challengeId and code are required' });
            }

            const challengeResult = await query(
                `SELECT * FROM two_factor_challenges WHERE id = $1 AND purpose = 'step_up' AND user_id = $2`,
                [challengeId, req.user.userId]
            );

            if (challengeResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }

            const challenge = challengeResult.rows[0];

            if (challenge.consumed_at || new Date(challenge.expires_at) < new Date() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }

            const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
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
                    error: lockedOut ? 'Too many failed attempts. Start again.' : 'Invalid code'
                });
            }

            await query('UPDATE two_factor_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1', [challenge.id]);

            if (matchedBackupCodeId) {
                await query('UPDATE two_factor_backup_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [matchedBackupCodeId]);
            }

            const stepUpToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + STEP_UP_GRANT_TTL_MS);
            await query(
                'INSERT INTO step_up_grants (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [req.user.userId, stepUpToken, expiresAt]
            );

            res.json({ stepUpToken, expiresAt });
        } catch (error) {
            console.error('Error verifying step-up challenge:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // STEPUP-01/02: email-method resend for a step-up challenge — mirrors
    // resendTwoFactorChallenge (login) but authenticated and ownership-scoped
    // via userId, matching TFA-03's enrollment-resend pattern.
    async resendStepUp(req, res) {
        try {
            const { challengeId } = req.body;

            if (!challengeId) {
                return res.status(400).json({ error: 'challengeId is required' });
            }

            const result = await resendEmailChallenge({ challengeId, purpose: 'step_up', userId: req.user.userId });

            if (result.error === 'not_found') {
                return res.status(400).json({ error: 'Invalid or expired challenge' });
            }
            if (result.error === 'cooldown') {
                return res.status(429).json({ error: 'Please wait before requesting another code' });
            }

            res.json({ message: 'Code resent' });
        } catch (error) {
            console.error('Error resending step-up challenge code:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
