import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import SubItemEditModal, { SUBITEM_TYPE_OPTIONS, SUBITEM_STATUS_OPTIONS } from '../components/SubItemEditModal';
import CloneStoryModal from '../components/CloneStoryModal';
import Breadcrumb from '../components/Breadcrumb';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AssigneeAvatarWithHoverCard from '../components/AssigneeAvatarWithHoverCard';
import MentionTextarea from '../components/MentionTextarea';
import { useAuth } from '../contexts/AuthContext';
import { renderCommentContent } from '../utils/mentions.jsx';
import { formatRelativeTime, describeHistoryEntry } from '../utils/activity';
import '../components/navigation.css';


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
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

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
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [otherProjects, setOtherProjects] = useState([]);
    const [showMigrateModal, setShowMigrateModal] = useState(false);
    const [migrateTargetId, setMigrateTargetId] = useState('');
    const [migrating, setMigrating] = useState(false);
    const [migrateError, setMigrateError] = useState('');
    const [editingSubItem, setEditingSubItem] = useState(null); // null = create mode
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [historyItems, setHistoryItems] = useState([]);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const HISTORY_PAGE_SIZE = 10;

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
        fetchHistory(0);
        fetchOtherProjects();
    }, [projectId, storyId]);

    // FY-04's "Latest Activities" widget links directly to a comment
    // (#comment-{id}). Native browser anchor-scrolling doesn't reliably fire
    // here since comments render asynchronously after fetchStory() resolves —
    // by the time the hash target exists in the DOM, the initial navigation's
    // scroll attempt has already happened (or never found the element).
    useEffect(() => {
        if (!story || !window.location.hash.startsWith('#comment-')) return;
        const el = document.querySelector(window.location.hash);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = 'var(--color-info-light)';
        const timeout = setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
        return () => clearTimeout(timeout);
    }, [story]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    // MIG-02: needed to populate the "migrate to another project" target
    // picker and to gate whether the migrate action is shown at all.
    const fetchOtherProjects = async () => {
        try {
            const response = await api.get('/projects');
            setOtherProjects(response.data.filter(p => p.id !== parseInt(projectId)));
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const handleMigrate = async () => {
        if (!migrateTargetId) return;
        setMigrating(true);
        setMigrateError('');
        try {
            const response = await api.post(`/stories/${storyId}/migrate`, {
                targetProjectId: parseInt(migrateTargetId)
            });
            // Navigating here only changes this route's params (same route
            // element), so React Router does NOT unmount/remount this
            // component — this component's own state (the modal, `migrating`)
            // would otherwise survive the navigation and get stuck. Reset it
            // explicitly before navigating rather than relying on a remount.
            setShowMigrateModal(false);
            setMigrating(false);
            setMigrateTargetId('');
            // The response's `storyId` is the new human-readable code — the
            // route itself needs the unchanged numeric `id` instead.
            navigate(`/project/${response.data.projectId}/story/${response.data.id}`);
        } catch (error) {
            setMigrateError(error.response?.data?.error || 'Failed to migrate story');
            setMigrating(false);
        }
    };

    const fetchStory = async () => {
        try {
            const response = await api.get(`/stories/${storyId}`);
            setStory(response.data);

            const editSubItemId = searchParams.get('editSubItem');
            if (editSubItemId) {
                const item = response.data.subTasks?.find(st => st.id === parseInt(editSubItemId));
                if (item) {
                    setEditingSubItem(item);
                    setShowSubItemModal(true);
                }
                searchParams.delete('editSubItem');
                setSearchParams(searchParams, { replace: true });
            }

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

    const fetchHistory = async (offset) => {
        try {
            const response = await api.get(`/stories/${storyId}/history?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`);
            setHistoryItems(prev => offset === 0 ? response.data.items : [...prev, ...response.data.items]);
            setHistoryHasMore(response.data.hasMore);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        try {
            await api.post(`/stories/${storyId}/comments`, { content: newComment.trim() });
            setNewComment('');
            await fetchStory();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to post comment');
        }
    };

    const openEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditCommentText(comment.content);
    };

    const handleSaveCommentEdit = async (commentId) => {
        try {
            await api.put(`/stories/${storyId}/comments/${commentId}`, { content: editCommentText.trim() });
            setEditingCommentId(null);
            setEditCommentText('');
            await fetchStory();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await api.delete(`/stories/${storyId}/comments/${commentId}`);
            await fetchStory();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete comment');
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCancelDescriptionEdit = () => {
        handleChange('description', story?.description || '');
        setIsEditingDescription(false);
    };

    const handleSaveDescription = async () => {
        await handleSave();
        setIsEditingDescription(false);
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

    // MIG-02: "migrate to another project" is only offered to an owner/admin
    // of THIS project who actually has somewhere else to migrate the story to.
    const myRole = project?.members?.find(m => m.id === user?.id)?.role;
    const canMigrate = (myRole === 'owner' || user?.role === 'admin') && otherProjects.length > 0;

    return (
        <>
            <Breadcrumb items={[
                { label: 'Projects', to: '/' },
                { label: project?.name || 'Project', to: `/project/${projectId}/backlog` },
                { label: story.storyId, to: `/project/${projectId}/backlog` },
                { label: 'Edit Story' },
            ]} />

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
                        onClick={() => setShowCloneModal(true)}
                        className="btn btn-secondary"
                    >
                        Clone
                    </button>
                    {canMigrate && (
                        <button
                            onClick={() => setShowMigrateModal(true)}
                            className="btn btn-secondary"
                        >
                            Migrate to another project
                        </button>
                    )}
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

                {/* Compact fields row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-md)',
                    paddingBottom: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Story Points</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.points}
                            onChange={(e) => handleChange('points', e.target.value)}
                            min="0"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Blocked</label>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={formData.isBlocked}
                                onChange={(e) => handleChange('isBlocked', e.target.checked)}
                            />
                            <span className="switch-track">
                                <span className="switch-thumb" />
                            </span>
                            <span className="switch-text">{formData.isBlocked ? 'Blocked' : 'Not blocked'}</span>
                        </label>
                    </div>
                </div>

                {/* Sprints */}
                <div className="form-group" style={{
                    paddingBottom: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
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

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <div className="flex flex-between mb-sm" style={{ alignItems: 'center' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Description</label>
                        {!isEditingDescription && (
                            <button
                                type="button"
                                onClick={() => setIsEditingDescription(true)}
                                className="btn btn-secondary btn-sm"
                            >
                                Edit Description
                            </button>
                        )}
                    </div>

                    <div style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)'
                    }}>
                        {isEditingDescription ? (
                            <>
                                <MarkdownEditor
                                    value={formData.description}
                                    onChange={(v) => handleChange('description', v)}
                                    rows={12}
                                />
                                <div className="flex flex-gap-sm mt-sm" style={{ justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={handleCancelDescriptionEdit}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDescription}
                                        disabled={saving}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </>
                        ) : formData.description ? (
                            <MarkdownRenderer content={formData.description} />
                        ) : (
                            <div className="text-small text-muted">No description yet</div>
                        )}
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
                                    <AssigneeAvatarWithHoverCard
                                        assigneeId={item.assigneeId}
                                        assigneeName={item.assigneeName}
                                        assigneeRole={item.assigneeRole}
                                        assigneeEmail={item.assigneeEmail}
                                        projectId={projectId}
                                    />
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

            {/* Comments Section */}
            <div className="card mt-md">
                <div className="card-header">
                    <h3 className="card-title">Comments</h3>
                </div>

                {story.comments && story.comments.length > 0 ? (
                    story.comments.map(comment => (
                        <div
                            key={comment.id}
                            id={`comment-${comment.id}`}
                            className="flex flex-gap-sm mb-md"
                            style={{ alignItems: 'flex-start' }}
                        >
                            <AssigneeAvatarWithHoverCard
                                assigneeId={comment.userId}
                                assigneeName={comment.userName}
                                assigneeRole={comment.userRole}
                                assigneeEmail={comment.userEmail}
                                projectId={projectId}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{comment.userName}</span>
                                    <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                                        {formatRelativeTime(comment.updatedAt)}
                                        {comment.updatedAt !== comment.createdAt && ' (edited)'}
                                    </span>
                                </div>

                                {editingCommentId === comment.id ? (
                                    <div className="mt-xs">
                                        <MentionTextarea
                                            value={editCommentText}
                                            onChange={setEditCommentText}
                                            projectId={projectId}
                                            rows={2}
                                        />
                                        <div className="flex flex-gap-sm mt-xs">
                                            <button onClick={() => handleSaveCommentEdit(comment.id)} className="btn btn-primary btn-sm">
                                                Save
                                            </button>
                                            <button onClick={() => setEditingCommentId(null)} className="btn btn-secondary btn-sm">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-xs" style={{ whiteSpace: 'pre-wrap' }}>
                                            {renderCommentContent(comment.content, comment.mentions?.users, comment.mentions?.tickets, projectId)}
                                        </div>
                                        {(comment.userId === user?.id || user?.role === 'admin') && (
                                            <div className="flex flex-gap-sm mt-xs">
                                                {comment.userId === user?.id && (
                                                    <button onClick={() => openEditComment(comment)} className="btn btn-secondary btn-sm">
                                                        Edit
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteComment(comment.id)} className="btn btn-danger btn-sm">
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-small text-muted mb-md">No comments yet</div>
                )}

                <div className="mt-md" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                    <MentionTextarea
                        value={newComment}
                        onChange={setNewComment}
                        projectId={projectId}
                        placeholder="Write a comment... use @ to mention a person or ticket"
                        rows={2}
                    />
                    <button
                        onClick={handlePostComment}
                        disabled={!newComment.trim()}
                        className="btn btn-primary btn-sm mt-sm"
                    >
                        Post Comment
                    </button>
                </div>
            </div>

            {/* History Section */}
            <div className="card mt-md">
                <div className="card-header">
                    <h3 className="card-title">History</h3>
                </div>

                {historyItems.length > 0 ? (
                    historyItems.map(item => (
                        <div
                            key={item.id}
                            className="flex flex-between mb-sm"
                            style={{
                                padding: 'var(--spacing-sm) 0',
                                borderBottom: '1px solid var(--color-border)',
                                alignItems: 'center'
                            }}
                        >
                            <span>{describeHistoryEntry(item)}</span>
                            <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', flexShrink: 0, marginLeft: 'var(--spacing-md)' }}>
                                {formatRelativeTime(item.changedAt)}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-small text-muted">No history yet</div>
                )}

                {historyHasMore && (
                    <button
                        onClick={() => fetchHistory(historyItems.length)}
                        className="btn btn-secondary btn-sm mt-sm"
                    >
                        Load more
                    </button>
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

            {showCloneModal && (
                <CloneStoryModal
                    story={story}
                    onClose={() => setShowCloneModal(false)}
                    onCloned={() => navigate(`/project/${projectId}/backlog`)}
                />
            )}

            {showMigrateModal && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}
                    onClick={() => !migrating && setShowMigrateModal(false)}
                >
                    <div
                        className="card"
                        style={{ maxWidth: '500px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="card-header">
                            <h3 className="card-title">Migrate to Another Project</h3>
                        </div>
                        <p>
                            Move <strong>{story.storyId}</strong> to a different project's backlog.
                        </p>
                        <div className="form-group mt-md">
                            <label className="form-label">Target project</label>
                            <select
                                className="form-select"
                                value={migrateTargetId}
                                onChange={(e) => setMigrateTargetId(e.target.value)}
                            >
                                <option value="">Select a project...</option>
                                {otherProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-error mt-md">
                            <strong>Warning:</strong> This will clear the story's epic assignment and remove it from any sprint. Sub-tasks, comments, and history will move with it.
                        </div>
                        {migrateError && (
                            <div className="form-error mt-md">{migrateError}</div>
                        )}
                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowMigrateModal(false)}
                                disabled={migrating}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMigrate}
                                disabled={!migrateTargetId || migrating}
                                className="btn btn-primary"
                            >
                                {migrating ? 'Migrating...' : 'Migrate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StoryDetail;
