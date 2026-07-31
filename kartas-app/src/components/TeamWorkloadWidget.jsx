import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TeamWorkloadChart from './TeamWorkloadChart';

const TeamWorkloadWidget = ({ projectId }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const [workload, setWorkload] = useState(null);
    const [hasActiveSprint, setHasActiveSprint] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkload = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/for-you/project/${projectId}/team-workload`);
                setWorkload(response.data);
                setHasActiveSprint(true);
            } catch (error) {
                if (error.response?.status === 404) {
                    setHasActiveSprint(false);
                } else {
                    console.error('Error fetching team workload:', error);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchWorkload();
    }, [projectId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{t('dashboard:teamWorkloadWidget.title')}</h3>
            </div>

            {loading ? (
                <div className="text-center">{t('common:loading')}</div>
            ) : !hasActiveSprint ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">{t('dashboard:teamWorkloadWidget.noActiveSprint')}</p>
                </div>
            ) : (
                <TeamWorkloadChart data={workload?.data} />
            )}
        </div>
    );
};

export default TeamWorkloadWidget;
