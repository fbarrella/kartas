import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const RESEND_COOLDOWN_SECONDS = 60;

const StepUpContext = createContext(null);

// STEPUP-02: a single shared modal, mounted once at the app root, usable
// from any component via requestStepUp() — avoids duplicating the code-entry
// UI across every one of Phase 8's gated buttons (UserManagement, ProjectView,
// three Admin Settings cards). Mirrors TwoFactorSettings.jsx's ModalShell +
// code-entry-with-resend pattern rather than inventing a new one.
export const useStepUp = () => {
    const context = useContext(StepUpContext);
    if (!context) {
        throw new Error('useStepUp must be used within a StepUpProvider');
    }
    return context;
};

export const StepUpProvider = ({ children }) => {
    const { t } = useTranslation(['common']);

    const [visible, setVisible] = useState(false);
    const [challenge, setChallenge] = useState(null); // { challengeId, method }
    const [code, setCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // A verified grant, cached in memory ONLY (never localStorage — a
    // step-up grant must never survive a page reload). resolverRef holds the
    // in-flight requestStepUp() promise's resolve/reject while the modal is open.
    const grantRef = useRef(null); // { token, expiresAt }
    const resolverRef = useRef(null);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Rejections are always plain Error objects (never a bare string, never
    // an axios error) so every consumer can handle them the same way:
    // `if (error.message === 'cancelled') return;` else display `error.message`.
    const closeModal = () => {
        setVisible(false);
        setChallenge(null);
        setCode('');
        setUseBackupCode(false);
        setError('');
        setResendCooldown(0);
        if (resolverRef.current) {
            resolverRef.current.reject(new Error('cancelled'));
        }
        resolverRef.current = null;
    };

    const requestStepUp = () => {
        if (grantRef.current && new Date(grantRef.current.expiresAt) > new Date()) {
            return Promise.resolve(grantRef.current.token);
        }

        return new Promise((resolve, reject) => {
            resolverRef.current = { resolve, reject };
            api.post('/auth/2fa/step-up/request')
                .then((response) => {
                    setChallenge(response.data);
                    if (response.data.method === 'email') setResendCooldown(RESEND_COOLDOWN_SECONDS);
                    setVisible(true);
                })
                .catch((err) => {
                    resolverRef.current = null;
                    reject(new Error(err.response?.data?.error || t('common:stepUp.startError')));
                });
        });
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setVerifying(true);
        setError('');
        try {
            const response = await api.post('/auth/2fa/step-up/verify', {
                challengeId: challenge.challengeId,
                code,
                isBackupCode: useBackupCode
            });
            grantRef.current = { token: response.data.stepUpToken, expiresAt: response.data.expiresAt };
            const resolve = resolverRef.current?.resolve;
            resolverRef.current = null;
            setVisible(false);
            setChallenge(null);
            setCode('');
            setUseBackupCode(false);
            setResendCooldown(0);
            resolve?.(response.data.stepUpToken);
        } catch (err) {
            setError(err.response?.data?.error || t('common:stepUp.verifyError'));
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setError('');
        try {
            await api.post('/auth/2fa/step-up/resend', { challengeId: challenge.challengeId });
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setError(err.response?.data?.error || t('common:stepUp.resendError'));
        }
    };

    return (
        <StepUpContext.Provider value={{ requestStepUp }}>
            {children}
            {visible && challenge && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000
                    }}
                    onClick={() => closeModal()}
                >
                    <div
                        className="card"
                        style={{ maxWidth: '420px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="card-header">
                            <h3 className="card-title">{t('common:stepUp.title')}</h3>
                            <p className="text-muted mt-sm">
                                {useBackupCode
                                    ? t('common:stepUp.subtitleBackupCode')
                                    : challenge.method === 'email'
                                        ? t('common:stepUp.subtitleEmail')
                                        : t('common:stepUp.subtitleTotp')}
                            </p>
                        </div>

                        <form onSubmit={handleVerify}>
                            <div className="form-group">
                                <label className="form-label">
                                    {useBackupCode ? t('common:stepUp.backupCodeLabel') : t('common:stepUp.codeLabel')}
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && <div className="form-error mb-md">{error}</div>}

                            <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => closeModal()} disabled={verifying}>
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={verifying}>
                                    {verifying ? t('common:stepUp.verifying') : t('common:stepUp.verifyButton')}
                                </button>
                            </div>
                        </form>

                        <div className="flex flex-between mt-md" style={{ alignItems: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setUseBackupCode(!useBackupCode); setCode(''); setError(''); }}
                            >
                                {useBackupCode ? t('common:stepUp.useVerificationCode') : t('common:stepUp.useBackupCode')}
                            </button>

                            {challenge.method === 'email' && !useBackupCode && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0}
                                >
                                    {resendCooldown > 0
                                        ? t('common:stepUp.resendCooldown', { seconds: resendCooldown })
                                        : t('common:stepUp.resendButton')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </StepUpContext.Provider>
    );
};
