import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';


// Sprint with Metrics Component
const SprintWithMetrics = ({ sprint, projectId, onEnd, navigate }) => {
    const { t } = useTranslation(['sprints', 'common']);
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
            active: { class: 'badge-success', label: t('sprints:status.active') },
            planned: { class: 'badge-neutral', label: t('sprints:status.planned') },
            completed: { class: 'badge-primary', label: t('sprints:status.completed') }
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
                        {t('sprints:viewKanban')}
                    </button>
                    <button
                        onClick={onEnd}
                        className="btn btn-secondary"
                    >
                        {t('sprints:endSprint')}
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
                    <strong>{t('sprints:storiesFieldLabel')}:</strong> {sprint.storyCount}
                </div>
                <div>
                    <strong>{t('sprints:pointsFieldLabel')}:</strong> {sprint.totalPoints}
                </div>
                <div>
                    <strong>{t('sprints:startDate')}:</strong> {new Date(sprint.startDate).toLocaleDateString()}
                </div>
                <div>
                    <strong>{t('sprints:endDate')}:</strong> {new Date(sprint.endDate).toLocaleDateString()}
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
                            <span>{t('sprints:elapsedTime')}</span>
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
                <div className="mt-lg text-center text-muted">{t('sprints:loadingMetrics')}</div>
            ) : metrics ? (
                <div className="mt-lg" style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <h4 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>{t('sprints:sprintMetrics')}</h4>

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
                                    {t('sprints:storyCompletion')}
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
                                {t('sprints:storiesCompletionSummary', { completed: metrics.completedStories, total: metrics.totalStories })}
                            </div>
                        </div>

                        {/* Story Points */}
                        <div>
                            <div className="flex flex-between mb-xs">
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    {t('sprints:storyPoints')}
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
                                {t('sprints:pointsCompletionSummary', { completed: metrics.completedPoints, total: metrics.totalPoints })}
                            </div>
                        </div>
                    </div>

                    {/* Time in Status */}
                    {metrics.timeInStatus && metrics.timeInStatus.length > 0 && (
                        <div>
                            <h5 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                {t('sprints:averageTimeInStatus')}
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
                                            {t(`sprints:statusLabels.${item.status}`, item.status.replace(/_/g, ' '))}
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
                                            {t('sprints:storyCount', { count: item.storyCount })}
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
    const { t } = useTranslation(['sprints', 'common']);
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
            setError(error.response?.data?.error || t('sprints:failedToCreateSprint'));
        }
    };

    const handleStartSprint = async (sprintId) => {
        try {
            await api.post(`/sprints/${sprintId}/start`);
            fetchSprints();
            setShowStartDialog(null);
        } catch (error) {
            setError(error.response?.data?.error || t('sprints:failedToStartSprint'));
        }
    };

    const handleEndSprint = async (sprintId) => {
        try {
            await api.post(`/sprints/${sprintId}/end`);
            fetchSprints();
            setShowEndDialog(null);
        } catch (error) {
            setError(error.response?.data?.error || t('sprints:failedToEndSprint'));
        }
    };

    const handleDeleteSprint = async (sprintId) => {
        if (!window.confirm(t('sprints:confirmDeleteSprint'))) return;

        try {
            await api.delete(`/sprints/${sprintId}`);
            setSprints(sprints.filter(s => s.id !== sprintId));
        } catch (error) {
            setError(error.response?.data?.error || t('sprints:failedToDeleteSprint'));
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { class: 'badge-success', label: t('sprints:status.active') },
            planned: { class: 'badge-neutral', label: t('sprints:status.planned') },
            completed: { class: 'badge-primary', label: t('sprints:status.completed') }
        };
        return badges[status] || badges.planned;
    };

    const activeSprints = sprints.filter(s => s.status === 'active');
    const plannedSprints = sprints.filter(s => s.status === 'planned');
    const completedSprints = sprints.filter(s => s.status === 'completed');

    return (
        <>
            <Breadcrumb items={[
                { label: t('sprints:breadcrumb.projects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('sprints:breadcrumb.sprints') },
            ]} />
            <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                <h2>{t('sprints:sprintManagement')}</h2>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                    + {t('sprints:createSprint')}
                </button>
            </div>

            {error && (
                <div className="form-error mb-md">{error}</div>
            )}

            {loading ? (
                <div className="text-center">{t('sprints:loadingSprints')}</div>
            ) : (
                <>
                    {/* Active Sprint */}
                    {activeSprints.length > 0 && (
                        <div className="mb-xl">
                            <h3 className="mb-md">{t('sprints:activeSprint')}</h3>
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
                            <h3 className="mb-md">{t('sprints:plannedSprints')}</h3>
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
                                                    {t('sprints:startSprint')}
                                                </button>
                                                <Link
                                                    to={`/project/${projectId}/backlog?sprint=${sprint.id}`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    {t('sprints:addStories')}
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteSprint(sprint.id)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    {t('common:delete')}
                                                </button>
                                            </div>
                                        </div>
                                        {sprint.objective && (
                                            <p className="text-muted text-small mt-sm">{sprint.objective}</p>
                                        )}
                                        <div className="mt-sm text-small">
                                            <strong>{sprint.storyCount}</strong> {t('sprints:storiesLabel')} | <strong>{sprint.totalPoints}</strong> {t('sprints:pointsLabel')}
                                            {sprint.storyCount === 0 && (
                                                <span className="text-muted ml-sm">{t('sprints:addStoriesToStart')}</span>
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
                            <h3 className="mb-md">{t('sprints:completedSprints')}</h3>
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
                                                <strong>{sprint.storyCount}</strong> {t('sprints:storiesLabel')} | <strong>{sprint.totalPoints}</strong> {t('sprints:pointsLabel')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sprints.length === 0 && (
                        <div className="card text-center">
                            <h3>{t('sprints:noSprintsYet')}</h3>
                            <p className="text-muted mt-md">{t('sprints:noSprintsDescription')}</p>
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
                            <h3 className="card-title">{t('sprints:createNewSprint')}</h3>
                        </div>

                        <form onSubmit={handleCreateSprint}>
                            <div className="form-group">
                                <label className="form-label">{t('sprints:sprintName')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newSprint.name}
                                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                                    required
                                    autoFocus
                                    placeholder={t('sprints:sprintNamePlaceholder')}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t('sprints:objectiveOptional')}</label>
                                <textarea
                                    className="form-textarea"
                                    value={newSprint.objective}
                                    onChange={(e) => setNewSprint({ ...newSprint, objective: e.target.value })}
                                    rows={3}
                                    placeholder={t('sprints:objectivePlaceholder')}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">{t('sprints:startDate')}</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newSprint.startDate}
                                        onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('sprints:endDate')}</label>
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
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('sprints:createSprint')}
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
                            <h3 className="card-title">{t('sprints:startSprint')}</h3>
                        </div>

                        <p><Trans i18nKey="sprints:readyToStart" values={{ name: showStartDialog.name }}>Are you ready to start <strong>{{ name: showStartDialog.name }}</strong>?</Trans></p>
                        <div className="mt-md">
                            <p className="text-small">
                                <strong>{t('sprints:storiesFieldLabel')}:</strong> {showStartDialog.storyCount}<br />
                                <strong>{t('sprints:storyPoints')}:</strong> {showStartDialog.totalPoints}<br />
                                <strong>{t('sprints:duration')}:</strong> {new Date(showStartDialog.startDate).toLocaleDateString()} - {new Date(showStartDialog.endDate).toLocaleDateString()}
                            </p>
                        </div>

                        {activeSprints.length > 0 && (
                            <div className="form-error mt-md">
                                <strong>{t('sprints:warningLabel')}:</strong> {t('sprints:anotherSprintActiveWarning')}
                            </div>
                        )}

                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowStartDialog(null)}
                                className="btn btn-secondary"
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                onClick={() => handleStartSprint(showStartDialog.id)}
                                className="btn btn-primary"
                            >
                                {t('sprints:startSprint')}
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
                            <h3 className="card-title">{t('sprints:endSprint')}</h3>
                        </div>

                        <p><Trans i18nKey="sprints:confirmEnd" values={{ name: showEndDialog.name }}>Are you sure you want to end <strong>{{ name: showEndDialog.name }}</strong>?</Trans></p>
                        <p className="text-small text-muted mt-sm">
                            {t('sprints:endSprintDescription')}
                        </p>

                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowEndDialog(null)}
                                className="btn btn-secondary"
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                onClick={() => handleEndSprint(showEndDialog.id)}
                                className="btn btn-primary"
                            >
                                {t('sprints:endSprint')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sprints;
