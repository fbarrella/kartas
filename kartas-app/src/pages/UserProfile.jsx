import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const UserProfile = () => {
    const { t } = useTranslation(['users', 'common']);
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/profile');
            setProfile({
                firstName: response.data.firstName,
                lastName: response.data.lastName,
                email: response.data.email
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            await api.put('/users/profile', profile);
            setSuccessMessage(t('users:profile.profileUpdated'));
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:profile.profileUpdateFailed'));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError(t('users:profile.passwordMismatch'));
            return;
        }

        if (passwords.newPassword.length < 8) {
            setError(t('users:profile.passwordTooShort'));
            return;
        }

        try {
            await api.put('/users/password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            setSuccessMessage(t('users:profile.passwordChanged'));
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:profile.passwordChangeFailed'));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh' }}>
                <div>{t('common:loading')}</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                        <span style={{ color: 'white', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Kartas</span>
                    </Link>
                    <UserDropdown />
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)', maxWidth: '600px' }}>
                <Breadcrumb items={[{ label: t('users:profile.title') }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        {t('users:backToProjects')}
                    </Link>
                </div>

                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{t('users:profile.title')}</h2>
                </div>

                {successMessage && (
                    <div className="alert alert-success mb-md">{successMessage}</div>
                )}
                {error && (
                    <div className="form-error mb-md">{error}</div>
                )}

                {/* Profile Information */}
                <div className="card mb-xl">
                    <h2>{t('users:profile.profileInformation')}</h2>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label>{t('users:fields.firstName')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('users:fields.lastName')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('common:email')}</label>
                            <input
                                type="email"
                                className="form-input"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            {t('users:profile.updateProfile')}
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="card">
                    <h2>{t('users:profile.changePassword')}</h2>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label>{t('users:profile.currentPassword')}</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('users:profile.newPassword')}</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                required
                                minLength={8}
                            />
                            <small className="text-muted">{t('users:profile.minPasswordLength')}</small>
                        </div>

                        <div className="form-group">
                            <label>{t('users:profile.confirmNewPassword')}</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            {t('users:profile.changePassword')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
