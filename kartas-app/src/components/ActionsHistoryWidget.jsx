import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatRelativeTime } from '../utils/activity';

const PAGE_SIZE = 10;

const STATUS_LABELS = {
    backlog: 'Backlog', refining: 'Refining', ready: 'Ready',
    in_development: 'In Development', review: 'Review', test: 'Test',
    done: 'Done', cancelled: 'Cancelled'
};

// FY-03: renamed from "Activity" — data/query are unchanged from Phase 4/5,
// this is still the viewer's own actions, just relabeled and page-sized down
// to 10 (from 20) per the PRD. Distinct from the new LatestActivitiesWidget
// (FY-04), which shows *other* people's actions instead.
const describeActivity = (item) => {
    const { actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;

    if (entityType === 'story') {
        if (actionType === 'created') return `Created story ${storyCode} — ${newValue}`;
        if (actionType === 'commented') return `Commented on ${storyCode}: "${newValue}"`;
        if (actionType === 'moved') {
            return oldValue != null
                ? `Moved ${storyCode} from ${STATUS_LABELS[oldValue] || oldValue} to ${STATUS_LABELS[newValue] || newValue}`
                : `Moved ${storyCode} to ${STATUS_LABELS[newValue] || newValue}`;
        }
        return `Updated ${(fieldChanged || 'a field').replace('_', ' ')} on ${storyCode}`;
    }
    if (entityType === 'sub_task') {
        if (actionType === 'created') return `Added sub-item "${newValue}" on ${storyCode}`;
        if (actionType === 'moved') {
            return oldValue != null
                ? `Moved a sub-item on ${storyCode} from ${STATUS_LABELS[oldValue] || oldValue} to ${STATUS_LABELS[newValue] || newValue}`
                : `Moved a sub-item on ${storyCode} to ${STATUS_LABELS[newValue] || newValue}`;
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

const activityLink = (item, projectId) => {
    if (item.entityType === 'story' || item.entityType === 'sub_task') {
        return `/project/${projectId}/story/${item.storyId}`;
    }
    if (item.entityType === 'epic') return `/project/${projectId}/epics`;
    if (item.entityType === 'sprint') return `/project/${projectId}/sprints`;
    return null;
};

const ActionsHistoryWidget = ({ projectId }) => {
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
                <h3 className="card-title">Actions History</h3>
            </div>

            {loading ? (
                <div className="text-center">Loading...</div>
            ) : items.length === 0 ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">Your recent actions in this project will show up here</p>
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
                    {hasMore && (
                        <div className="text-center mt-md">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => fetchActivity(items.length)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ActionsHistoryWidget;
