import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';


// Sprint with Metrics Component
const SprintWithMetrics = ({ sprint, projectId, onEnd, navigate }) => {
    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, [sprint.id]);

    const fetchMetrics = async () => {
        try {
            const response = await api.get(`/kanban/sprints/${sprint.id}/metrics`);
            setMetrics(response.data);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoadingMetrics(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { class: 'badge-success', label: 'Active' },
            planned: { class: 'badge-neutral', label: 'Planned' },
            completed: { class: 'badge-primary', label: 'Completed' }
        };
        return badges[status] || badges.planned;
    };

    return (
        <div className="card mb-lg" style={{ borderLeft: '4px solid var(--color-success)' }}>
            <div className="flex flex-between mb-sm">
                <div>
                    <h3 style={{ margin: 0 }}>{sprint.name}</h3>
                    <span className={`badge ${getStatusBadge(sprint.status).class} mt-xs`}>
                        {getStatusBadge(sprint.status).label}
                    </span>
                </div>
                <div className="flex flex-gap-sm">
                    <button
                        onClick={() => navigate(`/project/${projectId}/kanban`)}
                        className="btn btn-primary"
                    >
                        View Kanban
                    </button>
                    <button
                        onClick={onEnd}
                        className="btn btn-secondary"
                    >
                        End Sprint
                    </button>
                </div>
            </div>

            {sprint.objective && (
                <p className="text-muted mt-sm">{sprint.objective}</p>
            )}

            <div className="mt-md" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                <div>
                    <strong>Stories:</strong> {sprint.storyCount}
                </div>
                <div>
                    <strong>Points:</strong> {sprint.totalPoints}
                </div>
                <div>
                    <strong>Start:</strong> {new Date(sprint.startDate).toLocaleDateString()}
                </div>
                <div>
                    <strong>End:</strong> {new Date(sprint.endDate).toLocaleDateString()}
                </div>
            </div>

            {/* Timeline Progress Bar */}
            {(() => {
                const start = new Date(sprint.startDate);
                const end = new Date(sprint.endDate);
                const today = new Date();
                const total = end - start;
                const elapsed = today - start;
                const progressPercent = Math.min(Math.max((elapsed / total) * 100, 0), 100);

                return (
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-neutral-600)',
                            marginBottom: '4px'
                        }}>
                            <span>Elapsed Time</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            backgroundColor: 'var(--color-neutral-100)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progressPercent}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-success)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                );
            })()}

            {/* Metrics Section */}
            {loadingMetrics ? (
                <div className="mt-lg text-center text-muted">Loading metrics...</div>
            ) : metrics ? (
                <div className="mt-lg" style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <h4 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Sprint Metrics</h4>

                    {/* Progress Overview */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        {/* Story Completion */}
                        <div>
                            <div className="flex flex-between mb-xs">
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    Story Completion
                                </span>
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                                    {metrics.completionRate}%
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                backgroundColor: 'var(--color-neutral-200)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${metrics.completionRate}%`,
                                    backgroundColor: 'var(--color-primary)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                                {metrics.completedStories} of {metrics.totalStories} stories
                            </div>
                        </div>

                        {/* Story Points */}
                        <div>
                            <div className="flex flex-between mb-xs">
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    Story Points
                                </span>
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                                    {metrics.totalPoints > 0 ? Math.round((metrics.completedPoints / metrics.totalPoints) * 100) : 0}%
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                backgroundColor: 'var(--color-neutral-200)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${metrics.totalPoints > 0 ? (metrics.completedPoints / metrics.totalPoints) * 100 : 0}%`,
                                    backgroundColor: 'var(--color-success)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                                {metrics.completedPoints} of {metrics.totalPoints} points
                            </div>
                        </div>
                    </div>

                    {/* Time in Status */}
                    {metrics.timeInStatus && metrics.timeInStatus.length > 0 && (
                        <div>
                            <h5 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                Average Time in Status
                            </h5>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: 'var(--spacing-sm)'
                            }}>
                                {metrics.timeInStatus.map((item) => (
                                    <div key={item.status} style={{
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--color-surface)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-neutral-600)',
                                            marginBottom: '4px',
                                            textTransform: 'capitalize'
                                        }}>
                                            {item.status.replace(/_/g, ' ')}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-md)',
                                            fontWeight: 600,
                                            color: 'var(--color-neutral-900)'
                                        }}>
                                            {item.avgTimeHours}h
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-neutral-500)'
                                        }}>
                                            {item.storyCount} {item.storyCount === 1 ? 'story' : 'stories'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

const Sprints = () => {
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStartDialog, setShowStartDialog] = useState(null);
    const [showEndDialog, setShowEndDialog] = useState(null);
    const [newSprint, setNewSprint] = useState({
        name: '',
        objective: '',
        startDate: '',
        endDate: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProject();
        fetchSprints();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchSprints = async () => {
        try {
            const response = await api.get(`/sprints/project/${projectId}`);
            setSprints(response.data);
        } catch (error) {
            console.error('Error fetching sprints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSprint = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/sprints', {
                ...newSprint,
                projectId: parseInt(projectId)
            });
            setSprints([response.data, ...sprints]);
            setShowCreateModal(false);
            setNewSprint({ name: '', objective: '', startDate: '', endDate: '' });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create sprint');
        }
    };

    const handleStartSprint = async (sprintId) => {
        try {
            await api.post(`/sprints/${sprintId}/start`);
            fetchSprints();
            setShowStartDialog(null);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to start sprint');
        }
    };

    const handleEndSprint = async (sprintId) => {
        try {
            await api.post(`/sprints/${sprintId}/end`);
            fetchSprints();
            setShowEndDialog(null);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to end sprint');
        }
    };

    const handleDeleteSprint = async (sprintId) => {
        if (!window.confirm('Are you sure you want to delete this sprint?')) return;

        try {
            await api.delete(`/sprints/${sprintId}`);
            setSprints(sprints.filter(s => s.id !== sprintId));
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete sprint');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { class: 'badge-success', label: 'Active' },
            planned: { class: 'badge-neutral', label: 'Planned' },
            completed: { class: 'badge-primary', label: 'Completed' }
        };
        return badges[status] || badges.planned;
    };

    const activeSprints = sprints.filter(s => s.status === 'active');
    const plannedSprints = sprints.filter(s => s.status === 'planned');
    const completedSprints = sprints.filter(s => s.status === 'completed');

    return (
        <>
            <Breadcrumb items={[
                { label: 'Projects', to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: 'Sprints' },
            ]} />
            <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                <h2>Sprint Management</h2>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                    + Create Sprint
                </button>
            </div>

            {error && (
                <div className="form-error mb-md">{error}</div>
            )}

            {loading ? (
                <div className="text-center">Loading sprints...</div>
            ) : (
                <>
                    {/* Active Sprint */}
                    {activeSprints.length > 0 && (
                        <div className="mb-xl">
                            <h3 className="mb-md">Active Sprint</h3>
                            {activeSprints.map(sprint => (
                                <SprintWithMetrics
                                    key={sprint.id}
                                    sprint={sprint}
                                    projectId={projectId}
                                    onEnd={() => setShowEndDialog(sprint)}
                                    navigate={navigate}
                                />
                            ))}
                        </div>
                    )}

                    {/* Planned Sprints */}
                    {plannedSprints.length > 0 && (
                        <div className="mb-xl">
                            <h3 className="mb-md">Planned Sprints</h3>
                            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                                {plannedSprints.map(sprint => (
                                    <div key={sprint.id} className="card">
                                        <div className="flex flex-between mb-sm">
                                            <div>
                                                <h4 style={{ margin: 0 }}>{sprint.name}</h4>
                                                <span className={`badge ${getStatusBadge(sprint.status).class} mt-xs`}>
                                                    {getStatusBadge(sprint.status).label}
                                                </span>
                                            </div>
                                            <div className="flex flex-gap-sm">
                                                <button
                                                    onClick={() => setShowStartDialog(sprint)}
                                                    className="btn btn-primary btn-sm"
                                                    disabled={sprint.storyCount === 0}
                                                >
                                                    Start Sprint
                                                </button>
                                                <Link
                                                    to={`/project/${projectId}/backlog?sprint=${sprint.id}`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Add Stories
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteSprint(sprint.id)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {sprint.objective && (
                                            <p className="text-muted text-small mt-sm">{sprint.objective}</p>
                                        )}
                                        <div className="mt-sm text-small">
                                            <strong>{sprint.storyCount}</strong> stories | <strong>{sprint.totalPoints}</strong> points
                                            {sprint.storyCount === 0 && (
                                                <span className="text-muted ml-sm">(Add stories to start)</span>
                                            )}
                                        </div>
                                        <div className="mt-xs text-small text-muted">
                                            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Sprints */}
                    {completedSprints.length > 0 && (
                        <div>
                            <h3 className="mb-md">Completed Sprints</h3>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                {completedSprints.map(sprint => (
                                    <div key={sprint.id} className="card" style={{ opacity: 0.8 }}>
                                        <div className="flex flex-between">
                                            <div>
                                                <h4 style={{ margin: 0 }}>{sprint.name}</h4>
                                                <span className={`badge ${getStatusBadge(sprint.status).class} mt-xs`}>
                                                    {getStatusBadge(sprint.status).label}
                                                </span>
                                            </div>
                                            <div className="text-small text-muted">
                                                <strong>{sprint.storyCount}</strong> stories | <strong>{sprint.totalPoints}</strong> points
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sprints.length === 0 && (
                        <div className="card text-center">
                            <h3>No Sprints Yet</h3>
                            <p className="text-muted mt-md">Create your first sprint to start planning</p>
                        </div>
                    )}
                </>
            )}

            {/* Create Sprint Modal */}
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
                    zIndex: 1000
                }} onClick={() => setShowCreateModal(false)}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Create New Sprint</h3>
                        </div>

                        <form onSubmit={handleCreateSprint}>
                            <div className="form-group">
                                <label className="form-label">Sprint Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newSprint.name}
                                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                                    required
                                    autoFocus
                                    placeholder="Sprint 1"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Objective (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    value={newSprint.objective}
                                    onChange={(e) => setNewSprint({ ...newSprint, objective: e.target.value })}
                                    rows={3}
                                    placeholder="What do you want to achieve in this sprint?"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newSprint.startDate}
                                        onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newSprint.endDate}
                                        onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })}
                                        required
                                        min={newSprint.startDate}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="form-error mb-md">{error}</div>
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
                                    Create Sprint
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Start Sprint Dialog */}
            {showStartDialog && (
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
                }} onClick={() => setShowStartDialog(null)}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Start Sprint</h3>
                        </div>

                        <p>Are you ready to start <strong>{showStartDialog.name}</strong>?</p>
                        <div className="mt-md">
                            <p className="text-small">
                                <strong>Stories:</strong> {showStartDialog.storyCount}<br />
                                <strong>Story Points:</strong> {showStartDialog.totalPoints}<br />
                                <strong>Duration:</strong> {new Date(showStartDialog.startDate).toLocaleDateString()} - {new Date(showStartDialog.endDate).toLocaleDateString()}
                            </p>
                        </div>

                        {activeSprints.length > 0 && (
                            <div className="form-error mt-md">
                                <strong>Warning:</strong> Another sprint is currently active. It will be ended automatically.
                            </div>
                        )}

                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowStartDialog(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStartSprint(showStartDialog.id)}
                                className="btn btn-primary"
                            >
                                Start Sprint
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Sprint Dialog */}
            {showEndDialog && (
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
                }} onClick={() => setShowEndDialog(null)}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">End Sprint</h3>
                        </div>

                        <p>Are you sure you want to end <strong>{showEndDialog.name}</strong>?</p>
                        <p className="text-small text-muted mt-sm">
                            The sprint will be marked as completed and can no longer be modified.
                        </p>

                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowEndDialog(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleEndSprint(showEndDialog.id)}
                                className="btn btn-primary"
                            >
                                End Sprint
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sprints;
