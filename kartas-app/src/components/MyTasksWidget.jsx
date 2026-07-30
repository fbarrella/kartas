import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_OPTIONS = [
    { value: 'backlog', label: 'Backlog', color: 'var(--color-neutral-400)' },
    { value: 'refining', label: 'Refining', color: 'var(--color-info)' },
    { value: 'ready', label: 'Ready', color: 'var(--color-success)' },
    { value: 'in_development', label: 'In Development', color: 'var(--color-warning)' },
    { value: 'review', label: 'Review', color: 'var(--color-secondary)' },
    { value: 'test', label: 'Test', color: 'var(--color-info)' },
    { value: 'done', label: 'Done', color: 'var(--color-success)' },
    { value: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' }
];

const getStatusColor = (status) => STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'var(--color-neutral-400)';
const getStatusLabel = (status) => STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;

const MyTasksWidget = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/for-you/project/${projectId}/tasks`);
                setTasks(response.data);
            } catch (error) {
                console.error('Error fetching assigned tasks:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [projectId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">My Tasks</h3>
            </div>

            {loading ? (
                <div className="text-center">Loading tasks...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">You don't have any tasks assigned in this project</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Task</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Epic</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Sprint</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Status</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr
                                    key={`${task.itemType}-${task.id}`}
                                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                >
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <Link
                                            to={`/project/${projectId}/story/${task.storyId}`}
                                            style={{ color: 'var(--color-text)', textDecoration: 'none' }}
                                        >
                                            <strong>{task.code}</strong> — {task.title}
                                            {task.itemType === 'subtask' && (
                                                <span className="badge badge-info" style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px' }}>
                                                    Sub-item
                                                </span>
                                            )}
                                        </Link>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {task.epicTitle && (
                                            <span style={{
                                                padding: '2px 8px',
                                                fontSize: 'var(--font-size-sm)',
                                                backgroundColor: task.epicColor || '#0052CC',
                                                color: 'white',
                                                borderRadius: 'var(--radius-sm)',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {task.epicTitle}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {task.sprint && (
                                            <span className="badge badge-info">{task.sprint.name}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            fontSize: 'var(--font-size-sm)',
                                            border: `1px solid ${getStatusColor(task.status)}`,
                                            color: getStatusColor(task.status),
                                            borderRadius: 'var(--radius-sm)',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {getStatusLabel(task.status)}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>{task.storyPoints ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyTasksWidget;
