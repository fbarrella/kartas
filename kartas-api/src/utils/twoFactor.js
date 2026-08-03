import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { sendTwoFactorCodeEmail } from './mailer.js';

const SALT_ROUNDS = 10;
const RESEND_COOLDOWN_MS = 60 * 1000;
const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// TFA-04: the only place in the codebase that ever produces plaintext backup
// codes — callers must never log the return value. Regenerating always fully
// invalidates the prior set (no partial carry-over).
export async function generateBackupCodes(userId) {
    await query('DELETE FROM two_factor_backup_codes WHERE user_id = $1', [userId]);

    const codes = Array.from({ length: 10 }, () => {
        const bytes = crypto.randomBytes(8);
        let code = '';
        for (const b of bytes) code += BACKUP_CODE_ALPHABET[b % BACKUP_CODE_ALPHABET.length];
        return code;
    });

    for (const code of codes) {
        const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
        await query(
            'INSERT INTO two_factor_backup_codes (user_id, code_hash) VALUES ($1, $2)',
            [userId, codeHash]
        );
    }

    return codes;
}

// TFA-03/TFA-05: shared by email-method enrollment and email-method login
// challenges — creates the challenge row and sends the code in one step.
export async function createEmailChallenge({ userId, purpose, to, expiresInMs }) {
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const result = await query(
        `INSERT INTO two_factor_challenges (user_id, purpose, method, code_hash, expires_at, last_sent_at)
         VALUES ($1, $2, 'email', $3, $4, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, purpose, codeHash, expiresAt]
    );

    const emailResult = await sendTwoFactorCodeEmail({ to, code });
    return { challengeId: result.rows[0].id, emailResult };
}

// Shared 60s-cooldown resend logic. `userId`, when passed, is an ownership
// check (TFA-03's authenticated enrollment resend); TFA-05's unauthenticated
// login-challenge resend omits it — challengeId + purpose='login' is all it
// has to scope by, since the caller isn't logged in yet.
export async function resendEmailChallenge({ challengeId, purpose, userId = null }) {
    const params = [challengeId, purpose];
    let sql = `SELECT tc.*, u.email FROM two_factor_challenges tc
               JOIN users u ON u.id = tc.user_id
               WHERE tc.id = $1 AND tc.purpose = $2 AND tc.method = 'email'
                 AND tc.consumed_at IS NULL AND tc.expires_at > NOW()`;
    if (userId !== null) {
        sql += ' AND tc.user_id = $3';
        params.push(userId);
    }

    const result = await query(sql, params);
    if (result.rows.length === 0) {
        return { error: 'not_found' };
    }

    const challenge = result.rows[0];
    if (challenge.last_sent_at && Date.now() - new Date(challenge.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
        return { error: 'cooldown' };
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    await query(
        'UPDATE two_factor_challenges SET code_hash = $1, last_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        [codeHash, challenge.id]
    );

    const emailResult = await sendTwoFactorCodeEmail({ to: challenge.email, code });
    return { emailResult };
}
