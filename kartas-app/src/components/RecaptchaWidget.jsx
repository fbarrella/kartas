import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';

// RECAP-03: an admin-configured site key (system_recaptcha_settings, Phase 9)
// can change at runtime, so the effective site key can no longer be a
// build-time constant (the old `isRecaptchaConfigured = !!import.meta.env...`)
// — it has to be fetched. Cached at module scope: Login/Register/AdminSetup
// each mount their own widget, but only one page is ever mounted at a time,
// so this just avoids a refetch if a user bounces between them in one session.
let siteKeyPromise = null;

function fetchSiteKey() {
    if (!siteKeyPromise) {
        siteKeyPromise = api.get('/system-settings/recaptcha/site-key')
            .then((response) => response.data.siteKey)
            .catch((err) => {
                console.error('Error fetching reCAPTCHA site key:', err);
                return null;
            });
    }
    return siteKeyPromise;
}

// Pages use this to know whether to keep their submit button gated on a
// token — `loading` matters so the button isn't wrongly enabled during the
// brief fetch window before the effective configuration is known.
export const useRecaptchaSiteKey = () => {
    const [state, setState] = useState({ siteKey: null, loading: true });

    useEffect(() => {
        let cancelled = false;
        fetchSiteKey().then((siteKey) => {
            if (!cancelled) setState({ siteKey, loading: false });
        });
        return () => { cancelled = true; };
    }, []);

    return state;
};

let scriptLoadingPromise = null;

const loadRecaptchaScript = () => {
    if (window.grecaptcha?.render) return Promise.resolve();
    if (scriptLoadingPromise) return scriptLoadingPromise;

    scriptLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.head.appendChild(script);
    });

    return scriptLoadingPromise;
};

// v2 checkbox widget. Renders nothing when no site key is configured (env or
// admin-set) — the frontend mirror of the backend's skip-when-unconfigured
// fallback (CAPTCHA-01/RECAP-01), so local dev needs zero Google setup. No
// new npm dependency: loads Google's plain script directly, per this
// codebase's established preference for avoiding unnecessary wrapper packages.
//
// `resetKey`: bump this (e.g. a counter) after a failed submit so the widget
// re-checks and the parent can't silently resubmit a stale/consumed token.
const RecaptchaWidget = ({ onChange, resetKey }) => {
    const { siteKey, loading: siteKeyLoading } = useRecaptchaSiteKey();
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [scriptReady, setScriptReady] = useState(false);

    useEffect(() => {
        if (siteKeyLoading || !siteKey) return;
        let cancelled = false;
        loadRecaptchaScript()
            .then(() => { if (!cancelled) setScriptReady(true); })
            .catch((err) => console.error(err));
        return () => { cancelled = true; };
    }, [siteKeyLoading, siteKey]);

    useEffect(() => {
        if (!scriptReady || !siteKey || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onChange(token),
            'expired-callback': () => onChange(null)
        });
    }, [scriptReady, siteKey, onChange]);

    useEffect(() => {
        if (widgetIdRef.current === null || !window.grecaptcha) return;
        window.grecaptcha.reset(widgetIdRef.current);
        onChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    if (siteKeyLoading || !siteKey) return null;

    return <div ref={containerRef} className="mb-md" />;
};

export default RecaptchaWidget;
