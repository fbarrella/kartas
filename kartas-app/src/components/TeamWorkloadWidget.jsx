import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TeamWorkloadChart from './TeamWorkloadChart';

const TeamWorkloadWidget = ({ projectId }) => {
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
                <h3 className="card-title">Team Workload</h3>
            </div>

            {loading ? (
                <div className="text-center">Loading...</div>
            ) : !hasActiveSprint ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">There will only be data here once there's an active sprint</p>
                </div>
            ) : (
                <TeamWorkloadChart data={workload?.data} />
            )}
        </div>
    );
};

export default TeamWorkloadWidget;
