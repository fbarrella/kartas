import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
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
    const { projectName, defaultLandingPage: currentDefaultLandingPage } = useOutletContext();
    const [defaultLandingPage, setDefaultLandingPage] = useState('backlog');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettings();
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
        </div>
    );
};

export default ProjectSettings;
