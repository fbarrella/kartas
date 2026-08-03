import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useStepUp } from '../contexts/StepUpContext';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';

const LANDING_PAGE_OPTIONS = [
    { value: 'backlog', labelKey: 'backlog' },
    { value: 'for-you', labelKey: 'forYou' },
    { value: 'epics', labelKey: 'epics' },
    { value: 'sprints', labelKey: 'sprints' },
    { value: 'kanban', labelKey: 'kanban' },
    { value: 'reports', labelKey: 'reports' },
    { value: 'team', labelKey: 'team' }
];

const ProjectSettings = () => {
    const { t } = useTranslation(['project', 'common']);
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { requestStepUp } = useStepUp();
    const { projectName, defaultLandingPage: currentDefaultLandingPage } = useOutletContext();
    const [defaultLandingPage, setDefaultLandingPage] = useState('backlog');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // PROJ-02/03: fetches the full project (including .members, needed to
    // compute canManageProject the same way ProjectView.jsx already does)
    // separately from the per-user landing-page settings above.
    const [project, setProject] = useState(null);
    const canManageProject = project?.members?.find((m) => m.id === user?.id)?.role === 'owner' || user?.role === 'admin';

    const [nameDraft, setNameDraft] = useState('');
    const [nameConfirm, setNameConfirm] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState('');
    const [nameSuccess, setNameSuccess] = useState('');

    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [descriptionConfirm, setDescriptionConfirm] = useState('');
    const [descriptionSaving, setDescriptionSaving] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');
    const [descriptionSuccess, setDescriptionSuccess] = useState('');

    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchProject();
    }, [projectId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/settings`);
            setDefaultLandingPage(response.data.defaultLandingPage);
        } catch (error) {
            console.error('Error fetching project settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
            setNameDraft(response.data.name || '');
            setDescriptionDraft(response.data.description || '');
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSaving(true);

        try {
            await api.put(`/projects/${projectId}/settings`, { defaultLandingPage });
            setSuccessMessage(t('project:settings.saveSuccess'));
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || t('project:settings.saveError'));
        } finally {
            setSaving(false);
        }
    };

    // PROJ-02: name and description save independently, each gated behind
    // typing "CONFIRM" (BKP-04's Phase 7 fixed-phrase pattern) plus a fresh
    // step-up re-verification.
    const handleSaveName = async (e) => {
        e.preventDefault();
        setNameError('');
        setNameSuccess('');
        setNameSaving(true);
        try {
            const stepUpToken = await requestStepUp();
            const response = await api.put(`/projects/${projectId}`, { name: nameDraft }, { headers: { 'X-Step-Up-Token': stepUpToken } });
            setProject((prev) => ({ ...prev, name: response.data.name }));
            setNameConfirm('');
            setNameSuccess(t('project:settings.projectManagement.saveSuccess'));
            setTimeout(() => setNameSuccess(''), 3000);
        } catch (err) {
            if (err?.message !== 'cancelled') {
                setNameError(err.response?.data?.error || err.message || t('project:settings.projectManagement.saveError'));
            }
        } finally {
            setNameSaving(false);
        }
    };

    const handleSaveDescription = async (e) => {
        e.preventDefault();
        setDescriptionError('');
        setDescriptionSuccess('');
        setDescriptionSaving(true);
        try {
            const stepUpToken = await requestStepUp();
            const response = await api.put(`/projects/${projectId}`, { description: descriptionDraft }, { headers: { 'X-Step-Up-Token': stepUpToken } });
            setProject((prev) => ({ ...prev, description: response.data.description }));
            setDescriptionConfirm('');
            setDescriptionSuccess(t('project:settings.projectManagement.saveSuccess'));
            setTimeout(() => setDescriptionSuccess(''), 3000);
        } catch (err) {
            if (err?.message !== 'cancelled') {
                setDescriptionError(err.response?.data?.error || err.message || t('project:settings.projectManagement.saveError'));
            }
        } finally {
            setDescriptionSaving(false);
        }
    };

    // PROJ-03: the first-ever UI trigger for DELETE /api/projects/:projectId
    // — typing the project's exact current name (not a fixed word) plus a
    // fresh step-up re-verification.
    const handleDeleteProject = async () => {
        setDeleteError('');
        setDeleting(true);
        try {
            const stepUpToken = await requestStepUp();
            await api.delete(`/projects/${projectId}`, { headers: { 'X-Step-Up-Token': stepUpToken } });
            navigate('/');
        } catch (err) {
            if (err?.message !== 'cancelled') {
                setDeleteError(err.response?.data?.error || err.message || t('project:settings.projectManagement.deleteError'));
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <Breadcrumb items={[
                { label: t('project:breadcrumb.projects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${currentDefaultLandingPage}` },
                { label: t('project:breadcrumb.projectSettings') },
            ]} />
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{t('project:settings.title')}</h2>
            </div>

            {loading ? (
                <div className="text-center">{t('project:settings.loadingSettings')}</div>
            ) : (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">{t('project:settings.defaultLandingPage')}</label>
                            <select
                                className="form-select"
                                value={defaultLandingPage}
                                onChange={(e) => setDefaultLandingPage(e.target.value)}
                            >
                                {LANDING_PAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{t(`project:settings.landingPageOptions.${option.labelKey}`)}</option>
                                ))}
                            </select>
                            <small className="text-muted">{t('project:settings.defaultLandingPageHint')}</small>
                        </div>

                        {error && <div className="form-error mb-md">{error}</div>}
                        {successMessage && (
                            <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('common:saving') : t('common:save')}
                        </button>
                    </form>
                </div>
            )}

            {canManageProject && (
                <div className="card mt-lg" style={{ maxWidth: '500px' }}>
                    <h3>{t('project:settings.projectManagement.title')}</h3>
                    <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {t('project:settings.projectManagement.description')}
                    </p>

                    <form onSubmit={handleSaveName}>
                        <div className="form-group">
                            <label className="form-label">{t('project:settings.projectManagement.nameLabel')}</label>
                            <input type="text" className="form-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('project:settings.projectManagement.confirmLabel', { word: 'CONFIRM' })}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={nameConfirm}
                                onChange={(e) => setNameConfirm(e.target.value)}
                                placeholder="CONFIRM"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>
                        {nameError && <div className="form-error mb-md">{nameError}</div>}
                        {nameSuccess && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{nameSuccess}</div>}
                        <button type="submit" className="btn btn-primary" disabled={nameSaving || nameConfirm !== 'CONFIRM'}>
                            {nameSaving ? t('common:saving') : t('project:settings.projectManagement.saveNameButton')}
                        </button>
                    </form>

                    <form onSubmit={handleSaveDescription} className="mt-lg">
                        <div className="form-group">
                            <label className="form-label">{t('common:description')}</label>
                            <textarea className="form-textarea" value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('project:settings.projectManagement.confirmLabel', { word: 'CONFIRM' })}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={descriptionConfirm}
                                onChange={(e) => setDescriptionConfirm(e.target.value)}
                                placeholder="CONFIRM"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>
                        {descriptionError && <div className="form-error mb-md">{descriptionError}</div>}
                        {descriptionSuccess && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{descriptionSuccess}</div>}
                        <button type="submit" className="btn btn-primary" disabled={descriptionSaving || descriptionConfirm !== 'CONFIRM'}>
                            {descriptionSaving ? t('common:saving') : t('project:settings.projectManagement.saveDescriptionButton')}
                        </button>
                    </form>

                    <div className="mt-lg" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                        <h4 style={{ color: 'var(--color-danger)' }}>{t('project:settings.projectManagement.deleteTitle')}</h4>
                        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {t('project:settings.projectManagement.deleteWarning')}
                        </p>
                        <div className="form-group">
                            <label className="form-label">
                                {t('project:settings.projectManagement.deleteConfirmLabel', { name: project?.name || '' })}
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                style={{ maxWidth: '260px' }}
                            />
                        </div>
                        {deleteError && <div className="form-error mb-md">{deleteError}</div>}
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={deleting || !project || deleteConfirmName !== project.name}
                            onClick={handleDeleteProject}
                        >
                            {deleting ? t('project:settings.projectManagement.deleting') : t('project:settings.projectManagement.deleteButton')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettings;
