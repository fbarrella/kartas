import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RecaptchaWidget, { isRecaptchaConfigured } from '../components/RecaptchaWidget';
import kartasLogo from '../assets/kartas-logo.png';

const Register = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['auth', 'common']);
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [inviteInfo, setInviteInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    // CAPTCHA-02
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

    useEffect(() => {
        if (!token) {
            setError(t('auth:register.invalidInviteLink'));
            setLoading(false);
            return;
        }

        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await api.get(`/invites/validate/${token}`);
            setInviteInfo(response.data);
        } catch (error) {
            setError(error.response?.data?.error || t('auth:register.invalidOrExpiredInviteLink'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth:validation.passwordsDoNotMatch'));
            return;
        }

        if (formData.password.length < 8) {
            setError(t('auth:validation.passwordMinLength'));
            return;
        }

        try {
            const response = await api.post('/invites/register', {
                token,
                firstName: formData.firstName,
                lastName: formData.lastName,
                password: formData.password,
                recaptchaToken
            });

            // Store auth data
            localStorage.setItem('accessToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Redirect to dashboard
            navigate('/');
        } catch (error) {
            setError(error.response?.data?.error || t('auth:register.registrationFailed'));
            // CAPTCHA-02: a stale/consumed token can't be silently resubmitted.
            setRecaptchaResetKey((k) => k + 1);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div>{t('auth:register.validatingInvite')}</div>
            </div>
        );
    }

    if (error && !inviteInfo) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--color-danger)' }}>{t('auth:register.invalidInviteTitle')}</h2>
                    <p className="text-muted mt-md">{error}</p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary mt-lg">
                        {t('auth:register.goToLoginButton')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="text-center mb-lg">
                    <img src={kartasLogo} alt="Kartas" style={{ height: '60px', marginBottom: 'var(--spacing-sm)' }} />
                    <h2>{t('auth:register.title')}</h2>
                    {inviteInfo && (
                        <div className="mt-md">
                            <p className="text-muted">
                                {t('auth:register.invitedByPrefix')} <strong>{inviteInfo.invitedBy}</strong>
                            </p>
                            <p className="text-small text-muted">
                                {t('common:email')}: {inviteInfo.email} • {t('auth:register.roleLabel')}: <span className="badge badge-info">{inviteInfo.role}</span>
                            </p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('auth:fields.firstName')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('auth:fields.lastName')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('auth:fields.password')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                        />
                        <small className="text-muted">{t('auth:validation.passwordMinCharsHint')}</small>
                    </div>

                    <div className="form-group">
                        <label>{t('auth:fields.confirmPassword')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>

                    <RecaptchaWidget onChange={setRecaptchaToken} resetKey={recaptchaResetKey} />

                    {error && (
                        <div className="form-error mb-md">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isRecaptchaConfigured && !recaptchaToken}
                    >
                        {t('auth:register.createAccountButton')}
                    </button>
                </form>

                <div className="text-center mt-lg">
                    <p className="text-small text-muted">
                        {t('auth:register.alreadyHaveAccount')}{' '}
                        <a href="/login" style={{ color: 'var(--color-primary)' }}>
                            {t('auth:register.loginHereLink')}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
