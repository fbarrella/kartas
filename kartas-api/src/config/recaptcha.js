import dotenv from 'dotenv';
import { query } from './database.js';

dotenv.config();

async function loadDbRow() {
    const result = await query(
        'SELECT site_key, secret_key FROM system_recaptcha_settings WHERE id = 1'
    );
    return result.rows[0] || null;
}

// RECAP-01: resolved fresh on every call (env-wins-else-database, per field),
// mirroring config/email.js's getEmailConfig() exactly — no caching, so an
// admin edit to system_recaptcha_settings takes effect immediately.
//
// Unlike email's single isConfigured flag, this exposes two independent
// booleans: the frontend widget only needs a site key to render, and the
// backend's verifyRecaptcha() only needs a secret key to check a token — one
// half can be configured without the other and each is still meaningful.
export async function getRecaptchaConfig() {
    const row = await loadDbRow();

    const siteKey = process.env.RECAPTCHA_SITE_KEY || row?.site_key || null;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || row?.secret_key || null;

    return {
        siteKey,
        secretKey,
        hasSiteKey: !!siteKey,
        hasSecretKey: !!secretKey
    };
}
