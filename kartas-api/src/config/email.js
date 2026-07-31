import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { query } from './database.js';

dotenv.config();

async function loadDbRow() {
    const result = await query(
        `SELECT provider, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
                gmail_user, gmail_app_password, email_from, invite_message, invite_expiry_days
         FROM system_email_settings WHERE id = 1`
    );
    return result.rows[0] || null;
}

// MAIL-02: resolved fresh on every call (env-wins-else-database, per field) so
// admin edits to system_email_settings take effect immediately — no caching,
// no module-load-time freezing like this file's original transporter/
// isEmailConfigured/emailConfigStatus consts, which never picked up DB changes
// without a server restart.
export async function getEmailConfig() {
    const row = await loadDbRow();
    const provider = (process.env.EMAIL_PROVIDER || row?.provider || 'smtp').toLowerCase();

    const smtp = {
        host: process.env.SMTP_HOST || row?.smtp_host,
        port: parseInt(process.env.SMTP_PORT || row?.smtp_port || '587', 10),
        secure: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : !!row?.smtp_secure,
        user: process.env.SMTP_USER || row?.smtp_user,
        password: process.env.SMTP_PASSWORD || row?.smtp_password
    };

    const gmail = {
        user: process.env.GMAIL_USER || row?.gmail_user,
        appPassword: process.env.GMAIL_APP_PASSWORD || row?.gmail_app_password
    };

    const from = process.env.EMAIL_FROM || row?.email_from || (provider === 'gmail' ? gmail.user : smtp.user);

    const missingVars = provider === 'gmail'
        ? [!gmail.user && 'GMAIL_USER/gmail_user', !gmail.appPassword && 'GMAIL_APP_PASSWORD/gmail_app_password'].filter(Boolean)
        : [!smtp.host && 'SMTP_HOST/smtp_host', !smtp.user && 'SMTP_USER/smtp_user', !smtp.password && 'SMTP_PASSWORD/smtp_password'].filter(Boolean);

    return {
        provider,
        smtp,
        gmail,
        from,
        inviteExpiryDays: row?.invite_expiry_days ?? 7,
        inviteMessage: row?.invite_message || null,
        isConfigured: missingVars.length === 0,
        statusMessage: missingVars.length === 0 ? null : `EMAIL_PROVIDER=${provider} but missing: ${missingVars.join(', ')}`
    };
}

// Pure — takes an already-resolved config rather than re-querying, so a
// single send only reads the DB once (via getEmailConfig), not twice.
export function buildTransporter(cfg) {
    if (!cfg.isConfigured) return null;
    return cfg.provider === 'gmail'
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user: cfg.gmail.user, pass: cfg.gmail.appPassword }
        })
        : nodemailer.createTransport({
            host: cfg.smtp.host,
            port: cfg.smtp.port,
            secure: cfg.smtp.secure,
            auth: { user: cfg.smtp.user, pass: cfg.smtp.password }
        });
}
