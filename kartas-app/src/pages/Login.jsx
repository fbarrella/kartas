import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import kartasLogo from '../assets/kartas-logo.png';

const Login = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['auth', 'common']);
    const { login, user, changePassword } = useAuth();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(formData.email, formData.password);

        setLoading(false);

        if (result.success) {
            if (result.user.firstLogin) {
                setShowPasswordChange(true);
                setPasswordChangeData({
                    ...passwordChangeData,
                    currentPassword: formData.password
                });
            } else {
                navigate('/');
            }
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
                        {loading ? t('auth:login.signingIn') : t('auth:login.signInButton')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
