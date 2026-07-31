import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AssigneeAvatarWithHoverCard from '../components/AssigneeAvatarWithHoverCard';
import { useAuth } from '../contexts/AuthContext';
import '../components/navigation.css';

const STATUS_OPTIONS = [
    { value: 'planning', label: 'Planning', color: 'var(--color-neutral-500)' },
    { value: 'in_progress', label: 'In Progress', color: 'var(--color-primary)' },
    { value: 'completed', label: 'Completed', color: 'var(--color-success)' },
    { value: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' }
];

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

// EPD-02: static hex-to-key lookup so EPIC_COLORS (module-level, no hook
// access) can be translated at each render/usage site via t('epics:colorLabels.<key>').
const EPIC_COLOR_KEYS = {
    '#0052CC': 'blue',
    '#00875A': 'green',
    '#FF8B00': 'orange',
    '#DE350B': 'red',
    '#6554C0': 'purple',
    '#00B8D9': 'cyan',
    '#FF5630': 'brightRed',
    '#36B37E': 'brightGreen'
};

const EpicDetail = () => {
    const { t } = useTranslation(['epics', 'common']);
    const { projectId, epicId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [epic, setEpic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);

    // EPD-02: epicController.js's responses are snake_case (unlike
    // storyController.js's camelCase) — keep that convention here rather than
    // silently relabeling fields, to avoid a read/write mismatch with the API.
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'planning',
        start_date: '',
        end_date: '',
        color: '#0052CC'
    });

    useEffect(() => {
        fetchProject();
        fetchEpic();
    }, [projectId, epicId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchEpic = async () => {
        try {
            const response = await api.get(`/epics/${epicId}`);
            setEpic(response.data);
            setFormData({
                title: response.data.title || '',
                description: response.data.description || '',
                status: response.data.status || 'planning',
                start_date: response.data.start_date ? response.data.start_date.substring(0, 10) : '',
                end_date: response.data.end_date ? response.data.end_date.substring(0, 10) : '',
                color: response.data.color || '#0052CC'
            });
        } catch (error) {
            console.error('Error fetching epic:', error);
            setError(t('epics:errors.loadEpic'));
        } finally {
            setLoading(false);
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
            await api.put(`/epics/${epicId}`, {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                startDate: formData.start_date || null,
                endDate: formData.end_date || null,
                color: formData.color
            });
            await fetchEpic();
            setSuccessMessage(t('epics:detail.updatedSuccess'));
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('epics:errors.updateEpic'));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelDescriptionEdit = () => {
        handleChange('description', epic?.description || '');
        setIsEditingDescription(false);
    };

    const handleSaveDescription = async () => {
        await handleSave();
        setIsEditingDescription(false);
    };

    if (loading) {
        return (
            <div className="text-center">{t('epics:loadingEpic')}</div>
        );
    }

    if (!epic) {
        return (
            <div className="card text-center">
                <h3>{t('epics:detail.notFoundTitle')}</h3>
                <button onClick={() => navigate(`/project/${projectId}/epics`)} className="btn btn-primary mt-md">
                    {t('epics:detail.backToEpics')}
                </button>
            </div>
        );
    }

    const myRole = project?.members?.find(m => m.id === user?.id)?.role;
    const canManageEpics = myRole === 'owner' || user?.role === 'admin';

    return (
        <>
            <Breadcrumb items={[
                { label: t('epics:breadcrumbProjects'), to: '/' },
                { label: project?.name || t('epics:breadcrumbProjectFallback'), to: `/project/${projectId}/epics` },
                { label: epic.epic_id, to: `/project/${projectId}/epics` },
                { label: t('epics:breadcrumbEditEpic') },
            ]} />

            {/* Page Title */}
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{epic.epic_id}</h2>
                {canManageEpics && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary"
                    >
                        {saving ? t('common:saving') : t('common:saveChanges')}
                    </button>
                )}
            </div>

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

            {/* Epic Details Card */}
            <div className="card">
                <div className="form-group">
                    <label className="form-label">{t('epics:titleLabel')}</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        disabled={!canManageEpics}
                        required
                    />
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-md)',
                    paddingBottom: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t('common:status')}</label>
                        <select
                            className="form-select"
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            disabled={!canManageEpics}
                        >
                            {STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {t(`epics:statusLabels.${option.value}`, option.label)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t('epics:detail.createdBy')}</label>
                        <div style={{ paddingTop: 'var(--spacing-xs)' }}>
                            <AssigneeAvatarWithHoverCard
                                assigneeId={epic.created_by}
                                assigneeName={epic.creator_name}
                                assigneeRole={epic.creator_role}
                                assigneeEmail={epic.creator_email}
                                projectId={projectId}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t('epics:startDate')}</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.start_date}
                            onChange={(e) => handleChange('start_date', e.target.value)}
                            disabled={!canManageEpics}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t('epics:endDate')}</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.end_date}
                            onChange={(e) => handleChange('end_date', e.target.value)}
                            disabled={!canManageEpics}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label">{t('epics:color')}</label>
                        <div className="flex flex-gap-sm" style={{ flexWrap: 'wrap' }}>
                            {EPIC_COLORS.map(colorOption => (
                                <button
                                    key={colorOption.value}
                                    type="button"
                                    onClick={() => canManageEpics && handleChange('color', colorOption.value)}
                                    title={t(`epics:colorLabels.${EPIC_COLOR_KEYS[colorOption.value]}`, colorOption.label)}
                                    disabled={!canManageEpics}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: colorOption.value,
                                        border: formData.color === colorOption.value ? '3px solid var(--color-neutral-900)' : '1px solid var(--color-border)',
                                        cursor: canManageEpics ? 'pointer' : 'default'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <div className="flex flex-between mb-sm" style={{ alignItems: 'center' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>{t('common:description')}</label>
                        {canManageEpics && !isEditingDescription && (
                            <button
                                type="button"
                                onClick={() => setIsEditingDescription(true)}
                                className="btn btn-secondary btn-sm"
                            >
                                {t('epics:detail.editDescription')}
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
                                        {t('common:cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDescription}
                                        disabled={saving}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {saving ? t('common:saving') : t('common:save')}
                                    </button>
                                </div>
                            </>
                        ) : formData.description ? (
                            <MarkdownRenderer content={formData.description} />
                        ) : (
                            <div className="text-small text-muted">{t('epics:detail.noDescription')}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Associated Stories — read-only, visualization only */}
            <div className="card mt-md">
                <div className="card-header">
                    <h3 className="card-title">{t('epics:detail.associatedStories')}</h3>
                </div>
                {epic.stories && epic.stories.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('epics:detail.table.id')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('epics:detail.table.title')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('epics:detail.table.status')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('epics:detail.table.points')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('epics:detail.table.assignee')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {epic.stories.map(story => (
                                <tr
                                    key={story.id}
                                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    onClick={() => navigate(`/project/${projectId}/story/${story.id}`)}
                                >
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>{story.story_id}</strong></td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>{story.title}</td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <span className="badge" style={{ backgroundColor: 'var(--color-neutral-400)', color: 'white' }}>
                                            {t(`epics:storyStatusLabels.${story.status}`, story.status)}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>{story.story_points || '-'}</td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                            <AssigneeAvatarWithHoverCard
                                                assigneeId={story.assignee_id}
                                                assigneeName={story.assignee_name}
                                                assigneeRole={story.assignee_role}
                                                assigneeEmail={story.assignee_email}
                                                projectId={projectId}
                                            />
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-muted" style={{ padding: 'var(--spacing-md)' }}>{t('epics:detail.noStories')}</p>
                )}
            </div>
        </>
    );
};

export default EpicDetail;
