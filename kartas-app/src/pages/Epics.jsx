import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';


const Epics = () => {
    const { projectId } = useParams();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [epics, setEpics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEpic, setEditingEpic] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planning',
        color: '#0052CC'
    });
    const [error, setError] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    const EPIC_COLORS = [
        { value: '#0052CC', label: 'Blue' },
        { value: '#00875A', label: 'Green' },
        { value: '#FF8B00', label: 'Orange' },
        { value: '#DE350B', label: 'Red' },
        { value: '#6554C0', label: 'Purple' },
        { value: '#00B8D9', label: 'Cyan' },
        { value: '#FF5630', label: 'Bright Red' },
        { value: '#36B37E', label: 'Bright Green' }
    ];

    useEffect(() => {
        fetchProject();
        fetchEpics();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchEpics = async () => {
        try {
            const response = await api.get(`/project/${projectId}/epics`);
            setEpics(response.data);
        } catch (error) {
            console.error('Error fetching epics:', error);
            setError('Failed to load epics');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (epic = null) => {
        if (epic) {
            setEditingEpic(epic);
            setFormData({
                title: epic.title,
                description: epic.description || '',
                startDate: epic.start_date ? epic.start_date.split('T')[0] : '',
                endDate: epic.end_date ? epic.end_date.split('T')[0] : '',
                status: epic.status || 'planning',
                color: epic.color || '#0052CC'
            });
        } else {
            setEditingEpic(null);
            setFormData({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                status: 'planning',
                color: '#0052CC'
            });
        }
        setShowModal(true);
        setError('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEpic(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingEpic) {
                await api.put(`/epics/${editingEpic.id}`, formData);
            } else {
                await api.post(`/project/${projectId}/epics`, formData);
            }
            handleCloseModal();
            fetchEpics();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to save epic');
        }
    };

    const handleDelete = async (epicId) => {
        if (!confirm('Are you sure you want to delete this epic? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/epics/${epicId}`);
            fetchEpics();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete epic');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            planning: 'var(--color-neutral-500)',
            in_progress: 'var(--color-primary)',
            completed: 'var(--color-success)',
            cancelled: 'var(--color-danger)'
        };
        return colors[status] || colors.planning;
    };

    const getStatusLabel = (status) => {
        const labels = {
            planning: 'Planning',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[status] || status;
    };

    if (loading) {
        return <div className="container mt-lg">Loading epics...</div>;
    }

    const visibleEpics = epics.filter(epic =>
        showCompleted || (epic.status !== 'completed' && epic.status !== 'cancelled')
    );

    const myRole = project?.members?.find(m => m.id === user?.id)?.role;
    const canManageEpics = myRole === 'owner' || user?.role === 'admin';

    return (
        <>
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Epics</h2>
                <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                    <label className="flex flex-gap-sm" style={{ alignItems: 'center', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        Show completed epics
                    </label>
                    {canManageEpics && (
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">
                            + Create Epic
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <div className="card mb-md" style={{ backgroundColor: 'var(--color-danger-light)', borderLeft: '4px solid var(--color-danger)' }}>
                    {error}
                </div>
            )}

            {epics.length === 0 ? (
                <div className="card text-center">
                    <h3>No Epics Yet</h3>
                    <p className="text-muted mt-sm">
                        {canManageEpics ? 'Create your first epic to organize your stories' : 'No epics have been created for this project yet'}
                    </p>
                    {canManageEpics && (
                        <button onClick={() => handleOpenModal()} className="btn btn-primary mt-md">
                            Create Epic
                        </button>
                    )}
                </div>
            ) : visibleEpics.length === 0 ? (
                <div className="card text-center">
                    <h3>No Epics to Show</h3>
                    <p className="text-muted mt-sm">All epics are completed or cancelled. Check "Show completed epics" to see them.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: 'var(--spacing-md)'
                }}>
                    {visibleEpics.map((epic) => (
                        <Link
                            key={epic.id}
                            to={`/project/${projectId}/backlog?epic=${epic.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="card" style={{
                                borderLeft: `4px solid ${epic.color || '#0052CC'}`,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                }}
                                onClick={(e) => {
                                    // Allow edit/delete buttons to work
                                    if (e.target.closest('button')) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <div className="card-header">
                                    <div className="flex flex-between" style={{ alignItems: 'start' }}>
                                        <h3 className="card-title" style={{ margin: 0, flex: 1 }}>{epic.title}</h3>
                                        <span className="badge" style={{
                                            backgroundColor: getStatusColor(epic.status),
                                            color: 'white',
                                            marginLeft: '8px'
                                        }}>
                                            {getStatusLabel(epic.status)}
                                        </span>
                                    </div>

                                    {/* Progress Bar — based on completed vs. total stories */}
                                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-neutral-600)',
                                            marginBottom: '4px'
                                        }}>
                                            <span>Progress</span>
                                            <span>{epic.progress_percent ?? 0}%</span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            backgroundColor: 'var(--color-neutral-100)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${epic.progress_percent ?? 0}%`,
                                                height: '100%',
                                                backgroundColor: epic.color || '#0052CC',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                {epic.description && (
                                    <p className="text-muted" style={{
                                        marginTop: 'var(--spacing-sm)',
                                        lineHeight: '1.5'
                                    }}>
                                        {epic.description}
                                    </p>
                                )}

                                <div className="mt-md" style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 'var(--spacing-sm)',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-neutral-600)'
                                }}>
                                    {epic.start_date && (
                                        <div>
                                            <strong>Start:</strong> {new Date(epic.start_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    {epic.end_date && (
                                        <div>
                                            <strong>End:</strong> {new Date(epic.end_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div>
                                        <strong>Stories:</strong> {epic.story_count}
                                    </div>
                                    <div>
                                        <strong>Created by:</strong> {epic.creator_name}
                                    </div>
                                </div>

                                {canManageEpics && (
                                    <div className="flex flex-gap-sm mt-md">
                                        <button
                                            onClick={() => handleOpenModal(epic)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ flex: 1 }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(epic.id)}
                                            className="btn btn-danger btn-sm"
                                            disabled={parseInt(epic.story_count) > 0}
                                            title={parseInt(epic.story_count) > 0 ? 'Cannot delete epic with stories' : 'Delete epic'}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={handleCloseModal}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">{editingEpic ? 'Edit Epic' : 'Create Epic'}</h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="mb-md" style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--color-danger-light)',
                                    borderLeft: '4px solid var(--color-danger)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    rows="4"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="planning">Planning</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Color</label>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                    {EPIC_COLORS.map(colorOption => (
                                        <div
                                            key={colorOption.value}
                                            onClick={() => setFormData({ ...formData, color: colorOption.value })}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: colorOption.value,
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                border: formData.color === colorOption.value ? '3px solid var(--color-neutral-900)' : '2px solid var(--color-border)',
                                                transition: 'transform 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '18px'
                                            }}
                                            title={colorOption.label}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            {formData.color === colorOption.value && '✓'}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingEpic ? 'Update Epic' : 'Create Epic'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Epics;
