import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import { getInitials, getAvatarColor } from '../utils/avatar';
import '../components/navigation.css';

const STATUS_ORDER = ['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'];
const STATUS_COLORS = {
    backlog: 'var(--color-neutral-400)',
    refining: 'var(--color-info)',
    ready: 'var(--color-success)',
    in_development: 'var(--color-warning)',
    review: 'var(--color-secondary)',
    test: 'var(--color-info)',
    done: 'var(--color-success)',
    cancelled: 'var(--color-danger)'
};

const getStatusColor = (status) => STATUS_COLORS[status] || 'var(--color-neutral-400)';
const getStatusLabel = (status, t) => (STATUS_ORDER.includes(status) ? t(`users:detail.statuses.${status}`) : status);

const ACTIVITY_LIMIT = 15;

const describeActivity = (item, t) => {
    const { actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;

    if (entityType === 'story') {
        if (actionType === 'created') return t('users:detail.activityMessages.createdStory', { storyCode, value: newValue });
        if (actionType === 'commented') return t('users:detail.activityMessages.commented', { storyCode, value: newValue });
        if (actionType === 'moved') {
            return oldValue != null
                ? t('users:detail.activityMessages.movedFromTo', { storyCode, from: getStatusLabel(oldValue, t), to: getStatusLabel(newValue, t) })
                : t('users:detail.activityMessages.movedTo', { storyCode, to: getStatusLabel(newValue, t) });
        }
        const field = fieldChanged ? fieldChanged.replace('_', ' ') : t('users:detail.activityMessages.genericField');
        return t('users:detail.activityMessages.updatedField', { field, storyCode });
    }
    if (entityType === 'sub_task') {
        if (actionType === 'created') return t('users:detail.activityMessages.addedSubItem', { storyCode, value: newValue });
        if (actionType === 'moved') {
            return oldValue != null
                ? t('users:detail.activityMessages.movedSubItemFromTo', { storyCode, from: getStatusLabel(oldValue, t), to: getStatusLabel(newValue, t) })
                : t('users:detail.activityMessages.movedSubItemTo', { storyCode, to: getStatusLabel(newValue, t) });
        }
        return t('users:detail.activityMessages.updatedSubItem', { storyCode });
    }
    if (entityType === 'epic') {
        return actionType === 'created'
            ? t('users:detail.activityMessages.createdEpic', { value: newValue })
            : t('users:detail.activityMessages.updatedEpic', { value: newValue });
    }
    if (entityType === 'sprint') {
        if (actionType === 'created') return t('users:detail.activityMessages.createdSprint', { value: newValue });
        if (fieldChanged === 'status') return t('users:detail.activityMessages.sprintStatusChanged', { value: newValue });
        return t('users:detail.activityMessages.updatedSprint', { value: newValue });
    }
    return t('users:detail.activityMessages.generic', { actionType, entityType });
};

const formatRelativeTime = (isoString, t) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('users:detail.relativeTime.justNow');
    if (diffMin < 60) return t('users:detail.relativeTime.minutesAgo', { count: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('users:detail.relativeTime.hoursAgo', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return t('users:detail.relativeTime.daysAgo', { count: diffDays });
    return new Date(isoString).toLocaleDateString();
};

const UserDetail = () => {
    const { t } = useTranslation(['users', 'common']);
    const roleLabel = (role) => t(`users:roles.${role}`, role);
    const { projectId, userId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const [member, setMember] = useState(null);
    const [memberLoading, setMemberLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [activityItems, setActivityItems] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        fetchMember();
        fetchTasks();
        fetchActivity();
    }, [projectId, userId]);

    const fetchMember = async () => {
        setMemberLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/members`);
            const found = response.data.find(m => String(m.id) === String(userId));
            setMember(found || null);
        } catch (error) {
            console.error('Error fetching project members:', error);
        } finally {
            setMemberLoading(false);
        }
    };

    const fetchTasks = async () => {
        setTasksLoading(true);
        try {
            const response = await api.get(`/for-you/project/${projectId}/user/${userId}/tasks`);
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching assigned tasks:', error);
        } finally {
            setTasksLoading(false);
        }
    };

    const fetchActivity = async () => {
        setActivityLoading(true);
        try {
            const response = await api.get(`/for-you/project/${projectId}/user/${userId}/activity`, { params: { limit: ACTIVITY_LIMIT } });
            setActivityItems(response.data.items);
        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setActivityLoading(false);
        }
    };

    const activityLink = (item) => {
        if (item.entityType === 'story' || item.entityType === 'sub_task') {
            return `/project/${projectId}/story/${item.storyId}`;
        }
        if (item.entityType === 'epic') return `/project/${projectId}/epics`;
        if (item.entityType === 'sprint') return `/project/${projectId}/sprints`;
        return null;
    };

    if (memberLoading) {
        return <div className="container mt-lg">{t('common:loading')}</div>;
    }

    if (!member) {
        return (
            <div className="container mt-lg">
                <div className="card">
                    <h2>{t('users:detail.memberNotFound')}</h2>
                    <Link to={`/project/${projectId}/team`} className="btn btn-primary mt-md">
                        {t('users:detail.backToTeam')}
                    </Link>
                </div>
            </div>
        );
    }

    const fullName = `${member.firstName} ${member.lastName}`;

    return (
        <div>
            <Breadcrumb items={[
                { label: t('users:detail.projects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('users:detail.teamMembers'), to: `/project/${projectId}/team` },
                { label: t('users:detail.detailsTitle', { name: fullName }) },
            ]} />

            <div className="mb-lg">
                <div className="user-avatar" style={{
                    width: '56px',
                    height: '56px',
                    fontSize: 'var(--font-size-lg)',
                    backgroundColor: getAvatarColor(member.id),
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    {getInitials(member.firstName, member.lastName)}
                </div>
                <h2 style={{ margin: 0 }}>{t('users:detail.detailsTitle', { name: fullName })}</h2>
                <p className="text-muted mt-xs">
                    {roleLabel(member.role)} · {member.email}
                </p>
            </div>

            {tasksLoading ? (
                <div className="text-center">{t('users:detail.loadingTasks')}</div>
            ) : tasks.length === 0 ? (
                <div className="card text-center">
                    <h3>{t('users:detail.noTasksTitle')}</h3>
                    <p className="text-muted mt-md">{t('users:detail.noTasksSubtitle', { firstName: member.firstName })}</p>
                </div>
            ) : (
                <div className="card">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:detail.task')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:detail.epic')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:detail.sprint')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('common:status')}</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>{t('users:detail.points')}</th>
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
                                                    {t('users:detail.subItem')}
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
                                            {getStatusLabel(task.status, t)}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>{task.storyPoints ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Activity — hard-capped at 15 most recent, no "Load More" */}
            <div className="mt-xl">
                <h2 className="mb-lg">{t('users:detail.activity')}</h2>
                {activityLoading ? (
                    <div className="text-center">{t('users:detail.loadingActivity')}</div>
                ) : activityItems.length === 0 ? (
                    <div className="card text-center">
                        <h3>{t('users:detail.noActivityTitle')}</h3>
                        <p className="text-muted mt-md">{t('users:detail.noActivitySubtitle', { firstName: member.firstName })}</p>
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
                                    <span>{describeActivity(item, t)}</span>
                                    <span className="text-muted text-small" style={{ whiteSpace: 'nowrap', marginLeft: 'var(--spacing-md)' }}>
                                        {formatRelativeTime(item.changedAt, t)}
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDetail;
