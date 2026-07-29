import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const USER_ROLE_OPTIONS = ['admin', 'project_owner', 'member'];

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role: 'member'
    });
    const [inviteLink, setInviteLink] = useState('');
    const [inviteEmailSent, setInviteEmailSent] = useState(false);
    const [inviteEmailReason, setInviteEmailReason] = useState(null);
    const [inviteEmailDetail, setInviteEmailDetail] = useState(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'member'
    });
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
            setInviteEmailSent(response.data.emailSent);
            setInviteEmailReason(response.data.emailReason);
            setInviteEmailDetail(response.data.emailDetail);
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
        setInviteEmailSent(false);
        setInviteEmailReason(null);
        setInviteEmailDetail(null);
        setError('');
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            await api.post('/users', createUserForm);
            setSuccessMessage('User created successfully');
            closeCreateUserModal();
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create user');
        }
    };

    const closeCreateUserModal = () => {
        setShowCreateUserModal(false);
        setCreateUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'member' });
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

    const handleChangeRole = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            setSuccessMessage('Role updated successfully');
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update role');
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
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                        <span style={{ color: 'white', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Kartas</span>
                    </Link>
                    <UserDropdown />
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)' }}>
                <Breadcrumb items={[{ label: 'User Management' }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        ← Go back to My Projects
                    </Link>
                </div>

                <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>User Management</h2>
                    <div className="flex flex-gap-sm">
                        <button
                            onClick={() => setShowCreateUserModal(true)}
                            className="btn btn-secondary"
                        >
                            + Create User
                        </button>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn btn-secondary"
                        >
                            + Invite User
                        </button>
                    </div>
                </div>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                    <div className="mb-xl">
                        <h3>Pending Invites</h3>
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
                    <h3>Active Users</h3>
                    {error && (
                        <div className="card mb-md" style={{ backgroundColor: 'var(--color-danger-light)', borderLeft: '4px solid var(--color-danger)' }}>
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="card mb-md" style={{ backgroundColor: 'var(--color-success-light)', borderLeft: '4px solid var(--color-success)' }}>
                            {successMessage}
                        </div>
                    )}
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
                                                {user.id === currentUser?.id ? (
                                                    <span className={`badge badge-${user.role === 'admin' ? 'danger' : 'info'}`} title="You cannot change your own role">
                                                        {user.role}
                                                    </span>
                                                ) : (
                                                    <select
                                                        className="form-select"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                                                        value={user.role}
                                                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                                    >
                                                        {USER_ROLE_OPTIONS.map(role => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                )}
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
                                    {inviteEmailSent ? (
                                        <div
                                            className="card mb-md"
                                            style={{ backgroundColor: 'var(--color-success-light)', borderLeft: '4px solid var(--color-success)' }}
                                        >
                                            ✓ Invitation email sent to {inviteForm.email}. You can also share the link below directly.
                                        </div>
                                    ) : inviteEmailReason === 'not_configured' ? (
                                        <div
                                            className="card mb-md"
                                            style={{ borderLeft: '4px solid var(--color-warning)' }}
                                        >
                                            Email sending is not configured on the server{inviteEmailDetail ? ` (${inviteEmailDetail})` : ''}. Share this link with {inviteForm.email} directly:
                                        </div>
                                    ) : (
                                        <div
                                            className="card mb-md"
                                            style={{ backgroundColor: 'var(--color-danger-light)', borderLeft: '4px solid var(--color-danger)' }}
                                        >
                                            Failed to send the invitation email to {inviteForm.email}{inviteEmailDetail ? `: ${inviteEmailDetail}` : ''}. Share this link directly instead:
                                        </div>
                                    )}
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

            {/* Create User Modal */}
            {showCreateUserModal && (
                <div className="modal-overlay" onClick={closeCreateUserModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create User</h2>
                            <button onClick={closeCreateUserModal} className="btn-close">×</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={createUserForm.email}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={createUserForm.firstName}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, firstName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={createUserForm.lastName}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, lastName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Temporary Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={createUserForm.password}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                                        minLength={8}
                                        required
                                    />
                                    <small className="text-muted">User will be required to change this on first login.</small>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={createUserForm.role}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                                    >
                                        <option value="member">Member</option>
                                        <option value="project_owner">Project Owner</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                {error && <div className="form-error">{error}</div>}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={closeCreateUserModal} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
