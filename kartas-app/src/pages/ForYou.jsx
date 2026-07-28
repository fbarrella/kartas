import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const ACTIVITY_LIMIT = 20;

const describeActivity = (item) => {
    const { actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;

    if (entityType === 'story') {
        if (actionType === 'created') return `Created story ${storyCode} — ${newValue}`;
        if (actionType === 'commented') return `Commented on ${storyCode}: "${newValue}"`;
        if (actionType === 'moved') {
            return oldValue != null
                ? `Moved ${storyCode} from ${getStatusLabel(oldValue)} to ${getStatusLabel(newValue)}`
                : `Moved ${storyCode} to ${getStatusLabel(newValue)}`;
        }
        return `Updated ${(fieldChanged || 'a field').replace('_', ' ')} on ${storyCode}`;
    }
    if (entityType === 'sub_task') {
        if (actionType === 'created') return `Added sub-item "${newValue}" on ${storyCode}`;
        if (actionType === 'moved') {
            return oldValue != null
                ? `Moved a sub-item on ${storyCode} from ${getStatusLabel(oldValue)} to ${getStatusLabel(newValue)}`
                : `Moved a sub-item on ${storyCode} to ${getStatusLabel(newValue)}`;
        }
        return `Updated a sub-item on ${storyCode}`;
    }
    if (entityType === 'epic') {
        return actionType === 'created' ? `Created epic "${newValue}"` : `Updated epic "${newValue}"`;
    }
    if (entityType === 'sprint') {
        if (actionType === 'created') return `Created sprint "${newValue}"`;
        if (fieldChanged === 'status') return `Sprint status changed to ${newValue}`;
        return `Updated sprint "${newValue}"`;
    }
    return `${actionType} ${entityType}`;
};

const formatRelativeTime = (isoString) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
};

const ForYou = () => {
    const { projectId } = useParams();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activityItems, setActivityItems] = useState([]);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityLoadingMore, setActivityLoadingMore] = useState(false);

    useEffect(() => {
        fetchTasks();
        fetchActivity(0);
    }, [projectId]);

    const activityLink = (item) => {
        if (item.entityType === 'story' || item.entityType === 'sub_task') {
            return `/project/${projectId}/story/${item.storyId}`;
        }
        if (item.entityType === 'epic') return `/project/${projectId}/epics`;
        if (item.entityType === 'sprint') return `/project/${projectId}/sprints`;
        return null;
    };

    const fetchActivity = async (offset) => {
        if (offset === 0) setActivityLoading(true);
        else setActivityLoadingMore(true);

        try {
            const response = await api.get(`/for-you/project/${projectId}/activity`, { params: { offset, limit: ACTIVITY_LIMIT } });
            setActivityItems(offset === 0 ? response.data.items : [...activityItems, ...response.data.items]);
            setActivityHasMore(response.data.hasMore);
        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setActivityLoading(false);
            setActivityLoadingMore(false);
        }
    };

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

    return (
        <div>
            <h2 className="mb-lg">My Tasks</h2>

            {loading ? (
                <div className="text-center">Loading tasks...</div>
            ) : tasks.length === 0 ? (
                <div className="card text-center">
                    <h3>No Tasks Assigned</h3>
                    <p className="text-muted mt-md">You don't have any tasks assigned in this project</p>
                </div>
            ) : (
                <div className="card">
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

            {/* Activity */}
            <div className="mt-xl">
                <h2 className="mb-lg">Activity</h2>
                {activityLoading ? (
                    <div className="text-center">Loading activity...</div>
                ) : activityItems.length === 0 ? (
                    <div className="card text-center">
                        <h3>No Activity Yet</h3>
                        <p className="text-muted mt-md">Your recent actions in this project will show up here</p>
                    </div>
                ) : (
                    <div className="card">
                        {activityItems.map((item, index) => {
                            const link = activityLink(item);
                            const content = (
                                <div
                                    className="flex flex-between"
                                    style={{
                                        padding: 'var(--spacing-sm) 0',
                                        borderBottom: index < activityItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>{describeActivity(item)}</span>
                                    <span className="text-muted text-small" style={{ whiteSpace: 'nowrap', marginLeft: 'var(--spacing-md)' }}>
                                        {formatRelativeTime(item.changedAt)}
                                    </span>
                                </div>
                            );

                            return link ? (
                                <Link key={item.id} to={link} style={{ color: 'var(--color-text)', textDecoration: 'none', display: 'block' }}>
                                    {content}
                                </Link>
                            ) : (
                                <div key={item.id}>{content}</div>
                            );
                        })}
                        {activityHasMore && (
                            <div className="text-center mt-md">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => fetchActivity(activityItems.length)}
                                    disabled={activityLoadingMore}
                                >
                                    {activityLoadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForYou;
