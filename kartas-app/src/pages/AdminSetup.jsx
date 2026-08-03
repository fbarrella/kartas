import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import RecaptchaWidget, { useRecaptchaSiteKey } from '../components/RecaptchaWidget';
import kartasLogo from '../assets/kartas-logo.png';

const AdminSetup = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['auth', 'common']);
    const { createAdmin } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // CAPTCHA-02/RECAP-03
    const { siteKey: recaptchaSiteKey, loading: recaptchaLoading } = useRecaptchaSiteKey();
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError(t('auth:validation.passwordsDoNotMatch'));
            return;
        }

        if (formData.password.length < 8) {
            setError(t('auth:validation.passwordMinLength'));
            return;
        }

        setLoading(true);

        const result = await createAdmin(
            formData.email,
            formData.password,
            formData.firstName,
            formData.lastName,
            recaptchaToken
        );

        setLoading(false);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
            // CAPTCHA-02: a stale/consumed token can't be silently resubmitted.
            setRecaptchaResetKey((k) => k + 1);
        }
    };

    return (
        <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="card-header" style={{ textAlign: 'center' }}>
                    <img src={kartasLogo} alt="Kartas" style={{ height: '60px', marginBottom: 'var(--spacing-sm)' }} />
                    <h1 className="card-title" style={{ color: 'var(--color-primary)' }}>
                        {t('auth:adminSetup.welcomeTitle')}
                    </h1>
                    <p className="text-muted mt-sm">
                        {t('auth:adminSetup.subtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('auth:fields.firstName')}</label>
                        <input
                            type="text"
                            name="firstName"
                            className="form-input"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth:fields.lastName')}</label>
                        <input
                            type="text"
                            name="lastName"
                            className="form-input"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                            minLength={8}
                        />
                        <small className="text-muted text-small">
                            {t('auth:validation.passwordMinCharsHintAlt')}
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth:fields.confirmPassword')}</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-input"
                            value={formData.confirmPassword}
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
                        disabled={loading || (!recaptchaLoading && recaptchaSiteKey && !recaptchaToken)}
                    >
                        {loading ? t('auth:adminSetup.creatingAdmin') : t('auth:adminSetup.createAdminButton')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminSetup;
