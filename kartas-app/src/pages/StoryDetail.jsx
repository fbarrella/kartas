import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SubItemEditModal, { SUBITEM_TYPE_OPTIONS, SUBITEM_STATUS_OPTIONS } from '../components/SubItemEditModal';


const STATUS_OPTIONS = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'refining', label: 'Refining' },
    { value: 'ready', label: 'Ready' },
    { value: 'in_development', label: 'In Development' },
    { value: 'review', label: 'Review' },
    { value: 'test', label: 'Test' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' }
];

const TYPE_OPTIONS = [
    { value: 'story', label: 'Story', icon: '📖' },
    { value: 'task', label: 'Task', icon: '✓' },
    { value: 'bug', label: 'Bug', icon: '🐛' }
];

const StoryDetail = () => {
    const { projectId, storyId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [story, setStory] = useState(null);
    const [members, setMembers] = useState([]);
    const [epics, setEpics] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showSubItemModal, setShowSubItemModal] = useState(false);
    const [editingSubItem, setEditingSubItem] = useState(null); // null = create mode

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'story',
        status: 'backlog',
        points: '',
        assigneeId: null,
        epicId: null,
        isBlocked: false
    });

    useEffect(() => {
        fetchProject();
        fetchStory();
        fetchMembers();
        fetchEpics();
        fetchSprints();
    }, [projectId, storyId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchStory = async () => {
        try {
            const response = await api.get(`/stories/${storyId}`);
            setStory(response.data);
            setFormData({
                title: response.data.title || '',
                description: response.data.description || '',
                type: response.data.type || 'story',
                status: response.data.status || 'backlog',
                points: response.data.storyPoints || '',
                assigneeId: response.data.assigneeId || null,
                epicId: response.data.epicId || null,
                isBlocked: response.data.isBlocked || false
            });
        } catch (error) {
            console.error('Error fetching story:', error);
            setError('Failed to load story');
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const response = await api.get(`/projects/${projectId}/members`);
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const fetchEpics = async () => {
        try {
            const response = await api.get(`/project/${projectId}/epics`);
            setEpics(response.data);
        } catch (error) {
            console.error('Error fetching epics:', error);
        }
    };

    const fetchSprints = async () => {
        try {
            const response = await api.get(`/sprints/project/${projectId}`);
            setSprints(response.data.filter(s => s.status !== 'completed'));
        } catch (error) {
            console.error('Error fetching sprints:', error);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            await api.put(`/stories/${storyId}`, {
                ...formData,
                storyPoints: formData.points ? parseInt(formData.points) : null,
                assigneeId: formData.assigneeId || null,
                epicId: formData.epicId || null
            });

            // Refresh story data to get updated sprint info
            await fetchStory();
            setSuccessMessage('Story updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update story');
        } finally {
            setSaving(false);
        }
    };

    const handleAddToSprint = async (sprintId) => {
        try {
            await api.post(`/sprints/${sprintId}/stories`, {
                storyIds: [parseInt(storyId)]
            });
            await fetchStory();
            setSuccessMessage('Story added to sprint!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add story to sprint');
        }
    };

    const handleRemoveFromSprint = async (sprintId) => {
        try {
            await api.delete(`/sprints/${sprintId}/stories/${storyId}`);
            await fetchStory();
            setSuccessMessage('Story removed from sprint!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to remove story from sprint');
        }
    };

    const openCreateSubItem = () => {
        setEditingSubItem(null);
        setShowSubItemModal(true);
    };

    const openEditSubItem = (item) => {
        setEditingSubItem(item);
        setShowSubItemModal(true);
    };

    const handleDeleteSubItem = async (id) => {
        if (!confirm('Delete this sub-item?')) return;
        try {
            await api.delete(`/sub-tasks/${id}`);
            await fetchStory();
        } catch (error) {
            console.error('Error deleting sub-item:', error);
        }
    };

    if (loading) {
        return (
            <div className="text-center">Loading story...</div>
        );
    }

    if (!story) {
        return (
            <div className="card text-center">
                <h3>Story Not Found</h3>
                <button onClick={() => navigate(`/project/${projectId}/backlog`)} className="btn btn-primary mt-md">
                    Back to Backlog
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Breadcrumb */}
            <div className="mb-md">
                <button
                    onClick={() => navigate(`/project/${projectId}/backlog`)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                >
                    ← Back to Backlog
                </button>
            </div>

            {/* Page Title */}
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>
                    {TYPE_OPTIONS.find(t => t.value === story.type)?.icon || ''} {story.storyId}
                    {story.isBlocked && (
                        <span className="badge badge-danger" style={{ marginLeft: 'var(--spacing-sm)', fontSize: '10px', padding: '2px 6px', verticalAlign: 'middle' }}>
                            🚫 Blocked
                        </span>
                    )}
                </h2>
                <div className="flex" style={{ gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Messages */}
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

            {/* Story Details Card */}
            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                    {/* Left Column */}
                    <div>
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows="6"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                                className="form-select"
                                value={formData.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                            >
                                {TYPE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.icon} {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                {STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label flex flex-gap-sm" style={{ alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isBlocked}
                                    onChange={(e) => handleChange('isBlocked', e.target.checked)}
                                />
                                Blocked
                            </label>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        <div className="form-group">
                            <label className="form-label">Story Points</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.points}
                                onChange={(e) => handleChange('points', e.target.value)}
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Assignee</label>
                            <select
                                className="form-select"
                                value={formData.assigneeId || ''}
                                onChange={(e) => handleChange('assigneeId', e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">Unassigned</option>
                                {members.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.firstName} {member.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Epic</label>
                            <select
                                className="form-select"
                                value={formData.epicId || ''}
                                onChange={(e) => handleChange('epicId', e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">No Epic</option>
                                {epics.map(epic => (
                                    <option key={epic.id} value={epic.id}>
                                        {epic.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Sprints</label>
                            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                {story.sprints && story.sprints.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                                        {story.sprints.map(sprint => (
                                            <div
                                                key={sprint.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-xs)',
                                                    padding: '4px 8px',
                                                    backgroundColor: sprint.status === 'active' ? 'var(--color-success-light)' : 'var(--color-neutral-100)',
                                                    border: `1px solid ${sprint.status === 'active' ? 'var(--color-success)' : 'var(--color-border)'}`,
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            >
                                                <span>{sprint.name}</span>
                                                <button
                                                    onClick={() => handleRemoveFromSprint(sprint.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '0',
                                                        color: 'var(--color-danger)',
                                                        fontSize: '14px',
                                                        lineHeight: '1'
                                                    }}
                                                    title="Remove from sprint"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-small text-muted">Not in any sprint</div>
                                )}
                            </div>
                            <select
                                className="form-select"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAddToSprint(parseInt(e.target.value));
                                        e.target.value = '';
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="">Add to sprint...</option>
                                {sprints.filter(s => !story.sprints?.find(ss => ss.id === s.id)).map(sprint => (
                                    <option key={sprint.id} value={sprint.id}>
                                        {sprint.name} ({sprint.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-items Section */}
            <div className="card mt-md">
                <div className="card-header flex flex-between" style={{ alignItems: 'center' }}>
                    <h3 className="card-title">Sub-items</h3>
                    <button onClick={openCreateSubItem} className="btn btn-primary btn-sm">
                        + Add Sub-item
                    </button>
                </div>

                {story.subTasks && story.subTasks.length > 0 ? (
                    story.subTasks.map(item => {
                        const typeOpt = SUBITEM_TYPE_OPTIONS.find(t => t.value === item.type);
                        const statusOpt = SUBITEM_STATUS_OPTIONS.find(s => s.value === item.status);
                        return (
                            <div key={item.id} className="flex flex-between mb-sm" style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--color-background)',
                                borderRadius: 'var(--radius-sm)',
                                alignItems: 'center'
                            }}>
                                <div className="flex flex-gap-sm" style={{ alignItems: 'center', flex: 1 }}>
                                    <span title={item.type}>{typeOpt?.icon}</span>
                                    <span>{item.title}</span>
                                    <span className="badge" style={{
                                        fontSize: '10px', padding: '2px 6px',
                                        backgroundColor: statusOpt?.color, color: 'white'
                                    }}>
                                        {statusOpt?.label}
                                    </span>
                                    {item.storyPoints != null && (
                                        <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                            {item.storyPoints}
                                        </span>
                                    )}
                                    <span className="text-small text-muted">
                                        {item.assigneeName ? `@${item.assigneeName.split(' ')[0]}` : 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex flex-gap-xs">
                                    <button onClick={() => openEditSubItem(item)} className="btn btn-secondary btn-sm">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDeleteSubItem(item.id)} className="btn btn-danger btn-sm">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-small text-muted">No sub-items yet</div>
                )}
            </div>

            {showSubItemModal && (
                <SubItemEditModal
                    mode={editingSubItem ? 'edit' : 'create'}
                    storyId={storyId}
                    subItem={editingSubItem}
                    members={members}
                    onClose={() => setShowSubItemModal(false)}
                    onSaved={fetchStory}
                />
            )}
        </>
    );
};

export default StoryDetail;
