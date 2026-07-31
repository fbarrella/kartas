import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AssigneeAvatarWithHoverCard from '../components/AssigneeAvatarWithHoverCard';
import '../components/navigation.css';


const Epics = () => {
    const { t } = useTranslation(['epics', 'common']);
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [epics, setEpics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
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
        { value: '#0052CC', label: t('epics:colorLabels.blue') },
        { value: '#00875A', label: t('epics:colorLabels.green') },
        { value: '#FF8B00', label: t('epics:colorLabels.orange') },
        { value: '#DE350B', label: t('epics:colorLabels.red') },
        { value: '#6554C0', label: t('epics:colorLabels.purple') },
        { value: '#00B8D9', label: t('epics:colorLabels.cyan') },
        { value: '#FF5630', label: t('epics:colorLabels.brightRed') },
        { value: '#36B37E', label: t('epics:colorLabels.brightGreen') }
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
            setError(t('epics:errors.loadEpics'));
        } finally {
            setLoading(false);
        }
    };

    // EPD-02: this modal is now create-only — editing an epic happens on its
    // own detail page (EpicDetail.jsx), which the card itself links to.
    const handleOpenModal = () => {
        setFormData({
            title: '',
            description: '',
            startDate: '',
            endDate: '',
            status: 'planning',
            color: '#0052CC'
        });
        setShowModal(true);
        setError('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await api.post(`/project/${projectId}/epics`, formData);
            handleCloseModal();
            fetchEpics();
        } catch (error) {
            setError(error.response?.data?.error || t('epics:errors.saveEpic'));
        }
    };

    const handleDelete = async (epicId) => {
        if (!confirm(t('epics:confirmDelete'))) {
            return;
        }

        try {
            await api.delete(`/epics/${epicId}`);
            fetchEpics();
        } catch (error) {
            alert(error.response?.data?.error || t('epics:errors.deleteEpic'));
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

    if (loading) {
        return <div className="container mt-lg">{t('epics:loadingEpics')}</div>;
    }

    const visibleEpics = epics.filter(epic =>
        showCompleted || (epic.status !== 'completed' && epic.status !== 'cancelled')
    );

    const myRole = project?.members?.find(m => m.id === user?.id)?.role;
    const canManageEpics = myRole === 'owner' || user?.role === 'admin';

    return (
        <>
            <Breadcrumb items={[
                { label: t('epics:breadcrumbProjects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('epics:breadcrumbEpics') },
            ]} />
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{t('epics:pageTitle')}</h2>
                <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                    <label className="switch switch-primary">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        <span className="switch-track">
                            <span className="switch-thumb" />
                        </span>
                        <span className="switch-text">{t('epics:showCompleted')}</span>
                    </label>
                    {canManageEpics && (
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">
                            {t('epics:createEpic')}
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
                    <h3>{t('epics:emptyState.title')}</h3>
                    <p className="text-muted mt-sm">
                        {canManageEpics ? t('epics:emptyState.subtitleManage') : t('epics:emptyState.subtitleView')}
                    </p>
                    {canManageEpics && (
                        <button onClick={() => handleOpenModal()} className="btn btn-primary mt-md">
                            {t('epics:createEpicButton')}
                        </button>
                    )}
                </div>
            ) : visibleEpics.length === 0 ? (
                <div className="card text-center">
                    <h3>{t('epics:noEpicsToShow.title')}</h3>
                    <p className="text-muted mt-sm">{t('epics:noEpicsToShow.subtitle')}</p>
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
                            to={`/project/${projectId}/epic/${epic.id}`}
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
                                            {t(`epics:statusLabels.${epic.status}`, epic.status)}
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
                                            <span>{t('epics:progress')}</span>
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
                                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <MarkdownRenderer content={epic.description} className="text-muted" />
                                    </div>
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
                                            <strong>{t('epics:start')}</strong> {new Date(epic.start_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    {epic.end_date && (
                                        <div>
                                            <strong>{t('epics:end')}</strong> {new Date(epic.end_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div>
                                        <strong>{t('epics:stories')}</strong> {epic.story_count}
                                    </div>
                                    <div className="flex flex-gap-xs" style={{ alignItems: 'center' }}>
                                        <strong>{t('epics:createdBy')}</strong>
                                        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                            <AssigneeAvatarWithHoverCard
                                                assigneeId={epic.created_by}
                                                assigneeName={epic.creator_name}
                                                assigneeRole={epic.creator_role}
                                                assigneeEmail={epic.creator_email}
                                                projectId={projectId}
                                            />
                                        </span>
                                    </div>
                                </div>

                                {canManageEpics && (
                                    <div className="flex flex-gap-sm mt-md">
                                        <button
                                            onClick={() => handleDelete(epic.id)}
                                            className="btn btn-danger btn-sm"
                                            disabled={parseInt(epic.story_count) > 0}
                                            title={parseInt(epic.story_count) > 0 ? t('epics:cannotDeleteTooltip') : t('epics:deleteTooltip')}
                                            style={{ flex: 1 }}
                                        >
                                            {t('common:delete')}
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
                            <h3 className="card-title">{t('epics:createEpicButton')}</h3>
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
                                <label className="form-label">{t('epics:titleLabel')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t('common:description')}</label>
                                <MarkdownEditor
                                    value={formData.description}
                                    onChange={(v) => setFormData({ ...formData, description: v })}
                                    rows={6}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t('common:status')}</label>
                                <select
                                    className="form-select"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="planning">{t('epics:statusLabels.planning')}</option>
                                    <option value="in_progress">{t('epics:statusLabels.in_progress')}</option>
                                    <option value="completed">{t('epics:statusLabels.completed')}</option>
                                    <option value="cancelled">{t('epics:statusLabels.cancelled')}</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">{t('epics:startDate')}</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('epics:endDate')}</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t('epics:color')}</label>
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
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('epics:createEpicButton')}
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
