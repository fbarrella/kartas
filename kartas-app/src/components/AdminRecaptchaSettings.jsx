import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useStepUp } from '../contexts/StepUpContext';

// RECAP-02: mirrors AdminEmailSettings.jsx's structure (own loading/error/
// saving/successMessage state, fetch-on-mount, api.get/api.put) so every
// admin card on the Settings page stays visually and behaviorally consistent.

const EnvHint = () => {
    const { t } = useTranslation('settings');
    return (
        <small className="text-muted" style={{ display: 'block', marginTop: 'var(--spacing-xs)' }}>
            {t('settings:emailSettings.envHint')}
        </small>
    );
};

const TextField = ({ label, field, value, onChange }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        <input
            type="text"
            className="form-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={!field.editable}
        />
        {!field.editable && <EnvHint />}
    </div>
);

const PasswordField = ({ label, field, value, onChange }) => {
    const { t } = useTranslation('settings');
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {field.editable ? (
                <input
                    type="password"
                    className="form-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.configured ? t('settings:emailSettings.passwordPlaceholderConfigured') : t('settings:emailSettings.passwordPlaceholderNotSet')}
                />
            ) : (
                <input type="password" className="form-input" value="••••••••" disabled />
            )}
            {!field.editable && <EnvHint />}
        </div>
    );
};

const AdminRecaptchaSettings = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user } = useAuth();
    const { requestStepUp } = useStepUp();
    const twoFactorRequired = !user?.twoFactorEnabled;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [data, setData] = useState(null);
    const [draft, setDraft] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const draftFrom = (settings) => ({
        siteKey: settings.fields.siteKey.value,
        secretKey: ''
    });

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/system-settings/recaptcha');
            setData(response.data);
            setDraft(draftFrom(response.data));
        } catch (err) {
            console.error('Error fetching system reCAPTCHA settings:', err);
            setError(t('settings:recaptchaSettings.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSaving(true);

        const payload = {};
        const { fields } = data;
        if (fields.siteKey.editable) payload.siteKey = draft.siteKey || null;
        if (fields.secretKey.editable && draft.secretKey) payload.secretKey = draft.secretKey;

        try {
            const stepUpToken = await requestStepUp();
            const response = await api.put('/system-settings/recaptcha', payload, { headers: { 'X-Step-Up-Token': stepUpToken } });
            setData(response.data);
            setDraft(draftFrom(response.data));
            setSuccessMessage(t('settings:recaptchaSettings.saveSuccess'));
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            if (err?.message !== 'cancelled') {
                setError(err.response?.data?.error || err.message || t('settings:recaptchaSettings.saveError'));
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-muted">{t('settings:recaptchaSettings.loading')}</div>;
    }

    if (!data) {
        return <div className="form-error">{error || t('settings:recaptchaSettings.unavailable')}</div>;
    }

    const { fields } = data;

    return (
        <form onSubmit={handleSave}>
            {error && <div className="form-error mb-md">{error}</div>}
            {successMessage && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>}

            <TextField label={t('settings:recaptchaSettings.siteKey')} field={fields.siteKey} value={draft.siteKey} onChange={(v) => updateDraft('siteKey', v)} />
            <PasswordField label={t('settings:recaptchaSettings.secretKey')} field={fields.secretKey} value={draft.secretKey} onChange={(v) => updateDraft('secretKey', v)} />

            <div className="mt-lg">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || twoFactorRequired}
                    title={twoFactorRequired ? t('common:twoFactorRequiredTooltip') : undefined}
                >
                    {saving ? t('common:saving') : t('settings:recaptchaSettings.saveButton')}
                </button>
            </div>
        </form>
    );
};

export default AdminRecaptchaSettings;
