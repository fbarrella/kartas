import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import UserSelect from '../components/UserSelect';


const ProjectView = () => {
    const { projectId } = useParams();
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
            setError('Please select a user');
            return;
        }

        try {
            await api.post(`/projects/${projectId}/members`, addMemberForm);
            setShowAddMemberModal(false);
            setAddMemberForm({ userId: null, email: '', role: 'member' });
            fetchProject();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.delete(`/projects/${projectId}/members/${userId}`);
            fetchProject();
        } catch (error) {
            console.error('Error removing member:', error);
            alert(error.response?.data?.error || 'Failed to remove member');
        }
    };

    if (loading) {
        return <div className="container mt-lg">Loading...</div>;
    }

    if (!project) {
        return (
            <div className="container mt-lg">
                <div className="card">
                    <h2>Project Not Found</h2>
                    <Link to="/" className="btn btn-primary mt-md">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Page Title and Actions */}
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Team Members</h2>
                <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="btn btn-primary"
                >
                    + Add Member
                </button>
            </div>

            {/* Team Members Card */}
            <div className="card">
                <div className="mb-md">
                    <p><strong>{project.members?.length || 0}</strong> Members</p>
                </div>

                <div className="overflow-x-auto">
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
                            {project.members?.map((member) => (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {member.firstName} {member.lastName}
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
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="btn btn-danger btn-sm"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </td>
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
                            <h2>Add Team Member</h2>
                            <button onClick={() => setShowAddMemberModal(false)} className="btn-close">×</button>
                        </div>
                        <form onSubmit={handleAddMember}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <UserSelect
                                        label="Search User"
                                        onSelect={(user) => setAddMemberForm({ ...addMemberForm, userId: user.id, email: user.email })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={addMemberForm.role}
                                        onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                                    >
                                        <option value="member">Member</option>
                                        <option value="owner">Project Owner</option>
                                    </select>
                                </div>
                                {error && <div className="form-error">{error}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Member
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

