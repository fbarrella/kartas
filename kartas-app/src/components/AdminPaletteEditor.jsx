import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BASE_CATEGORIES, PRESETS, deriveTokens, setCachedSystemTheme, getCachedSystemTheme } from '../utils/systemTheme';

// Applies a draft (not-yet-saved) palette directly, without touching the shared
// module cache — so Cancel can cleanly restore the last-saved state via
// setCachedSystemTheme(current) instead of having to remember what was overwritten.
const previewDraft = (lightPalette, darkPalette) => {
    const mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const base = mode === 'dark' ? darkPalette : lightPalette;
    const tokens = deriveTokens(base);
    Object.entries(tokens).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
};

const PresetThumbnail = ({ preset, selected, onClick, disabled, title }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title || preset.label}
        style={{
            position: 'relative',
            width: '64px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
            padding: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            overflow: 'hidden',
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1
        }}
    >
        <div style={{ position: 'absolute', inset: 0, backgroundColor: preset.light.primary, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: preset.dark.primary, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
    </button>
);

const AdminPaletteEditor = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user } = useAuth();
    // TFA-09: every mutating action in this component (preset select, custom
    // save) is gated on the backend behind requireTwoFactor — mirrored here
    // as a disabled state, not the real enforcement.
    const twoFactorRequired = !user?.twoFactorEnabled;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [current, setCurrent] = useState(null);
    const [editingCustom, setEditingCustom] = useState(false);
    const [draftLight, setDraftLight] = useState(null);
    const [draftDark, setDraftDark] = useState(null);

    useEffect(() => {
        fetchTheme();
    }, []);

    const fetchTheme = async () => {
        setLoading(true);
        try {
            const response = await api.get('/system-settings/theme');
            setCurrent(response.data);
        } catch (err) {
            console.error('Error fetching system theme settings:', err);
            setError(t('settings:paletteEditor.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const persist = async (payload) => {
        setError('');
        setSuccessMessage('');
        setSaving(true);
        try {
            const response = await api.put('/system-settings/theme', payload);
            setCurrent(response.data);
            setCachedSystemTheme(response.data);
            setSuccessMessage(t('settings:paletteEditor.saveSuccess'));
            setTimeout(() => setSuccessMessage(''), 3000);
            return true;
        } catch (err) {
            setError(err.response?.data?.error || t('settings:paletteEditor.saveError'));
            // Revert the live preview back to whatever is actually persisted.
            const cached = getCachedSystemTheme();
            if (cached) previewDraft(cached.lightPalette, cached.darkPalette);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const selectPreset = (preset) => {
        setEditingCustom(false);
        previewDraft(preset.light, preset.dark);
        persist({ presetName: preset.name, lightPalette: preset.light, darkPalette: preset.dark });
    };

    const startCustom = () => {
        setDraftLight({ ...current.lightPalette });
        setDraftDark({ ...current.darkPalette });
        setEditingCustom(true);
    };

    const updateDraft = (mode, key, value) => {
        if (mode === 'light') {
            const next = { ...draftLight, [key]: value };
            setDraftLight(next);
            previewDraft(next, draftDark);
        } else {
            const next = { ...draftDark, [key]: value };
            setDraftDark(next);
            previewDraft(draftLight, next);
        }
    };

    const saveCustom = async () => {
        const ok = await persist({ presetName: 'custom', lightPalette: draftLight, darkPalette: draftDark });
        if (ok) setEditingCustom(false);
    };

    const cancelCustom = () => {
        setEditingCustom(false);
        previewDraft(current.lightPalette, current.darkPalette);
    };

    if (loading) {
        return <div className="text-muted">{t('settings:paletteEditor.loading')}</div>;
    }

    if (!current) {
        return <div className="form-error">{error || t('settings:paletteEditor.unavailable')}</div>;
    }

    return (
        <div>
            {error && <div className="form-error mb-md">{error}</div>}
            {successMessage && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>}

            {!editingCustom ? (
                <>
                    <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {t('settings:paletteEditor.pickPresetHelp')}
                    </p>
                    <div className="flex flex-gap-md" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        {PRESETS.map((preset) => (
                            <PresetThumbnail
                                key={preset.name}
                                preset={preset}
                                selected={current.presetName === preset.name}
                                onClick={() => selectPreset(preset)}
                                disabled={saving || twoFactorRequired}
                                title={twoFactorRequired ? t('common:twoFactorRequiredTooltip') : undefined}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={startCustom}
                            className="btn btn-secondary btn-sm"
                            disabled={saving}
                        >
                            {current.presetName === 'custom' ? t('settings:paletteEditor.editCustomPalette') : t('settings:paletteEditor.customizeColors')}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-gap-lg" style={{ flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
                            <h4 className="mb-sm">{t('settings:paletteEditor.lightMode')}</h4>
                            {BASE_CATEGORIES.map(({ key, label }) => (
                                <div key={key} className="flex flex-between mb-xs" style={{ alignItems: 'center' }}>
                                    <span className="text-small">{label}</span>
                                    <div className="flex flex-gap-sm" style={{ alignItems: 'center' }}>
                                        <span className="text-muted text-small">{draftLight[key]}</span>
                                        <input
                                            type="color"
                                            value={draftLight[key]}
                                            onChange={(e) => updateDraft('light', key, e.target.value.toUpperCase())}
                                            style={{ width: '32px', height: '28px', padding: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
                            <h4 className="mb-sm">{t('settings:paletteEditor.darkMode')}</h4>
                            {BASE_CATEGORIES.map(({ key, label }) => (
                                <div key={key} className="flex flex-between mb-xs" style={{ alignItems: 'center' }}>
                                    <span className="text-small">{label}</span>
                                    <div className="flex flex-gap-sm" style={{ alignItems: 'center' }}>
                                        <span className="text-muted text-small">{draftDark[key]}</span>
                                        <input
                                            type="color"
                                            value={draftDark[key]}
                                            onChange={(e) => updateDraft('dark', key, e.target.value.toUpperCase())}
                                            style={{ width: '32px', height: '28px', padding: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-gap-sm mt-lg">
                        <button
                            type="button"
                            onClick={saveCustom}
                            className="btn btn-primary"
                            disabled={saving || twoFactorRequired}
                            title={twoFactorRequired ? t('common:twoFactorRequiredTooltip') : undefined}
                        >
                            {saving ? t('common:saving') : t('settings:paletteEditor.saveCustomPalette')}
                        </button>
                        <button type="button" onClick={cancelCustom} className="btn btn-secondary" disabled={saving}>
                            {t('common:cancel')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminPaletteEditor;
