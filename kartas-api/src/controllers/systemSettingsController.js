import { query } from '../config/database.js';
import { getEmailConfig } from '../config/email.js';

const BASE_CATEGORIES = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral', 'background', 'text'];
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const isValidPalette = (palette) => {
    return !!palette && typeof palette === 'object' &&
        BASE_CATEGORIES.every((key) => typeof palette[key] === 'string' && HEX_RE.test(palette[key]));
};

// MAIL-01: each entry maps a DB column to the env var(s) that lock it. When an
// env var is set, that field is env-sourced and read-only via the API — the
// DB value is never the one actually used at send time in that case (see
// email.js's getEmailConfig, which applies the identical env-wins-else-DB
// precedence), it's just kept around so a later env removal falls back to it.
const EMAIL_FIELDS = [
    { key: 'provider', column: 'provider', envVars: ['EMAIL_PROVIDER'], secret: false },
    { key: 'smtpHost', column: 'smtp_host', envVars: ['SMTP_HOST'], secret: false },
    { key: 'smtpPort', column: 'smtp_port', envVars: ['SMTP_PORT'], secret: false },
    { key: 'smtpSecure', column: 'smtp_secure', envVars: ['SMTP_SECURE'], secret: false },
    { key: 'smtpUser', column: 'smtp_user', envVars: ['SMTP_USER'], secret: false },
    { key: 'smtpPassword', column: 'smtp_password', envVars: ['SMTP_PASSWORD'], secret: true },
    { key: 'gmailUser', column: 'gmail_user', envVars: ['GMAIL_USER'], secret: false },
    { key: 'gmailAppPassword', column: 'gmail_app_password', envVars: ['GMAIL_APP_PASSWORD'], secret: true },
    { key: 'emailFrom', column: 'email_from', envVars: ['EMAIL_FROM'], secret: false }
];

const envValueFor = (envVars) => envVars.map((v) => process.env[v]).find((v) => v !== undefined && v !== '');
const isEnvLocked = (envVars) => envValueFor(envVars) !== undefined;

export const systemSettingsController = {
    // Any authenticated user — needed to render the app's actual current colors (PAL-04)
    async getTheme(req, res) {
        try {
            const result = await query(
                'SELECT preset_name, light_palette, dark_palette, updated_at FROM system_theme_settings WHERE id = 1'
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System theme settings not found' });
            }

            const row = result.rows[0];
            res.json({
                presetName: row.preset_name,
                lightPalette: row.light_palette,
                darkPalette: row.dark_palette,
                updatedAt: row.updated_at
            });
        } catch (error) {
            console.error('Error fetching system theme settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Admin-only (gated by requireAdmin in the route). Validated manually here rather than
    // relying on express-validator's body()/param() rules, since validationResult() is never
    // called anywhere in this codebase and those rules are decorative-only (see DEVLOG).
    async updateTheme(req, res) {
        try {
            const { presetName, lightPalette, darkPalette } = req.body;

            if (!presetName || typeof presetName !== 'string') {
                return res.status(400).json({ error: 'presetName is required' });
            }

            if (!isValidPalette(lightPalette) || !isValidPalette(darkPalette)) {
                return res.status(400).json({
                    error: `lightPalette and darkPalette must each provide a valid 6-digit hex value for: ${BASE_CATEGORIES.join(', ')}`
                });
            }

            const result = await query(
                `UPDATE system_theme_settings
                 SET preset_name = $1, light_palette = $2, dark_palette = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1
                 RETURNING preset_name, light_palette, dark_palette, updated_at`,
                [presetName, JSON.stringify(lightPalette), JSON.stringify(darkPalette), req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System theme settings not found' });
            }

            const row = result.rows[0];
            res.json({
                presetName: row.preset_name,
                lightPalette: row.light_palette,
                darkPalette: row.dark_palette,
                updatedAt: row.updated_at
            });
        } catch (error) {
            console.error('Error updating system theme settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // TFA-03: deliberately NOT admin-gated, unlike every other route in this
    // file — any user needs to know whether email 2FA is offerable before
    // choosing it in Settings. Leaks no secrets, just a boolean.
    async getEmailStatus(req, res) {
        try {
            const cfg = await getEmailConfig();
            res.json({ isConfigured: cfg.isConfigured });
        } catch (error) {
            console.error('Error fetching email status:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Admin-only (gated by requireAdmin in the route) — unlike theme, email
    // config is operational/sensitive with no non-admin read need.
    async getEmail(req, res) {
        try {
            const result = await query('SELECT * FROM system_email_settings WHERE id = 1');
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System email settings not found' });
            }
            const row = result.rows[0];

            const fields = {};
            for (const f of EMAIL_FIELDS) {
                const envValue = envValueFor(f.envVars);
                const source = envValue !== undefined ? 'env' : 'database';
                if (f.secret) {
                    // Never echo a secret's real value back over the API, in
                    // either direction — only whether one is configured.
                    fields[f.key] = {
                        source,
                        editable: source !== 'env',
                        configured: source === 'env' ? true : !!row[f.column]
                    };
                } else {
                    fields[f.key] = {
                        source,
                        editable: source !== 'env',
                        value: source === 'env' ? envValue : row[f.column]
                    };
                }
            }

            res.json({
                fields,
                inviteMessage: row.invite_message,
                inviteExpiryDays: row.invite_expiry_days,
                updatedAt: row.updated_at
            });
        } catch (error) {
            console.error('Error fetching system email settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Admin-only. Manual validation guard, matching updateTheme's convention —
    // validationResult() is never enforced anywhere in this codebase.
    async updateEmail(req, res) {
        try {
            const {
                provider, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword,
                gmailUser, gmailAppPassword, emailFrom, inviteMessage, inviteExpiryDays
            } = req.body;

            if (provider !== undefined && !['smtp', 'gmail'].includes(provider)) {
                return res.status(400).json({ error: "provider must be 'smtp' or 'gmail'" });
            }
            if (smtpPort !== undefined && smtpPort !== null && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
                return res.status(400).json({ error: 'smtpPort must be a valid port number' });
            }
            if (inviteExpiryDays !== undefined && (!Number.isInteger(inviteExpiryDays) || inviteExpiryDays < 1)) {
                return res.status(400).json({ error: 'inviteExpiryDays must be a positive integer' });
            }

            const current = (await query('SELECT * FROM system_email_settings WHERE id = 1')).rows[0];
            if (!current) {
                return res.status(404).json({ error: 'System email settings not found' });
            }

            // A field currently locked by an env var keeps its existing DB
            // value regardless of what was submitted — a disabled input still
            // echoes its displayed value in a plain form submit, and that must
            // never overwrite anything, even though env always wins on read
            // anyway.
            const pick = (submitted, column, envVars) =>
                isEnvLocked(envVars) ? current[column] : (submitted !== undefined ? submitted : current[column]);

            const next = {
                provider: pick(provider, 'provider', ['EMAIL_PROVIDER']),
                smtp_host: pick(smtpHost, 'smtp_host', ['SMTP_HOST']),
                smtp_port: pick(smtpPort, 'smtp_port', ['SMTP_PORT']),
                smtp_secure: pick(smtpSecure, 'smtp_secure', ['SMTP_SECURE']),
                smtp_user: pick(smtpUser, 'smtp_user', ['SMTP_USER']),
                smtp_password: pick(smtpPassword, 'smtp_password', ['SMTP_PASSWORD']),
                gmail_user: pick(gmailUser, 'gmail_user', ['GMAIL_USER']),
                gmail_app_password: pick(gmailAppPassword, 'gmail_app_password', ['GMAIL_APP_PASSWORD']),
                email_from: pick(emailFrom, 'email_from', ['EMAIL_FROM']),
                invite_message: inviteMessage !== undefined ? (inviteMessage || null) : current.invite_message,
                invite_expiry_days: inviteExpiryDays !== undefined ? inviteExpiryDays : current.invite_expiry_days
            };

            await query(
                `UPDATE system_email_settings
                 SET provider = $1, smtp_host = $2, smtp_port = $3, smtp_secure = $4, smtp_user = $5, smtp_password = $6,
                     gmail_user = $7, gmail_app_password = $8, email_from = $9, invite_message = $10, invite_expiry_days = $11,
                     updated_by = $12, updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1`,
                [
                    next.provider, next.smtp_host, next.smtp_port, next.smtp_secure, next.smtp_user, next.smtp_password,
                    next.gmail_user, next.gmail_app_password, next.email_from, next.invite_message, next.invite_expiry_days,
                    req.user.userId
                ]
            );

            // Reuse getEmail's own shaping logic so the PUT response has the
            // identical shape/security guarantees as a subsequent GET.
            return systemSettingsController.getEmail(req, res);
        } catch (error) {
            console.error('Error updating system email settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
