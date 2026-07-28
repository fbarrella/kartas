import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import BurndownChart from '../components/BurndownChart';
import TimeInStatusChart from '../components/TimeInStatusChart';


const SprintReports = () => {
    const { projectId } = useParams();
    const [sprints, setSprints] = useState([]);
    const [selectedSprintId, setSelectedSprintId] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCompletedSprints();
    }, [projectId]);

    useEffect(() => {
        if (selectedSprintId) {
            fetchSprintReport(selectedSprintId);
        }
    }, [selectedSprintId]);

    const fetchCompletedSprints = async () => {
        try {
            const response = await api.get(`/metrics/projects/${projectId}/sprints`);
            setSprints(response.data);
            if (response.data.length > 0) {
                setSelectedSprintId(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching sprints:', error);
            setError('Failed to load completed sprints');
        } finally {
            setLoading(false);
        }
    };

    const fetchSprintReport = async (sprintId) => {
        try {
            setLoading(true);
            const response = await api.get(`/metrics/sprints/${sprintId}/report`);
            setReport(response.data);
            setError('');
        } catch (error) {
            console.error('Error fetching sprint report:', error);
            setError('Failed to load sprint report');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !report) {
        return (
            <>
                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Reports</h2>
                </div>
                <div className="text-center">Loading...</div>
            </>
        );
    }

    if (sprints.length === 0) {
        return (
            <>
                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Reports</h2>
                </div>
                <div className="card text-center">
                    <h2>No Completed Sprints</h2>
                    <p className="text-muted mt-md">
                        Complete a sprint to view metrics and reports.
                    </p>
                    <Link to={`/project/${projectId}/sprints`} className="btn btn-primary mt-md">
                        Go to Sprints
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Reports</h2>
            </div>

            {/* Sprint Selector */}
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                    <label style={{ fontWeight: 'var(--font-weight-medium)' }}>Select Sprint:</label>
                    <select
                        className="form-select"
                        value={selectedSprintId || ''}
                        onChange={(e) => setSelectedSprintId(parseInt(e.target.value))}
                        style={{ maxWidth: '400px' }}
                    >
                        {sprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>
                                {sprint.name} ({new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {error && (
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                    {error}
                </div>
            )}

            {report && (
                <>
                    {/* Sprint Overview */}
                    <div className="card mb-lg">
                        <h2>{report.sprint.name}</h2>
                        {report.sprint.objective && (
                            <p className="text-muted mt-sm">{report.sprint.objective}</p>
                        )}
                        <div className="flex flex-gap-md mt-md" style={{ flexWrap: 'wrap' }}>
                            <div>
                                <strong>Duration:</strong> {new Date(report.sprint.startDate).toLocaleDateString()} - {new Date(report.sprint.endDate).toLocaleDateString()}
                            </div>
                            <div>
                                <strong>Status:</strong> <span className="badge badge-success">{report.sprint.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card">
                            <h4 className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>Completion Rate</h4>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                                {report.metrics.completionRate}%
                            </div>
                            <div className="mt-sm">
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-neutral-100)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${report.metrics.completionRate}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h4 className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>Stories Completed</h4>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                                {report.metrics.completedStories} / {report.metrics.totalStories}
                            </div>
                        </div>

                        <div className="card">
                            <h4 className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>Velocity</h4>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
                                {report.metrics.velocity} pts
                            </div>
                            <div className="text-small text-muted mt-xs">
                                of {report.metrics.totalPoints} planned
                            </div>
                        </div>
                    </div>

                    {/* Burndown Chart */}
                    <div className="card mb-lg">
                        <h3 className="mb-md">Burndown Chart</h3>
                        <BurndownChart
                            data={report.burndown}
                            startDate={report.sprint.startDate}
                            endDate={report.sprint.endDate}
                        />
                    </div>

                    {/* Time in Status */}
                    <div className="card mb-lg">
                        <h3 className="mb-md">Average Time in Status</h3>
                        <TimeInStatusChart data={report.timeInStatus} />
                    </div>

                    {/* Team Contributions */}
                    <div className="card">
                        <h3 className="mb-md">Team Contributions</h3>
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Team Member</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Stories Completed</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Points Completed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.teamContributions.map((member, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <div>{member.name}</div>
                                                {member.email && <div className="text-small text-muted">{member.email}</div>}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>{member.completedStories}</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <strong>{member.completedPoints}</strong>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default SprintReports;
