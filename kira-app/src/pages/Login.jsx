import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const navigate = useNavigate();
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
            setError('Passwords do not match');
            return;
        }

        if (passwordChangeData.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
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
                        <h2 className="card-title">Change Your Password</h2>
                        <p className="text-muted mt-sm">
                            Please set a new password for your account
                        </p>
                    </div>

                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
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
                            <label className="form-label">Confirm New Password</label>
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
                            {loading ? 'Changing Password...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="card-header">
                    <h1 className="card-title" style={{ color: 'var(--color-primary)' }}>
                        Kira
                    </h1>
                    <p className="text-muted mt-sm">
                        Sign in to your account
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
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
                        <label className="form-label">Password</label>
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
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
