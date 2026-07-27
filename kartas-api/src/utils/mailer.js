import { transporter, emailConfig, isEmailConfigured, emailConfigStatus } from '../config/email.js';

// Best-effort invite email send. Never throws — the invite link is the
// source of truth; email delivery is a convenience on top of it.
export async function sendInviteEmail({ to, inviteLink, role, expiresAt }) {
    if (!isEmailConfigured) {
        return { sent: false, reason: 'not_configured', detail: emailConfigStatus };
    }

    try {
        await transporter.sendMail({
            from: emailConfig.from,
            to,
            subject: 'You’ve been invited to Kartas',
            text: `You've been invited to join Kartas as a ${role}.\n\n` +
                  `Click the link below to complete your registration:\n${inviteLink}\n\n` +
                  `This link expires on ${new Date(expiresAt).toLocaleString()}.`,
            html: `<p>You've been invited to join Kartas as a <strong>${role}</strong>.</p>` +
                  `<p><a href="${inviteLink}">Click here to complete your registration</a></p>` +
                  `<p>This link expires on ${new Date(expiresAt).toLocaleString()}.</p>`
        });
        return { sent: true };
    } catch (error) {
        console.error('Error sending invite email:', error);
        return { sent: false, reason: 'send_failed', detail: error.message };
    }
}
