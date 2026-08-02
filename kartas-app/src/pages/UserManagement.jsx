import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const USER_ROLE_OPTIONS = ['admin', 'project_owner', 'member'];

const UserManagement = () => {
    const { t } = useTranslation(['users', 'common']);
    const roleLabel = (role) => t(`users:roles.${role}`, role);
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
            setSuccessMessage(t('users:management.inviteGenerated'));
            fetchPendingInvites();
        } catch (error) {
            setError(error.response?.data?.error || t('users:management.inviteGenerateFailed'));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setSuccessMessage(t('users:management.inviteLinkCopied'));
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
            setSuccessMessage(t('users:management.userCreated'));
            closeCreateUserModal();
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:management.userCreateFailed'));
        }
    };

    const closeCreateUserModal = () => {
        setShowCreateUserModal(false);
        setCreateUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'member' });
        setError('');
    };

    const handleCancelInvite = async (inviteId) => {
        if (!window.confirm(t('users:management.confirmCancelInvite'))) return;

        try {
            await api.delete(`/invites/${inviteId}`);
            setSuccessMessage(t('users:management.inviteCancelled'));
            fetchPendingInvites();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:management.inviteCancelFailed'));
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            setSuccessMessage(t('users:management.roleUpdated'));
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:management.roleUpdateFailed'));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm(t('users:management.confirmDeleteUser'))) return;

        try {
            await api.delete(`/users/${userId}`);
            setSuccessMessage(t('users:management.userDeleted'));
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('users:management.userDeleteFailed'));
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
                <Breadcrumb items={[{ label: t('users:management.title') }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        {t('users:backToProjects')}
                    </Link>
                </div>

                <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{t('users:management.title')}</h2>
                    <div className="flex flex-gap-sm">
                        <button
                            onClick={() => setShowCreateUserModal(true)}
                            className="btn btn-secondary"
                        >
                            {t('users:management.createUser')}
                        </button>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn btn-secondary"
                        >
                            {t('users:management.inviteUser')}
                        </button>
                    </div>
                </div>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                    <div className="mb-xl">
                        <h3>{t('users:management.pendingInvites')}</h3>
                        <div className="card">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:email')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:management.role')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:management.invitedBy')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:management.expires')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingInvites.map((invite) => (
                                        <tr key={invite.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>{invite.email}</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <span className="badge badge-info">{roleLabel(invite.role)}</span>
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
                                                    {t('common:cancel')}
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
                    <h3>{t('users:management.activeUsers')}</h3>
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
                        <div className="text-center">{t('users:management.loadingUsers')}</div>
                    ) : users.length === 0 ? (
                        <div className="card text-center">
                            <h3>{t('users:management.noUsersTitle')}</h3>
                            <p className="text-muted mt-md">{t('users:management.noUsersSubtitle')}</p>
                        </div>
                    ) : (
                        <div className="card">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:name')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:email')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:management.role')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:management.joined')}</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:actions')}</th>
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
                                                    <span className={`badge badge-${user.role === 'admin' ? 'danger' : 'info'}`} title={t('users:management.cannotChangeOwnRole')}>
                                                        {roleLabel(user.role)}
                                                    </span>
                                                ) : (
                                                    <select
                                                        className="form-select"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                                                        value={user.role}
                                                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                                    >
                                                        {USER_ROLE_OPTIONS.map(role => (
                                                            <option key={role} value={role}>{roleLabel(role)}</option>
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
                                                        disabled={!currentUser?.twoFactorEnabled}
                                                        title={!currentUser?.twoFactorEnabled ? t('common:twoFactorRequiredTooltip') : undefined}
                                                    >
                                                        {t('common:delete')}
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
                            <h2>{t('users:management.inviteModalTitle')}</h2>
                            <button onClick={closeInviteModal} className="btn-close">×</button>
                        </div>

                        {!inviteLink ? (
                            <form onSubmit={handleGenerateInvite}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">{t('users:management.emailAddress')}</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={inviteForm.email}
                                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('users:management.role')}</label>
                                        <select
                                            className="form-select"
                                            value={inviteForm.role}
                                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        >
                                            <option value="member">{roleLabel('member')}</option>
                                            <option value="project_owner">{roleLabel('project_owner')}</option>
                                            <option value="admin">{roleLabel('admin')}</option>
                                        </select>
                                    </div>

                                    {error && <div className="form-error">{error}</div>}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" onClick={closeInviteModal} className="btn btn-secondary">
                                        {t('common:cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {t('users:management.generateInvite')}
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
                                            {t('users:management.inviteEmailSent', { email: inviteForm.email })}
                                        </div>
                                    ) : inviteEmailReason === 'not_configured' ? (
                                        <div
                                            className="card mb-md"
                                            style={{ borderLeft: '4px solid var(--color-warning)' }}
                                        >
                                            {t('users:management.emailNotConfigured', {
                                                email: inviteForm.email,
                                                detail: inviteEmailDetail ? ` (${inviteEmailDetail})` : ''
                                            })}
                                        </div>
                                    ) : (
                                        <div
                                            className="card mb-md"
                                            style={{ backgroundColor: 'var(--color-danger-light)', borderLeft: '4px solid var(--color-danger)' }}
                                        >
                                            {t('users:management.emailSendFailed', {
                                                email: inviteForm.email,
                                                detail: inviteEmailDetail ? `: ${inviteEmailDetail}` : ''
                                            })}
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">{t('users:management.inviteLink')}</label>
                                        <div className="flex flex-gap-sm">
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={inviteLink}
                                                readOnly
                                                style={{ flex: 1 }}
                                            />
                                            <button onClick={copyToClipboard} className="btn btn-secondary">
                                                {t('users:management.copy')}
                                            </button>
                                        </div>
                                    </div>

                                    {successMessage && (
                                        <div className="alert alert-success" style={{ color: 'var(--color-success)', marginTop: '8px' }}>{successMessage}</div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button onClick={closeInviteModal} className="btn btn-primary">
                                        {t('users:management.done')}
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
                            <h2>{t('users:management.createUserModalTitle')}</h2>
                            <button onClick={closeCreateUserModal} className="btn-close">×</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">{t('users:management.emailAddress')}</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={createUserForm.email}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('users:fields.firstName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={createUserForm.firstName}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, firstName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('users:fields.lastName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={createUserForm.lastName}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, lastName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('users:management.temporaryPassword')}</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={createUserForm.password}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                                        minLength={8}
                                        required
                                    />
                                    <small className="text-muted">{t('users:management.temporaryPasswordHelp')}</small>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('users:management.role')}</label>
                                    <select
                                        className="form-select"
                                        value={createUserForm.role}
                                        onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                                    >
                                        <option value="member">{roleLabel('member')}</option>
                                        <option value="project_owner">{roleLabel('project_owner')}</option>
                                        <option value="admin">{roleLabel('admin')}</option>
                                    </select>
                                </div>

                                {error && <div className="form-error">{error}</div>}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={closeCreateUserModal} className="btn btn-secondary">
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('users:management.createUserButton')}
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
