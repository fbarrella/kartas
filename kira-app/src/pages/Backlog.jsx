import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
    const [searchParams] = useSearchParams();
    const sprintIdFromUrl = searchParams.get('sprint');

    const [project, setProject] = useState(null);
    const [stories, setStories] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStory, setSelectedStory] = useState(null);
    const [selectedStories, setSelectedStories] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState('');
    const [addingToSprint, setAddingToSprint] = useState(false);
    const [newStory, setNewStory] = useState({
        title: '',
        description: '',
        type: 'story',
        storyPoints: '',
        projectId: parseInt(projectId)
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchProject();
        fetchStories();
        fetchSprints();
    }, [projectId]);

    useEffect(() => {
        if (sprintIdFromUrl) {
            setSelectedSprint(sprintIdFromUrl);
        }
    }, [sprintIdFromUrl]);

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

    const fetchSprints = async () => {
        try {
            const response = await api.get(`/sprints/project/${projectId}`);
            setSprints(response.data.filter(s => s.status !== 'completed'));
        } catch (error) {
            console.error('Error fetching sprints:', error);
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

    const handleToggleStory = (storyId) => {
        setSelectedStories(prev =>
            prev.includes(storyId)
                ? prev.filter(id => id !== storyId)
                : [...prev, storyId]
        );
    };

    const handleToggleAll = () => {
        if (selectedStories.length === stories.length) {
            setSelectedStories([]);
        } else {
            setSelectedStories(stories.map(s => s.id));
        }
    };

    const handleAddToSprint = async () => {
        if (!selectedSprint || selectedStories.length === 0) return;

        setAddingToSprint(true);
        setError('');
        setSuccessMessage('');

        try {
            await api.post(`/sprints/${selectedSprint}/stories`, {
                storyIds: selectedStories
            });
            setSuccessMessage(`Successfully added ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'} to sprint`);
            setSelectedStories([]);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add stories to sprint');
        } finally {
            setAddingToSprint(false);
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

                {/* Sprint Assignment Toolbar */}
                {selectedStories.length > 0 && (
                    <div className="card mb-md" style={{ backgroundColor: 'var(--color-info-light)', borderLeft: '4px solid var(--color-info)' }}>
                        <div className="flex flex-between" style={{ alignItems: 'center' }}>
                            <div>
                                <strong>{selectedStories.length}</strong> {selectedStories.length === 1 ? 'story' : 'stories'} selected
                            </div>
                            <div className="flex flex-gap-sm" style={{ alignItems: 'center' }}>
                                <select
                                    className="form-select"
                                    value={selectedSprint}
                                    onChange={(e) => setSelectedSprint(e.target.value)}
                                    disabled={addingToSprint}
                                >
                                    <option value="">Select Sprint...</option>
                                    {sprints.map(sprint => (
                                        <option key={sprint.id} value={sprint.id}>
                                            {sprint.name} ({sprint.status})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddToSprint}
                                    disabled={!selectedSprint || addingToSprint}
                                    className="btn btn-primary btn-sm"
                                >
                                    {addingToSprint ? 'Adding...' : 'Add to Sprint'}
                                </button>
                                <button
                                    onClick={() => setSelectedStories([])}
                                    className="btn btn-secondary btn-sm"
                                    disabled={addingToSprint}
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="card mb-md" style={{ backgroundColor: 'var(--color-success-light)', borderLeft: '4px solid var(--color-success)' }}>
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="form-error mb-md">{error}</div>
                )}

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
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStories.length === stories.length && stories.length > 0}
                                            onChange={handleToggleAll}
                                        />
                                    </th>
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
                                            backgroundColor: selectedStories.includes(story.id) ? 'var(--color-neutral-100)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!selectedStories.includes(story.id)) {
                                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!selectedStories.includes(story.id)) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedStories.includes(story.id)}
                                                onChange={() => handleToggleStory(story.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStory(story)}
                                        >
                                            <strong>{story.storyId}</strong>
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStory(story)}
                                        >
                                            <span title={story.type}>
                                                {getTypeIcon(story.type)}
                                            </span>
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStory(story)}
                                        >
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
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStory(story)}
                                        >
                                            {story.storyPoints || '-'}
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStory(story)}
                                        >
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
