import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatRelativeTime } from '../utils/activity';

const PAGE_SIZE = 10;

// FY-03: renamed from "Activity" — data/query are unchanged from Phase 4/5,
// this is still the viewer's own actions, just relabeled and page-sized down
// to 10 (from 20) per the PRD. Distinct from the new LatestActivitiesWidget
// (FY-04), which shows *other* people's actions instead.
const describeActivity = (item, t) => {
    const { actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;
    const statusLabel = (value) => t(`dashboard:statusLabels.${value}`, { defaultValue: value });

    if (entityType === 'story') {
        if (actionType === 'created') return t('dashboard:actionsHistoryWidget.createdStory', { code: storyCode, title: newValue });
        if (actionType === 'commented') return t('dashboard:actionsHistoryWidget.commentedOnStory', { code: storyCode, comment: newValue });
        if (actionType === 'moved') {
            return oldValue != null
                ? t('dashboard:actionsHistoryWidget.movedStoryFromTo', { code: storyCode, from: statusLabel(oldValue), to: statusLabel(newValue) })
                : t('dashboard:actionsHistoryWidget.movedStoryTo', { code: storyCode, to: statusLabel(newValue) });
        }
        const fieldLabel = (fieldChanged ? fieldChanged.replace('_', ' ') : t('dashboard:actionsHistoryWidget.defaultFieldChanged'));
        return t('dashboard:actionsHistoryWidget.updatedFieldOnStory', { field: fieldLabel, code: storyCode });
    }
    if (entityType === 'sub_task') {
        if (actionType === 'created') return t('dashboard:actionsHistoryWidget.addedSubItem', { title: newValue, code: storyCode });
        if (actionType === 'moved') {
            return oldValue != null
                ? t('dashboard:actionsHistoryWidget.movedSubItemFromTo', { code: storyCode, from: statusLabel(oldValue), to: statusLabel(newValue) })
                : t('dashboard:actionsHistoryWidget.movedSubItemTo', { code: storyCode, to: statusLabel(newValue) });
        }
        return t('dashboard:actionsHistoryWidget.updatedSubItem', { code: storyCode });
    }
    if (entityType === 'epic') {
        return actionType === 'created'
            ? t('dashboard:actionsHistoryWidget.createdEpic', { title: newValue })
            : t('dashboard:actionsHistoryWidget.updatedEpic', { title: newValue });
    }
    if (entityType === 'sprint') {
        if (actionType === 'created') return t('dashboard:actionsHistoryWidget.createdSprint', { title: newValue });
        if (fieldChanged === 'status') return t('dashboard:actionsHistoryWidget.sprintStatusChanged', { status: newValue });
        return t('dashboard:actionsHistoryWidget.updatedSprint', { title: newValue });
    }
    return t('dashboard:actionsHistoryWidget.genericActivity', { actionType, entityType });
};

const activityLink = (item, projectId) => {
    if (item.entityType === 'story' || item.entityType === 'sub_task') {
        return `/project/${projectId}/story/${item.storyId}`;
    }
    if (item.entityType === 'epic') return `/project/${projectId}/epics`;
    if (item.entityType === 'sprint') return `/project/${projectId}/sprints`;
    return null;
};

const ActionsHistoryWidget = ({ projectId }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchActivity = async (offset) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await api.get(`/for-you/project/${projectId}/activity`, { params: { offset, limit: PAGE_SIZE } });
            setItems(prev => offset === 0 ? response.data.items : [...prev, ...response.data.items]);
            setHasMore(response.data.hasMore);
        } catch (error) {
            console.error('Error fetching actions history:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchActivity(0);
    }, [projectId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{t('dashboard:actionsHistoryWidget.title')}</h3>
            </div>

            {loading ? (
                <div className="text-center">{t('common:loading')}</div>
            ) : items.length === 0 ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">{t('dashboard:actionsHistoryWidget.empty')}</p>
                </div>
            ) : (
                <>
                    {items.map((item, index) => {
                        const link = activityLink(item, projectId);
                        const content = (
                            <div
                                className="flex flex-between"
                                style={{
                                    padding: 'var(--spacing-sm) 0',
                                    borderBottom: index < items.length - 1 ? '1px solid var(--color-border)' : 'none',
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
                    {hasMore && (
                        <div className="text-center mt-md">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => fetchActivity(items.length)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? t('common:loading') : t('dashboard:actionsHistoryWidget.loadMore')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ActionsHistoryWidget;
