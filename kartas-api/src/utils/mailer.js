import { getEmailConfig, buildTransporter } from '../config/email.js';

// Best-effort invite email send. Never throws — the invite link is the
// source of truth; email delivery is a convenience on top of it.
export async function sendInviteEmail({ to, inviteLink, role, expiresAt, inviteMessage }) {
    const cfg = await getEmailConfig();
    if (!cfg.isConfigured) {
        return { sent: false, reason: 'not_configured', detail: cfg.statusMessage };
    }

    // MAIL-04: an admin-set custom message is a lead paragraph ahead of the
    // standard invite copy — the link + expiry lines are always present
    // regardless of customization. Not HTML-escaped: only admins can set
    // this, and admins are already a trusted role throughout this app's
    // existing model (matches the untouched `role` interpolation below).
    const leadText = inviteMessage
        ? `${inviteMessage}\n\nYou've been invited to join Kartas as a ${role}.`
        : `You've been invited to join Kartas as a ${role}.`;
    const leadHtml = inviteMessage
        ? `<p>${inviteMessage}</p><p>You've been invited to join Kartas as a <strong>${role}</strong>.</p>`
        : `<p>You've been invited to join Kartas as a <strong>${role}</strong>.</p>`;

    try {
        await buildTransporter(cfg).sendMail({
            from: cfg.from,
            to,
            subject: 'You’ve been invited to Kartas',
            text: `${leadText}\n\nClick the link below to complete your registration:\n${inviteLink}\n\n` +
                  `This link expires on ${new Date(expiresAt).toLocaleString()}.`,
            html: `${leadHtml}<p><a href="${inviteLink}">Click here to complete your registration</a></p>` +
                  `<p>This link expires on ${new Date(expiresAt).toLocaleString()}.</p>`
        });
        return { sent: true };
    } catch (error) {
        console.error('Error sending invite email:', error);
        return { sent: false, reason: 'send_failed', detail: error.message };
    }
}

// TFA-03/TFA-05: best-effort 2FA code send. Same never-throws contract as
// sendInviteEmail — the challenge row in the database is the source of
// truth for verification; email is just a delivery channel on top of it.
export async function sendTwoFactorCodeEmail({ to, code }) {
    const cfg = await getEmailConfig();
    if (!cfg.isConfigured) {
        return { sent: false, reason: 'not_configured', detail: cfg.statusMessage };
    }

    try {
        await buildTransporter(cfg).sendMail({
            from: cfg.from,
            to,
            subject: 'Your Kartas verification code',
            text: `Your verification code is: ${code}\n\n` +
                  `This code will expire shortly. If you didn't request this, you can ignore this email.`,
            html: `<p>Your verification code is: <strong>${code}</strong></p>` +
                  `<p>This code will expire shortly. If you didn't request this, you can ignore this email.</p>`
        });
        return { sent: true };
    } catch (error) {
        console.error('Error sending two-factor code email:', error);
        return { sent: false, reason: 'send_failed', detail: error.message };
    }
}
