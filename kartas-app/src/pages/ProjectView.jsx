import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import UserSelect from '../components/UserSelect';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';


const ProjectView = () => {
    const { t } = useTranslation(['project', 'common']);
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [addMemberForm, setAddMemberForm] = useState({ userId: null, email: '', role: 'member' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setError('');

        if (!addMemberForm.userId && !addMemberForm.email) {
            setError(t('project:teamMembers.modal.pleaseSelectUser'));
            return;
        }

        try {
            await api.post(`/projects/${projectId}/members`, addMemberForm);
            setShowAddMemberModal(false);
            setAddMemberForm({ userId: null, email: '', role: 'member' });
            fetchProject();
        } catch (error) {
            setError(error.response?.data?.error || t('project:teamMembers.modal.failedToAdd'));
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm(t('project:teamMembers.confirmRemove'))) return;
        try {
            await api.delete(`/projects/${projectId}/members/${userId}`);
            fetchProject();
        } catch (error) {
            console.error('Error removing member:', error);
            alert(error.response?.data?.error || t('project:teamMembers.failedToRemove'));
        }
    };

    if (loading) {
        return <div className="container mt-lg">{t('common:loading')}</div>;
    }

    if (!project) {
        return (
            <div className="container mt-lg">
                <div className="card">
                    <h2>{t('project:teamMembers.notFound.title')}</h2>
                    <Link to="/" className="btn btn-primary mt-md">
                        {t('project:teamMembers.notFound.backToDashboard')}
                    </Link>
                </div>
            </div>
        );
    }

    const myRole = project.members?.find(m => m.id === user?.id)?.role;
    const canManageMembers = myRole === 'owner' || user?.role === 'admin';

    return (
        <>
            <Breadcrumb items={[
                { label: t('project:breadcrumb.projects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('project:breadcrumb.teamMembers') },
            ]} />
            {/* Page Title and Actions */}
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{t('project:teamMembers.title')}</h2>
                {canManageMembers && (
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="btn btn-primary"
                    >
                        {t('project:teamMembers.addMember')}
                    </button>
                )}
            </div>

            {/* Team Members Card */}
            <div className="card">
                <div className="mb-md">
                    <p><strong>{project.members?.length || 0}</strong> {t('project:teamMembers.membersLabel')}</p>
                </div>

                <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:name')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:email')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('project:teamMembers.role')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('project:teamMembers.joined')}</th>
                                {canManageMembers && (
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:actions')}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {project.members?.map((member) => (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <Link
                                            to={`/project/${projectId}/user/${member.id}`}
                                            style={{ color: 'var(--color-text)', textDecoration: 'none' }}
                                        >
                                            {member.firstName} {member.lastName}
                                        </Link>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>{member.email}</td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <span className={`badge badge-${member.role === 'owner' ? 'primary' : 'neutral'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {new Date(member.joinedAt).toLocaleDateString()}
                                    </td>
                                    {canManageMembers && (
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            {member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="btn btn-danger btn-sm"
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                >
                                                    {t('project:teamMembers.remove')}
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{t('project:teamMembers.modal.title')}</h2>
                            <button onClick={() => setShowAddMemberModal(false)} className="btn-close">×</button>
                        </div>
                        <form onSubmit={handleAddMember}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <UserSelect
                                        label={t('project:teamMembers.modal.searchUser')}
                                        onSelect={(user) => setAddMemberForm({ ...addMemberForm, userId: user.id, email: user.email })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('project:teamMembers.role')}</label>
                                    <select
                                        className="form-select"
                                        value={addMemberForm.role}
                                        onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                                    >
                                        <option value="member">{t('project:teamMembers.modal.member')}</option>
                                        <option value="owner">{t('project:teamMembers.modal.projectOwner')}</option>
                                    </select>
                                </div>
                                {error && <div className="form-error">{error}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn-secondary">
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('project:teamMembers.modal.addMember')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectView;

