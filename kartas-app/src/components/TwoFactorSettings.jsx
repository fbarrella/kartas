import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const RESEND_COOLDOWN_SECONDS = 60;

// TFA-06: a per-user, non-admin-gated card on Settings' Personal tab. Every
// sub-view below (method choice, TOTP setup, email setup, backup codes,
// regenerate/disable) is a small overlay modal following CloneStoryModal.jsx's
// existing fixed-overlay + .card pattern — this codebase has no generic
// Modal shell component by design, so each feature builds its own.
const ModalShell = ({ onClose, children, maxWidth = '480px' }) => (
    <div
        style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}
        onClick={onClose}
    >
        <div className="card" style={{ maxWidth, width: '100%', margin: 'var(--spacing-md)' }} onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const TwoFactorSettings = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user, setTwoFactorState } = useAuth();

    // 'choose-method' | 'totp-setup' | 'email-setup' | 'backup-codes' | 'regenerate' | 'disable' | null
    const [view, setView] = useState(null);
    const [emailAvailable, setEmailAvailable] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const [totpData, setTotpData] = useState(null); // { secret, qrCodeDataUrl }
    const [emailChallengeId, setEmailChallengeId] = useState(null);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [backupCodes, setBackupCodes] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [copied, setCopied] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const isEnabled = !!user?.twoFactorEnabled;

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const resetModalState = () => {
        setView(null);
        setError('');
        setSaving(false);
        setTotpData(null);
        setEmailChallengeId(null);
        setCode('');
        setPassword('');
        setBackupCodes(null);
        setAcknowledged(false);
        setCopied(false);
        setResendCooldown(0);
    };

    const openChooseMethod = async () => {
        setView('choose-method');
        setError('');
        try {
            const response = await api.get('/system-settings/email/status');
            setEmailAvailable(response.data.isConfigured);
        } catch (err) {
            console.error('Error checking email status:', err);
            setEmailAvailable(false);
        }
    };

    const startTotpSetup = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/users/2fa/totp/setup');
            setTotpData(response.data);
            setView('totp-setup');
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.chooseMethod.startError'));
        } finally {
            setSaving(false);
        }
    };

    const startEmailSetup = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/users/2fa/email/setup');
            setEmailChallengeId(response.data.challengeId);
            setView('email-setup');
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.chooseMethod.startError'));
        } finally {
            setSaving(false);
        }
    };

    const confirmTotp = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/users/2fa/totp/confirm', { code });
            setTwoFactorState(true, 'totp');
            setBackupCodes(response.data.backupCodes);
            setView('backup-codes');
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.totpSetup.confirmError'));
        } finally {
            setSaving(false);
        }
    };

    const confirmEmail = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/users/2fa/email/confirm', { challengeId: emailChallengeId, code });
            setTwoFactorState(true, 'email');
            setBackupCodes(response.data.backupCodes);
            setView('backup-codes');
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.emailSetup.confirmError'));
        } finally {
            setSaving(false);
        }
    };

    const resendEmailCode = async () => {
        setError('');
        try {
            await api.post('/users/2fa/email/resend', { challengeId: emailChallengeId });
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.emailSetup.resendError'));
        }
    };

    const openRegenerate = () => {
        setView('regenerate');
        setError('');
        setPassword('');
    };

    const openDisable = () => {
        setView('disable');
        setError('');
        setPassword('');
    };

    const confirmRegenerate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/users/2fa/backup-codes/regenerate', { currentPassword: password });
            setBackupCodes(response.data.backupCodes);
            setView('backup-codes');
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.regenerateModal.error'));
        } finally {
            setSaving(false);
        }
    };

    const confirmDisable = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.post('/users/2fa/disable', { currentPassword: password });
            setTwoFactorState(false, null);
            resetModalState();
        } catch (err) {
            setError(err.response?.data?.error || t('settings:twoFactor.disableModal.error'));
            setSaving(false);
        }
    };

    const copyAllCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className="flex flex-between" style={{ alignItems: 'center' }}>
                <div>
                    <strong>
                        {isEnabled
                            ? (user.twoFactorMethod === 'email'
                                ? t('settings:twoFactor.statusEnabledEmail')
                                : t('settings:twoFactor.statusEnabledTotp'))
                            : t('settings:twoFactor.statusDisabled')}
                    </strong>
                </div>
            </div>

            <div className="flex flex-gap-sm mt-md">
                {!isEnabled && (
                    <button type="button" className="btn btn-primary" onClick={openChooseMethod}>
                        {t('settings:twoFactor.enableButton')}
                    </button>
                )}
                {isEnabled && (
                    <>
                        <button type="button" className="btn btn-secondary" onClick={openRegenerate}>
                            {t('settings:twoFactor.regenerateButton')}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={openDisable}>
                            {t('settings:twoFactor.disableButton')}
                        </button>
                    </>
                )}
            </div>

            {view === 'choose-method' && (
                <ModalShell onClose={resetModalState}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.chooseMethod.title')}</h3>
                    </div>
                    {error && <div className="form-error mb-md">{error}</div>}
                    <div className="flex flex-gap-sm" style={{ flexDirection: 'column' }}>
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={startTotpSetup} style={{ textAlign: 'left' }}>
                            <div>{t('settings:twoFactor.chooseMethod.totpOption')}</div>
                            <small className="text-muted">{t('settings:twoFactor.chooseMethod.totpOptionHelp')}</small>
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={saving || !emailAvailable}
                            onClick={startEmailSetup}
                            style={{ textAlign: 'left' }}
                            title={emailAvailable === false ? t('settings:twoFactor.chooseMethod.emailUnavailable') : undefined}
                        >
                            <div>{t('settings:twoFactor.chooseMethod.emailOption')}</div>
                            <small className="text-muted">
                                {emailAvailable === false
                                    ? t('settings:twoFactor.chooseMethod.emailUnavailable')
                                    : t('settings:twoFactor.chooseMethod.emailOptionHelp')}
                            </small>
                        </button>
                    </div>
                    <div className="flex mt-lg" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={resetModalState}>{t('common:cancel')}</button>
                    </div>
                </ModalShell>
            )}

            {view === 'totp-setup' && totpData && (
                <ModalShell onClose={resetModalState}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.totpSetup.title')}</h3>
                    </div>
                    <p className="text-muted">{t('settings:twoFactor.totpSetup.instructions')}</p>
                    <div className="flex flex-center mb-md">
                        <img src={totpData.qrCodeDataUrl} alt="QR code" style={{ width: '200px', height: '200px' }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('settings:twoFactor.totpSetup.secretLabel')}</label>
                        <input type="text" className="form-input" value={totpData.secret} readOnly onClick={(e) => e.target.select()} />
                    </div>
                    <form onSubmit={confirmTotp}>
                        <div className="form-group">
                            <label className="form-label">{t('settings:twoFactor.totpSetup.codeLabel')}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="form-input"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        {error && <div className="form-error mb-md">{error}</div>}
                        <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={resetModalState} disabled={saving}>{t('common:cancel')}</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('settings:twoFactor.totpSetup.verifying') : t('settings:twoFactor.totpSetup.verifyButton')}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {view === 'email-setup' && (
                <ModalShell onClose={resetModalState}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.emailSetup.title')}</h3>
                    </div>
                    <p className="text-muted">{t('settings:twoFactor.emailSetup.instructions')}</p>
                    <form onSubmit={confirmEmail}>
                        <div className="form-group">
                            <label className="form-label">{t('settings:twoFactor.emailSetup.codeLabel')}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="form-input"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        {error && <div className="form-error mb-md">{error}</div>}
                        <div className="flex flex-between" style={{ alignItems: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={resendEmailCode}
                                disabled={resendCooldown > 0}
                            >
                                {resendCooldown > 0
                                    ? t('settings:twoFactor.emailSetup.resendCooldown', { seconds: resendCooldown })
                                    : t('settings:twoFactor.emailSetup.resendButton')}
                            </button>
                            <div className="flex flex-gap-sm">
                                <button type="button" className="btn btn-secondary" onClick={resetModalState} disabled={saving}>{t('common:cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? t('settings:twoFactor.emailSetup.verifying') : t('settings:twoFactor.emailSetup.verifyButton')}
                                </button>
                            </div>
                        </div>
                    </form>
                </ModalShell>
            )}

            {view === 'backup-codes' && backupCodes && (
                <ModalShell onClose={() => { if (acknowledged) resetModalState(); }}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.backupCodes.title')}</h3>
                    </div>
                    <p className="text-muted">{t('settings:twoFactor.backupCodes.description')}</p>
                    <div
                        className="mb-md"
                        style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)',
                            fontFamily: 'monospace', fontSize: 'var(--font-size-md)',
                            backgroundColor: 'var(--color-background)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)'
                        }}
                    >
                        {backupCodes.map((c) => <div key={c}>{c}</div>)}
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={copyAllCodes}>
                        {copied ? t('settings:twoFactor.backupCodes.copied') : t('settings:twoFactor.backupCodes.copyAll')}
                    </button>
                    <div className="form-group mt-lg" style={{ marginBottom: 0 }}>
                        <label className="flex flex-gap-sm" style={{ alignItems: 'center' }}>
                            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                            {t('settings:twoFactor.backupCodes.acknowledge')}
                        </label>
                    </div>
                    <div className="flex mt-lg" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-primary" disabled={!acknowledged} onClick={resetModalState}>
                            {t('settings:twoFactor.backupCodes.close')}
                        </button>
                    </div>
                </ModalShell>
            )}

            {view === 'regenerate' && (
                <ModalShell onClose={resetModalState}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.regenerateModal.title')}</h3>
                    </div>
                    <p className="text-muted">{t('settings:twoFactor.regenerateModal.description')}</p>
                    <form onSubmit={confirmRegenerate}>
                        <div className="form-group">
                            <label className="form-label">{t('settings:twoFactor.passwordLabel')}</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        {error && <div className="form-error mb-md">{error}</div>}
                        <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={resetModalState} disabled={saving}>{t('common:cancel')}</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('settings:twoFactor.regenerateModal.regenerating') : t('settings:twoFactor.regenerateModal.confirmButton')}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {view === 'disable' && (
                <ModalShell onClose={resetModalState}>
                    <div className="card-header">
                        <h3 className="card-title">{t('settings:twoFactor.disableModal.title')}</h3>
                    </div>
                    <p className="text-muted">{t('settings:twoFactor.disableModal.description')}</p>
                    <form onSubmit={confirmDisable}>
                        <div className="form-group">
                            <label className="form-label">{t('settings:twoFactor.passwordLabel')}</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        {error && <div className="form-error mb-md">{error}</div>}
                        <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={resetModalState} disabled={saving}>{t('common:cancel')}</button>
                            <button type="submit" className="btn btn-danger" disabled={saving}>
                                {saving ? t('settings:twoFactor.disableModal.disabling') : t('settings:twoFactor.disableModal.confirmButton')}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
};

export default TwoFactorSettings;
