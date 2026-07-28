import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const LANDING_PAGE_OPTIONS = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'for-you', label: 'For You' },
    { value: 'epics', label: 'Epics' },
    { value: 'sprints', label: 'Sprints' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'reports', label: 'Reports' },
    { value: 'team', label: 'Team Members' }
];

const ProjectSettings = () => {
    const { projectId } = useParams();
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
            setSuccessMessage('Settings saved successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Settings</h2>
            </div>

            {loading ? (
                <div className="text-center">Loading settings...</div>
            ) : (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">Default page when entering this project</label>
                            <select
                                className="form-select"
                                value={defaultLandingPage}
                                onChange={(e) => setDefaultLandingPage(e.target.value)}
                            >
                                {LANDING_PAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <small className="text-muted">This applies only to your own account.</small>
                        </div>

                        {error && <div className="form-error mb-md">{error}</div>}
                        {successMessage && (
                            <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProjectSettings;
