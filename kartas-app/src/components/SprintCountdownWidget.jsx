import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// FY-02: the same elapsed-time-bar visual pattern already built for the Kanban
// header (KanbanBoard.jsx, KAN-01's flex row), surfaced as its own For You
// widget under a more descriptive name.
const SprintCountdownWidget = ({ projectId }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const [sprint, setSprint] = useState(null);
    const [hasActiveSprint, setHasActiveSprint] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActiveSprint = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/sprints/project/${projectId}/active`);
                setSprint(response.data);
                setHasActiveSprint(true);
            } catch (error) {
                if (error.response?.status === 404) {
                    setHasActiveSprint(false);
                } else {
                    console.error('Error fetching active sprint:', error);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchActiveSprint();
    }, [projectId]);

    const elapsedPercent = sprint?.startDate && sprint?.endDate
        ? Math.min(Math.max(((new Date() - new Date(sprint.startDate)) / (new Date(sprint.endDate) - new Date(sprint.startDate))) * 100, 0), 100)
        : 0;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{t('dashboard:sprintCountdownWidget.title')}</h3>
            </div>

            {loading ? (
                <div className="text-center">{t('common:loading')}</div>
            ) : !hasActiveSprint ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">{t('dashboard:sprintCountdownWidget.noActiveSprint')}</p>
                </div>
            ) : (
                <div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-xs)' }}>{sprint.name}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>
                        {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-neutral-600)',
                        marginBottom: '2px'
                    }}>
                        <span>{t('dashboard:sprintCountdownWidget.elapsedTime')}</span>
                        <span>{Math.round(elapsedPercent)}%</span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '4px',
                        backgroundColor: 'var(--color-neutral-100)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${elapsedPercent}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-success)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SprintCountdownWidget;
