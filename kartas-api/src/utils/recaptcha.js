const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// CAPTCHA-01: if RECAPTCHA_SECRET_KEY is unset, the check no-ops rather than
// blocking — mirrors config/email.js's "unconfigured means the feature is
// silently off" convention, so local dev needs zero Google setup. Node 18's
// built-in fetch is used; no new HTTP client dependency.
export async function verifyRecaptcha(token, remoteIp) {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
        return { success: true, skipped: true };
    }

    if (!token) {
        return { success: false, skipped: false };
    }

    try {
        const params = new URLSearchParams({ secret, response: token });
        if (remoteIp) params.set('remoteip', remoteIp);

        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await response.json();
        return { success: !!data.success, skipped: false };
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        return { success: false, skipped: false };
    }
}
