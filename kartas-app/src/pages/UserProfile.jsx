import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const UserProfile = () => {
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
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update profile');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwords.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            await api.put('/users/password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            setSuccessMessage('Password changed successfully!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to change password');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh' }}>
                <div>Loading...</div>
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
                <Breadcrumb items={[{ label: 'My Profile' }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        ← Go back to My Projects
                    </Link>
                </div>

                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>My Profile</h2>
                </div>

                {successMessage && (
                    <div className="alert alert-success mb-md">{successMessage}</div>
                )}
                {error && (
                    <div className="form-error mb-md">{error}</div>
                )}

                {/* Profile Information */}
                <div className="card mb-xl">
                    <h2>Profile Information</h2>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            Update Profile
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="card">
                    <h2>Change Password</h2>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                required
                                minLength={8}
                            />
                            <small className="text-muted">Minimum 8 characters</small>
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            Change Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
