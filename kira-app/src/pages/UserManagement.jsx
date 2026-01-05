import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role: 'member'
    });
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchPendingInvites();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingInvites = async () => {
        try {
            const response = await api.get('/invites/pending');
            setPendingInvites(response.data);
        } catch (error) {
            console.error('Error fetching invites:', error);
        }
    };

    const handleGenerateInvite = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            const response = await api.post('/invites/generate', inviteForm);
            setInviteLink(response.data.inviteLink);
            setSuccessMessage('Invite generated successfully!');
            fetchPendingInvites();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to generate invite');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setSuccessMessage('Invite link copied to clipboard!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const closeInviteModal = () => {
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'member' });
        setInviteLink('');
        setError('');
    };

    const handleCancelInvite = async (inviteId) => {
        if (!window.confirm('Are you sure you want to cancel this invite?')) return;

        try {
            await api.delete(`/invites/${inviteId}`);
            setSuccessMessage('Invite cancelled successfully');
            fetchPendingInvites();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to cancel invite');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await api.delete(`/users/${userId}`);
            setSuccessMessage('User deleted successfully');
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete user');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container">
                    <div className="flex flex-between" style={{ alignItems: 'center' }}>
                        <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
                                ← Back to Dashboard
                            </Link>
                            <h1 style={{ color: 'white', margin: 0 }}>User Management</h1>
                        </div>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn btn-secondary"
                        >
                            + Invite User
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)' }}>
                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                    <div className="mb-xl">
                        <h2>Pending Invites</h2>
                        <div className="card">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Email</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Role</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Invited By</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Expires</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingInvites.map((invite) => (
                                        <tr key={invite.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>{invite.email}</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <span className="badge badge-info">{invite.role}</span>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>{invite.invitedBy}</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                {new Date(invite.expiresAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <button
                                                    onClick={() => handleCancelInvite(invite.id)}
                                                    className="btn btn-danger btn-sm"
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                >
                                                    Cancel
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Active Users */}
                <div>
                    <h2>Active Users</h2>
                    {loading ? (
                        <div className="text-center">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="card text-center">
                            <h3>No Users Yet</h3>
                            <p className="text-muted mt-md">Invite users to get started</p>
                        </div>
                    ) : (
                        <div className="card">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Name</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Email</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Role</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Joined</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                {user.firstName} {user.lastName}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>{user.email}</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <span className={`badge badge-${user.role === 'admin' ? 'danger' : 'info'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                {user.role !== 'admin' && ( // Prevent deleting other admins for safety, or check ID
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="btn btn-danger btn-sm"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="modal-overlay" onClick={closeInviteModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Invite User</h2>
                            <button onClick={closeInviteModal} className="btn-close">×</button>
                        </div>

                        {!inviteLink ? (
                            <form onSubmit={handleGenerateInvite}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={inviteForm.email}
                                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Role</label>
                                        <select
                                            className="form-select"
                                            value={inviteForm.role}
                                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        >
                                            <option value="member">Member</option>
                                            <option value="project_owner">Project Owner</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    {error && <div className="form-error">{error}</div>}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" onClick={closeInviteModal} className="btn btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Generate Invite
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Invite Link</label>
                                        <div className="flex flex-gap-sm">
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={inviteLink}
                                                readOnly
                                                style={{ flex: 1 }}
                                            />
                                            <button onClick={copyToClipboard} className="btn btn-secondary">
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {successMessage && (
                                        <div className="alert alert-success" style={{ color: 'var(--color-success)', marginTop: '8px' }}>{successMessage}</div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button onClick={closeInviteModal} className="btn btn-primary">
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
