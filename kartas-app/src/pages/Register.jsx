import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import kartasLogo from '../assets/kartas-logo.png';

const Register = () => {
    const navigate = useNavigate();
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

    useEffect(() => {
        if (!token) {
            setError('Invalid invite link');
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
            setError(error.response?.data?.error || 'Invalid or expired invite link');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            const response = await api.post('/invites/register', {
                token,
                firstName: formData.firstName,
                lastName: formData.lastName,
                password: formData.password
            });

            // Store auth data
            localStorage.setItem('accessToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Redirect to dashboard
            navigate('/');
        } catch (error) {
            setError(error.response?.data?.error || 'Registration failed');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div>Validating invite...</div>
            </div>
        );
    }

    if (error && !inviteInfo) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
                <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--color-danger)' }}>Invalid Invite</h2>
                    <p className="text-muted mt-md">{error}</p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary mt-lg">
                        Go to Login
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
                    <h2>Complete Your Registration</h2>
                    {inviteInfo && (
                        <div className="mt-md">
                            <p className="text-muted">
                                You've been invited by <strong>{inviteInfo.invitedBy}</strong>
                            </p>
                            <p className="text-small text-muted">
                                Email: {inviteInfo.email} • Role: <span className="badge badge-info">{inviteInfo.role}</span>
                            </p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>First Name</label>
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
                        <label>Last Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                        />
                        <small className="text-muted">Minimum 8 characters</small>
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>

                    {error && (
                        <div className="form-error mb-md">{error}</div>
                    )}

                    <button type="submit" className="btn btn-primary btn-block">
                        Create Account
                    </button>
                </form>

                <div className="text-center mt-lg">
                    <p className="text-small text-muted">
                        Already have an account?{' '}
                        <a href="/login" style={{ color: 'var(--color-primary)' }}>
                            Login here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
