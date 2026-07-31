import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatRelativeTime, describeLatestActivity } from '../utils/activity';

const PAGE_SIZE = 10;

// FY-04: a *separate* feed from ActionsHistoryWidget (FY-03) — other users'
// changes to items assigned to me, plus comment @mentions of me anywhere in
// the project (CMT-04's comment_mentions table), not my own actions.
const activityLink = (item, projectId) => {
    if (item.kind === 'mention') {
        return `/project/${projectId}/story/${item.storyId}#comment-${item.commentId}`;
    }
    return `/project/${projectId}/story/${item.storyId}`;
};

const LatestActivitiesWidget = ({ projectId }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchLatest = async (offset) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await api.get(`/for-you/project/${projectId}/latest-activities`, { params: { offset, limit: PAGE_SIZE } });
            setItems(prev => offset === 0 ? response.data.items : [...prev, ...response.data.items]);
            setHasMore(response.data.hasMore);
        } catch (error) {
            console.error('Error fetching latest activities:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchLatest(0);
    }, [projectId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{t('dashboard:latestActivitiesWidget.title')}</h3>
            </div>

            {loading ? (
                <div className="text-center">{t('common:loading')}</div>
            ) : items.length === 0 ? (
                <div className="text-center">
                    <p className="text-muted mt-md mb-md">{t('dashboard:latestActivitiesWidget.empty')}</p>
                </div>
            ) : (
                <>
                    {items.map((item, index) => (
                        <Link
                            key={item.id}
                            to={activityLink(item, projectId)}
                            style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                        >
                            <div
                                className="flex flex-between"
                                style={{
                                    padding: 'var(--spacing-sm) 0',
                                    borderBottom: index < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    alignItems: 'center'
                                }}
                            >
                                <span>{describeLatestActivity(item, t)}</span>
                                <span className="text-muted text-small" style={{ whiteSpace: 'nowrap', marginLeft: 'var(--spacing-md)' }}>
                                    {formatRelativeTime(item.changedAt, t)}
                                </span>
                            </div>
                        </Link>
                    ))}
                    {hasMore && (
                        <div className="text-center mt-md">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => fetchLatest(items.length)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? t('common:loading') : t('dashboard:latestActivitiesWidget.loadMore')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LatestActivitiesWidget;
