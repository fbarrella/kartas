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

const STATUS_LABELS = {
    backlog: 'Backlog', refining: 'Refining', ready: 'Ready',
    in_development: 'In Development', review: 'Review', test: 'Test',
    done: 'Done', cancelled: 'Cancelled'
};

// FY-04's "Latest Activities" widget — third-person descriptions of *other*
// users' actions (unlike ForYou.jsx's own describeActivity, which narrates the
// viewer's own actions in first person/imperative, e.g. "Moved X to Y").
export const describeLatestActivity = (item) => {
    if (item.kind === 'mention') {
        return `${item.actorName || 'Someone'} mentioned you in a comment on ${item.storyCode}`;
    }
    const { actorName, actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;
    const who = actorName || 'Someone';
    const target = entityType === 'sub_task' ? `a sub-item on ${storyCode}` : storyCode;

    if (actionType === 'created') return `${who} created ${target}`;
    if (actionType === 'moved') {
        const from = STATUS_LABELS[oldValue] || oldValue;
        const to = STATUS_LABELS[newValue] || newValue;
        return oldValue != null
            ? `${who} moved ${target} from ${from} to ${to}`
            : `${who} moved ${target} to ${to}`;
    }
    const field = FIELD_LABELS[fieldChanged] || fieldChanged || 'a field';
    return `${who} updated ${field} on ${target}`;
};
