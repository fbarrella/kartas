import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import RecaptchaWidget, { isRecaptchaConfigured } from '../components/RecaptchaWidget';
import kartasLogo from '../assets/kartas-logo.png';

const Login = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['auth', 'common']);
    const { login, verifyTwoFactor, resendTwoFactorCode, user, changePassword } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [passwordChangeData, setPasswordChangeData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);

    // TFA-07: set when login() reports requiresTwoFactor instead of success.
    const [twoFactorChallenge, setTwoFactorChallenge] = useState(null); // { challengeId, method }
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // CAPTCHA-02
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (user && !user.firstLogin) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordChangeInput = (e) => {
        setPasswordChangeData({
            ...passwordChangeData,
            [e.target.name]: e.target.value
        });
    };

    // TFA-07: shared by both the non-2FA login success path and the
    // post-verification success path below, so the two entry points can't
    // diverge in how they decide what screen comes next.
    const handleAuthSuccess = (authUser) => {
        if (authUser.firstLogin) {
            setShowPasswordChange(true);
            setPasswordChangeData((prev) => ({ ...prev, currentPassword: formData.password }));
        } else {
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(formData.email, formData.password, recaptchaToken);

        setLoading(false);

        if (result.requiresTwoFactor) {
            setTwoFactorChallenge({ challengeId: result.challengeId, method: result.method });
            if (result.method === 'email') {
                setResendCooldown(60);
            }
        } else if (result.success) {
            handleAuthSuccess(result.user);
        } else {
            setError(result.error);
            // CAPTCHA-02: a stale/consumed token can't be silently resubmitted.
            setRecaptchaResetKey((k) => k + 1);
        }
    };

    const handleVerifyTwoFactor = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await verifyTwoFactor(twoFactorChallenge.challengeId, twoFactorCode, useBackupCode);

        setLoading(false);

        if (result.success) {
            handleAuthSuccess(result.user);
        } else {
            setError(result.error);
        }
    };

    const handleResendTwoFactorCode = async () => {
        setError('');
        const result = await resendTwoFactorCode(twoFactorChallenge.challengeId);
        if (result.success) {
            setResendCooldown(60);
        } else {
            setError(result.error);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');

        if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
            setError(t('auth:validation.passwordsDoNotMatch'));
            return;
        }

        if (passwordChangeData.newPassword.length < 8) {
            setError(t('auth:validation.passwordMinLength'));
            return;
        }

        setLoading(true);

        const result = await changePassword(
            passwordChangeData.currentPassword,
            passwordChangeData.newPassword
        );

        setLoading(false);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    if (twoFactorChallenge) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                    <div className="card-header">
                        <h2 className="card-title">{t('auth:twoFactor.title')}</h2>
                        <p className="text-muted mt-sm">
                            {useBackupCode
                                ? t('auth:twoFactor.subtitleBackupCode')
                                : twoFactorChallenge.method === 'email'
                                    ? t('auth:twoFactor.subtitleEmail')
                                    : t('auth:twoFactor.subtitleTotp')}
                        </p>
                    </div>

                    <form onSubmit={handleVerifyTwoFactor}>
                        <div className="form-group">
                            <label className="form-label">
                                {useBackupCode ? t('auth:twoFactor.backupCodeLabel') : t('auth:twoFactor.codeLabel')}
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>

                        {error && (
                            <div className="form-error mb-md">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? t('auth:twoFactor.verifying') : t('auth:twoFactor.verifyButton')}
                        </button>
                    </form>

                    <div className="flex flex-between mt-md" style={{ alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setUseBackupCode(!useBackupCode); setTwoFactorCode(''); setError(''); }}
                        >
                            {useBackupCode ? t('auth:twoFactor.useVerificationCode') : t('auth:twoFactor.useBackupCode')}
                        </button>

                        {twoFactorChallenge.method === 'email' && !useBackupCode && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleResendTwoFactorCode}
                                disabled={resendCooldown > 0}
                            >
                                {resendCooldown > 0
                                    ? t('auth:twoFactor.resendCooldown', { seconds: resendCooldown })
                                    : t('auth:twoFactor.resendButton')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (showPasswordChange) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                    <div className="card-header">
                        <h2 className="card-title">{t('auth:login.changePasswordTitle')}</h2>
                        <p className="text-muted mt-sm">
                            {t('auth:login.changePasswordSubtitle')}
                        </p>
                    </div>

                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">{t('auth:fields.newPassword')}</label>
                            <input
                                type="password"
                                name="newPassword"
                                className="form-input"
                                value={passwordChangeData.newPassword}
                                onChange={handlePasswordChangeInput}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('auth:fields.confirmNewPassword')}</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                value={passwordChangeData.confirmPassword}
                                onChange={handlePasswordChangeInput}
                                required
                            />
                        </div>

                        {error && (
                            <div className="form-error mb-md">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? t('auth:login.changingPassword') : t('auth:login.changePasswordButton')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="card-header" style={{ textAlign: 'center' }}>
                    <img src={kartasLogo} alt="Kartas" style={{ height: '60px', marginBottom: 'var(--spacing-sm)' }} />
                    <p className="text-muted mt-sm">
                        {t('auth:login.signInSubtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('common:email')}</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth:fields.password')}</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <RecaptchaWidget onChange={setRecaptchaToken} resetKey={recaptchaResetKey} />

                    {error && (
                        <div className="form-error mb-md">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading || (isRecaptchaConfigured && !recaptchaToken)}
                    >
                        {loading ? t('auth:login.signingIn') : t('auth:login.signInButton')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
