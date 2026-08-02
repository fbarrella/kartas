import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { getEmailConfig } from '../config/email.js';
import { generateBackupCodes, createEmailChallenge, resendEmailChallenge } from '../utils/twoFactor.js';

const SALT_ROUNDS = 10;
const EMAIL_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;

const shapeUser = (row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorMethod: row.two_factor_method
});

export const twoFactorController = {
    // TFA-02: generates a pending (unconfirmed) TOTP secret and its QR code.
    // Nothing is activated until confirmTotp verifies a real code against it.
    async setupTotp(req, res) {
        try {
            if (req.user.twoFactorEnabled) {
                return res.status(400).json({ error: 'Disable your current two-factor method before setting up a new one' });
            }

            const secret = authenticator.generateSecret();
            await query('UPDATE users SET totp_secret_pending = $1 WHERE id = $2', [secret, req.user.userId]);

            const otpauth = authenticator.keyuri(req.user.email, 'Kartas', secret);
            const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

            res.json({ secret, qrCodeDataUrl });
        } catch (error) {
            console.error('Error setting up TOTP:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async confirmTotp(req, res) {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'code is required' });
            }

            const result = await query('SELECT totp_secret_pending FROM users WHERE id = $1', [req.user.userId]);
            const pending = result.rows[0]?.totp_secret_pending;

            if (!pending) {
                return res.status(400).json({ error: 'No pending authenticator app setup found. Start setup again.' });
            }

            const valid = authenticator.verify({ token: code, secret: pending, window: 1 });

            if (!valid) {
                return res.status(400).json({ error: 'Invalid code' });
            }

            await query(
                `UPDATE users
                 SET totp_secret = totp_secret_pending, totp_secret_pending = NULL,
                     two_factor_enabled = TRUE, two_factor_method = 'totp'
                 WHERE id = $1`,
                [req.user.userId]
            );

            const backupCodes = await generateBackupCodes(req.user.userId);
            const userResult = await query(
                'SELECT id, email, first_name, last_name, role, two_factor_enabled, two_factor_method FROM users WHERE id = $1',
                [req.user.userId]
            );

            res.json({ backupCodes, user: shapeUser(userResult.rows[0]) });
        } catch (error) {
            console.error('Error confirming TOTP:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // TFA-03: only offerable when the system's email settings actually work
    // (MAIL-01, Phase 7) — GET /email/status is how the frontend checks first.
    async setupEmail(req, res) {
        try {
            if (req.user.twoFactorEnabled) {
                return res.status(400).json({ error: 'Disable your current two-factor method before setting up a new one' });
            }

            const cfg = await getEmailConfig();
            if (!cfg.isConfigured) {
                return res.status(400).json({ error: 'Email is not configured on this system' });
            }

            const { challengeId, emailResult } = await createEmailChallenge({
                userId: req.user.userId,
                purpose: 'enable_email',
                to: req.user.email,
                expiresInMs: EMAIL_CHALLENGE_TTL_MS
            });

            res.json({ challengeId, emailSent: emailResult.sent });
        } catch (error) {
            console.error('Error setting up email 2FA:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async confirmEmail(req, res) {
        try {
            const { challengeId, code } = req.body;

            if (!challengeId || !code) {
                return res.status(400).json({ error: 'challengeId and code are required' });
            }

            const result = await query(
                `SELECT * FROM two_factor_challenges WHERE id = $1 AND user_id = $2 AND purpose = 'enable_email'`,
                [challengeId, req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired code' });
            }

            const challenge = result.rows[0];

            if (challenge.consumed_at || new Date(challenge.expires_at) < new Date() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
                return res.status(400).json({ error: 'Invalid or expired code' });
            }

            const valid = await bcrypt.compare(code, challenge.code_hash);

            if (!valid) {
                const newAttempts = challenge.attempts + 1;
                const lockedOut = newAttempts >= MAX_CHALLENGE_ATTEMPTS;

                await query(
                    `UPDATE two_factor_challenges SET attempts = $1${lockedOut ? ', consumed_at = CURRENT_TIMESTAMP' : ''} WHERE id = $2`,
                    [newAttempts, challenge.id]
                );

                return res.status(400).json({
                    error: lockedOut ? 'Too many failed attempts. Start setup again.' : 'Invalid code'
                });
            }

            await query('UPDATE two_factor_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1', [challenge.id]);
            await query(
                `UPDATE users SET two_factor_enabled = TRUE, two_factor_method = 'email' WHERE id = $1`,
                [req.user.userId]
            );

            const backupCodes = await generateBackupCodes(req.user.userId);
            const userResult = await query(
                'SELECT id, email, first_name, last_name, role, two_factor_enabled, two_factor_method FROM users WHERE id = $1',
                [req.user.userId]
            );

            res.json({ backupCodes, user: shapeUser(userResult.rows[0]) });
        } catch (error) {
            console.error('Error confirming email 2FA:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async resendEmail(req, res) {
        try {
            const { challengeId } = req.body;

            if (!challengeId) {
                return res.status(400).json({ error: 'challengeId is required' });
            }

            const result = await resendEmailChallenge({ challengeId, purpose: 'enable_email', userId: req.user.userId });

            if (result.error === 'not_found') {
                return res.status(400).json({ error: 'Invalid or expired code' });
            }
            if (result.error === 'cooldown') {
                return res.status(429).json({ error: 'Please wait before requesting another code' });
            }

            res.json({ message: 'Code resent' });
        } catch (error) {
            console.error('Error resending email 2FA code:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // TFA-04: requires re-entering the current password, mirroring
    // userController.changePassword's re-auth pattern — a defense against a
    // hijacked-but-not-yet-logged-out session silently minting new recovery codes.
    async regenerateBackupCodes(req, res) {
        try {
            if (!req.user.twoFactorEnabled) {
                return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
            }

            const { currentPassword } = req.body;

            if (!currentPassword) {
                return res.status(400).json({ error: 'currentPassword is required' });
            }

            const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

            if (!valid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            const backupCodes = await generateBackupCodes(req.user.userId);
            res.json({ backupCodes });
        } catch (error) {
            console.error('Error regenerating backup codes:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // TFA-06 (frontend, sub-phase 8.2): disables 2FA entirely, clearing the
    // active method/secret and every backup code — requires the current
    // password, same re-auth pattern as regenerateBackupCodes.
    async disable(req, res) {
        try {
            if (!req.user.twoFactorEnabled) {
                return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
            }

            const { currentPassword } = req.body;

            if (!currentPassword) {
                return res.status(400).json({ error: 'currentPassword is required' });
            }

            const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

            if (!valid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            await query(
                `UPDATE users
                 SET two_factor_enabled = FALSE, two_factor_method = NULL,
                     totp_secret = NULL, totp_secret_pending = NULL
                 WHERE id = $1`,
                [req.user.userId]
            );
            await query('DELETE FROM two_factor_backup_codes WHERE user_id = $1', [req.user.userId]);

            res.json({ message: 'Two-factor authentication disabled' });
        } catch (error) {
            console.error('Error disabling two-factor authentication:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
