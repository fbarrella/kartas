import React, { useEffect, useRef, useState } from 'react';

// CAPTCHA-02: whether a site key is configured at all — pages use this to
// decide whether a token is required before enabling their submit button.
export const isRecaptchaConfigured = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY;

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

// v2 checkbox widget. Renders nothing when VITE_RECAPTCHA_SITE_KEY is unset —
// the frontend mirror of the backend's skip-when-unconfigured fallback
// (CAPTCHA-01), so local dev needs zero Google setup. No new npm dependency:
// loads Google's plain script directly, per this codebase's established
// preference for avoiding unnecessary abstractions/wrapper packages.
//
// `resetKey`: bump this (e.g. a counter) after a failed submit so the widget
// re-checks and the parent can't silently resubmit a stale/consumed token.
const RecaptchaWidget = ({ onChange, resetKey }) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [scriptReady, setScriptReady] = useState(false);

    useEffect(() => {
        if (!isRecaptchaConfigured) return;
        let cancelled = false;
        loadRecaptchaScript()
            .then(() => { if (!cancelled) setScriptReady(true); })
            .catch((err) => console.error(err));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!scriptReady || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            callback: (token) => onChange(token),
            'expired-callback': () => onChange(null)
        });
    }, [scriptReady, onChange]);

    useEffect(() => {
        if (widgetIdRef.current === null || !window.grecaptcha) return;
        window.grecaptcha.reset(widgetIdRef.current);
        onChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    if (!isRecaptchaConfigured) return null;

    return <div ref={containerRef} className="mb-md" />;
};

export default RecaptchaWidget;
