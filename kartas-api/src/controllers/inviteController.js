import crypto from 'crypto';
import { query } from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendInviteEmail } from '../utils/mailer.js';
import { getEmailConfig } from '../config/email.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

export const inviteController = {
    // Generate invite token
    async generateInvite(req, res) {
        try {
            const { email, role } = req.body;
            const invitedBy = req.user.userId;

            // Check if user is admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can invite users' });
            }

            // Check if email already exists
            const existingUser = await query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            // MAIL-04: admin-configurable expiry (system_email_settings.invite_expiry_days), defaults to 7
            const emailConfig = await getEmailConfig();
            const expiresAt = new Date(Date.now() + emailConfig.inviteExpiryDays * 24 * 60 * 60 * 1000);

            // Store invite
            await query(
                `INSERT INTO user_invites (email, token, role, invited_by, expires_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (email) 
                 DO UPDATE SET token = $2, expires_at = $5, invited_by = $4`,
                [email, token, role || 'member', invitedBy, expiresAt]
            );

            // Generate invite link
            const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`;

            // Best-effort email send; never blocks the response on failure
            const emailResult = await sendInviteEmail({
                to: email,
                inviteLink,
                role: role || 'member',
                expiresAt,
                inviteMessage: emailConfig.inviteMessage
            });

            res.json({
                message: 'Invite generated successfully',
                inviteLink,
                token,
                expiresAt,
                emailSent: emailResult.sent,
                emailReason: emailResult.reason || null,
                emailDetail: emailResult.detail || null
            });
        } catch (error) {
            console.error('Error generating invite:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Validate invite token
    async validateInvite(req, res) {
        try {
            const { token } = req.params;

            const result = await query(
                `SELECT ui.*, u.first_name || ' ' || u.last_name as invited_by_name
                 FROM user_invites ui
                 LEFT JOIN users u ON ui.invited_by = u.id
                 WHERE ui.token = $1 AND ui.used_at IS NULL AND ui.expires_at > NOW()`,
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired invite token' });
            }

            const invite = result.rows[0];

            res.json({
                email: invite.email,
                role: invite.role,
                invitedBy: invite.invited_by_name,
                expiresAt: invite.expires_at
            });
        } catch (error) {
            console.error('Error validating invite:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Register with invite token
    async registerWithInvite(req, res) {
        try {
            const { token, password, firstName, lastName, recaptchaToken } = req.body;

            // CAPTCHA-01: no-ops when RECAPTCHA_SECRET_KEY is unset.
            const captchaResult = await verifyRecaptcha(recaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({ error: 'reCAPTCHA verification failed' });
            }

            // Validate invite
            const inviteResult = await query(
                `SELECT * FROM user_invites 
                 WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
                [token]
            );

            if (inviteResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired invite token' });
            }

            const invite = inviteResult.rows[0];

            // Check if user already exists
            const existingUser = await query(
                'SELECT id FROM users WHERE email = $1',
                [invite.email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const userResult = await query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, first_login)
                 VALUES ($1, $2, $3, $4, $5, false)
                 RETURNING id, email, first_name, last_name, role`,
                [invite.email, hashedPassword, firstName, lastName, invite.role]
            );

            const user = userResult.rows[0];

            // Mark invite as used
            await query(
                'UPDATE user_invites SET used_at = NOW(), used_by = $1 WHERE token = $2',
                [user.id, token]
            );

            // Generate JWT token
            const jwtToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Registration successful',
                token: jwtToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error registering with invite:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get all pending invites (admin only)
    async getPendingInvites(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can view invites' });
            }

            const result = await query(
                `SELECT ui.*, 
                        u.first_name || ' ' || u.last_name as invited_by_name
                 FROM user_invites ui
                 LEFT JOIN users u ON ui.invited_by = u.id
                 WHERE ui.used_at IS NULL AND ui.expires_at > NOW()
                 ORDER BY ui.created_at DESC`
            );

            res.json(result.rows.map(invite => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
                invitedBy: invite.invited_by_name,
                createdAt: invite.created_at,
                expiresAt: invite.expires_at,
                token: invite.token
            })));
        } catch (error) {
            console.error('Error fetching invites:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Cancel/Delete invite
    async deleteInvite(req, res) {
        try {
            const { inviteId } = req.params;

            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can cancel invites' });
            }

            const result = await query(
                'DELETE FROM user_invites WHERE id = $1 RETURNING id',
                [inviteId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Invite not found' });
            }

            res.json({ message: 'Invite cancelled successfully' });
        } catch (error) {
            console.error('Error cancelling invite:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
