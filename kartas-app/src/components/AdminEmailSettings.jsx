import React, { useState, useEffect } from 'react';
import api from '../services/api';

// MAIL-03: mirrors AdminPaletteEditor.jsx's structure (own loading/error/saving/
// successMessage state, fetch-on-mount, api.get/api.put) so the two admin cards
// on the Settings page stay visually and behaviorally consistent.

const EnvHint = () => (
    <small className="text-muted" style={{ display: 'block', marginTop: 'var(--spacing-xs)' }}>
        Set via environment variable
    </small>
);

const TextField = ({ label, field, value, onChange, type = 'text' }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        <input
            type={type}
            className="form-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={!field.editable}
        />
        {!field.editable && <EnvHint />}
    </div>
);

// Env-locked: masked, disabled — the real secret is never sent to the frontend.
// DB-sourced: starts blank (never pre-filled with a fake placeholder that could
// be accidentally resubmitted as literal characters) — blank on submit means
// "leave unchanged."
const PasswordField = ({ label, field, value, onChange }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        {field.editable ? (
            <input
                type="password"
                className="form-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.configured ? 'Leave blank to keep the current password' : 'Not set'}
            />
        ) : (
            <input type="password" className="form-input" value="••••••••" disabled />
        )}
        {!field.editable && <EnvHint />}
    </div>
);

const AdminEmailSettings = () => {
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
        provider: settings.fields.provider.value,
        smtpHost: settings.fields.smtpHost.value,
        smtpPort: settings.fields.smtpPort.value ?? '',
        smtpSecure: !!settings.fields.smtpSecure.value,
        smtpUser: settings.fields.smtpUser.value,
        smtpPassword: '',
        gmailUser: settings.fields.gmailUser.value,
        gmailAppPassword: '',
        emailFrom: settings.fields.emailFrom.value,
        inviteMessage: settings.inviteMessage || '',
        inviteExpiryDays: settings.inviteExpiryDays
    });

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/system-settings/email');
            setData(response.data);
            setDraft(draftFrom(response.data));
        } catch (err) {
            console.error('Error fetching system email settings:', err);
            setError('Failed to load system email settings');
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

        const payload = { inviteMessage: draft.inviteMessage || null, inviteExpiryDays: parseInt(draft.inviteExpiryDays, 10) };
        const { fields } = data;
        if (fields.provider.editable) payload.provider = draft.provider;
        if (fields.smtpHost.editable) payload.smtpHost = draft.smtpHost || null;
        if (fields.smtpPort.editable) payload.smtpPort = draft.smtpPort === '' ? null : parseInt(draft.smtpPort, 10);
        if (fields.smtpSecure.editable) payload.smtpSecure = draft.smtpSecure;
        if (fields.smtpUser.editable) payload.smtpUser = draft.smtpUser || null;
        if (fields.smtpPassword.editable && draft.smtpPassword) payload.smtpPassword = draft.smtpPassword;
        if (fields.gmailUser.editable) payload.gmailUser = draft.gmailUser || null;
        if (fields.gmailAppPassword.editable && draft.gmailAppPassword) payload.gmailAppPassword = draft.gmailAppPassword;
        if (fields.emailFrom.editable) payload.emailFrom = draft.emailFrom || null;

        try {
            const response = await api.put('/system-settings/email', payload);
            setData(response.data);
            setDraft(draftFrom(response.data));
            setSuccessMessage('Email settings saved');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save email settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-muted">Loading system email settings...</div>;
    }

    if (!data) {
        return <div className="form-error">{error || 'System email settings unavailable'}</div>;
    }

    const { fields } = data;

    return (
        <form onSubmit={handleSave}>
            {error && <div className="form-error mb-md">{error}</div>}
            {successMessage && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>}

            <div className="form-group">
                <label className="form-label">Provider</label>
                <select
                    className="form-select"
                    value={draft.provider}
                    onChange={(e) => updateDraft('provider', e.target.value)}
                    disabled={!fields.provider.editable}
                >
                    <option value="smtp">SMTP</option>
                    <option value="gmail">Gmail</option>
                </select>
                {!fields.provider.editable && <EnvHint />}
            </div>

            {draft.provider === 'gmail' ? (
                <>
                    <TextField label="Gmail Address" field={fields.gmailUser} value={draft.gmailUser} onChange={(v) => updateDraft('gmailUser', v)} />
                    <PasswordField label="Gmail App Password" field={fields.gmailAppPassword} value={draft.gmailAppPassword} onChange={(v) => updateDraft('gmailAppPassword', v)} />
                </>
            ) : (
                <>
                    <TextField label="SMTP Host" field={fields.smtpHost} value={draft.smtpHost} onChange={(v) => updateDraft('smtpHost', v)} />
                    <TextField label="SMTP Port" field={fields.smtpPort} value={draft.smtpPort} onChange={(v) => updateDraft('smtpPort', v)} type="number" />
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="switch switch-primary">
                            <input
                                type="checkbox"
                                checked={draft.smtpSecure}
                                onChange={(e) => updateDraft('smtpSecure', e.target.checked)}
                                disabled={!fields.smtpSecure.editable}
                            />
                            <span className="switch-track">
                                <span className="switch-thumb" />
                            </span>
                            <span className="switch-text">Use TLS (secure)</span>
                        </label>
                        {!fields.smtpSecure.editable && <EnvHint />}
                    </div>
                    <TextField label="SMTP User" field={fields.smtpUser} value={draft.smtpUser} onChange={(v) => updateDraft('smtpUser', v)} />
                    <PasswordField label="SMTP Password" field={fields.smtpPassword} value={draft.smtpPassword} onChange={(v) => updateDraft('smtpPassword', v)} />
                </>
            )}

            <TextField label="From Address" field={fields.emailFrom} value={draft.emailFrom} onChange={(v) => updateDraft('emailFrom', v)} />

            <div className="form-group">
                <label className="form-label">Custom Invite Message</label>
                <textarea
                    className="form-textarea"
                    value={draft.inviteMessage}
                    onChange={(e) => updateDraft('inviteMessage', e.target.value)}
                    placeholder="Optional message shown at the top of every invite email."
                />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Invite Link Expiry (days)</label>
                <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={draft.inviteExpiryDays}
                    onChange={(e) => updateDraft('inviteExpiryDays', e.target.value)}
                    style={{ maxWidth: '160px' }}
                />
            </div>

            <div className="mt-lg">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
            </div>
        </form>
    );
};

export default AdminEmailSettings;
