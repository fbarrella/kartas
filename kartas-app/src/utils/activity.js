export const formatRelativeTime = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const FIELD_LABELS = {
    status: 'status',
    assignee_id: 'assignee',
    epic_id: 'epic',
    title: 'title',
    description: 'description',
    story_points: 'story points',
    is_blocked: 'blocked state',
    type: 'type'
};

// Scoped to a single story's own history section (HIST-02) — unlike ForYou.jsx's
// describeActivity, this never needs to describe/link a *different* entity, since
// the page it renders on already is the entity.
export const describeHistoryEntry = (item) => {
    if (item.actionType === 'created') {
        return `${item.userName || 'Someone'} created this`;
    }
    if (item.actionType === 'moved' && item.fieldChanged === 'status') {
        return `${item.userName || 'Someone'} changed status to "${item.newValue}"`;
    }
    const field = FIELD_LABELS[item.fieldChanged] || item.fieldChanged;
    return `${item.userName || 'Someone'} updated ${field}`;
};
