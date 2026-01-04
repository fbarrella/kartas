import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_OPTIONS = [
    { value: 'backlog', label: 'Backlog', color: 'var(--color-neutral-400)' },
    { value: 'refining', label: 'Refining', color: 'var(--color-info)' },
    { value: 'ready', label: 'Ready', color: 'var(--color-success)' },
    { value: 'in_development', label: 'In Development', color: 'var(--color-warning)' },
    { value: 'review', label: 'Review', color: 'var(--color-secondary)' },
    { value: 'test', label: 'Test', color: 'var(--color-info)' },
    { value: 'done', label: 'Done', color: 'var(--color-success)' },
    { value: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' }
];

const TYPE_OPTIONS = [
    { value: 'story', label: 'Story', icon: '📖' },
    { value: 'task', label: 'Task', icon: '✓' },
    { value: 'bug', label: 'Bug', icon: '🐛' }
];

const Backlog = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStory, setSelectedStory] = useState(null);
    const [newStory, setNewStory] = useState({
        title: '',
        description: '',
        type: 'story',
        storyPoints: '',
        projectId: parseInt(projectId)
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProject();
        fetchStories();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchStories = async () => {
        try {
            const response = await api.get(`/stories/project/${projectId}`);
            setStories(response.data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/stories', {
                ...newStory,
                storyPoints: newStory.storyPoints ? parseInt(newStory.storyPoints) : null
            });
            setStories([response.data, ...stories]);
            setShowCreateModal(false);
            setNewStory({
                title: '',
                description: '',
                type: 'story',
                storyPoints: '',
                projectId: parseInt(projectId)
            });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create story');
        }
    };

    const handleUpdateStoryStatus = async (storyId, newStatus) => {
        try {
            await api.put(`/stories/${storyId}`, { status: newStatus });
            setStories(stories.map(story =>
                story.id === storyId ? { ...story, status: newStatus } : story
            ));
        } catch (error) {
            console.error('Error updating story:', error);
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
        return statusOption ? statusOption.color : 'var(--color-neutral-400)';
    };

    const getTypeIcon = (type) => {
        const typeOption = TYPE_OPTIONS.find(opt => opt.value === type);
        return typeOption ? typeOption.icon : '📄';
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
                    <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                        <Link to={`/project/${projectId}`} style={{ color: 'white', textDecoration: 'none' }}>
                            ← Back
                        </Link>
                        <h1 style={{ color: 'white', margin: 0 }}>
                            {project?.name} - Backlog
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                    <h2>User Stories</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        + Create Story
                    </button>
                </div>

                {loading ? (
                    <div className="text-center">Loading stories...</div>
                ) : stories.length === 0 ? (
                    <div className="card text-center">
                        <h3>No Stories Yet</h3>
                        <p className="text-muted mt-md">
                            Create your first user story to get started
                        </p>
                    </div>
                ) : (
                    <div className="card">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>ID</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Type</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Title</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Points</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Assignee</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stories.map((story) => (
                                    <tr
                                        key={story.id}
                                        style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSelectedStory(story)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <strong>{story.storyId}</strong>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <span title={story.type}>
                                                {getTypeIcon(story.type)}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            {story.title}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <select
                                                value={story.status}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStoryStatus(story.id, e.target.value);
                                                }}
                                                className="form-select"
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: 'var(--font-size-sm)',
                                                    borderColor: getStatusBadgeClass(story.status)
                                                }}
                                            >
                                                {STATUS_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            {story.storyPoints || '-'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                            {story.assigneeName || 'Unassigned'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Story Modal */}
            {showCreateModal && (
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
                    zIndex: 1000,
                    overflowY: 'auto'
                }} onClick={() => setShowCreateModal(false)}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Create New Story</h3>
                        </div>

                        <form onSubmit={handleCreateStory}>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select
                                    className="form-select"
                                    value={newStory.type}
                                    onChange={(e) => setNewStory({ ...newStory, type: e.target.value })}
                                >
                                    {TYPE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.icon} {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newStory.title}
                                    onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={newStory.description}
                                    onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                                    rows={5}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Story Points</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={newStory.storyPoints}
                                    onChange={(e) => setNewStory({ ...newStory, storyPoints: e.target.value })}
                                    min="0"
                                    placeholder="Optional"
                                />
                            </div>

                            {error && (
                                <div className="form-error mb-md">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Story
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Story Details Modal */}
            {selectedStory && (
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
                    zIndex: 1000,
                    overflowY: 'auto'
                }} onClick={() => setSelectedStory(null)}>
                    <div className="card" style={{ maxWidth: '700px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                <h3 className="card-title">{selectedStory.storyId}</h3>
                                <span>{getTypeIcon(selectedStory.type)} {selectedStory.type}</span>
                            </div>
                        </div>

                        <div>
                            <h4>{selectedStory.title}</h4>

                            {selectedStory.description && (
                                <div className="mt-md">
                                    <strong>Description:</strong>
                                    <p className="mt-sm" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedStory.description}
                                    </p>
                                </div>
                            )}

                            <div className="mt-md" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--spacing-md)'
                            }}>
                                <div>
                                    <strong>Status:</strong>
                                    <p className="mt-xs">
                                        {STATUS_OPTIONS.find(s => s.value === selectedStory.status)?.label}
                                    </p>
                                </div>
                                <div>
                                    <strong>Story Points:</strong>
                                    <p className="mt-xs">{selectedStory.storyPoints || 'Not set'}</p>
                                </div>
                                <div>
                                    <strong>Assignee:</strong>
                                    <p className="mt-xs">{selectedStory.assigneeName || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <strong>Creator:</strong>
                                    <p className="mt-xs">{selectedStory.creatorName || 'Unknown'}</p>
                                </div>
                            </div>

                            <div className="mt-lg flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setSelectedStory(null)}
                                    className="btn btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Backlog;
