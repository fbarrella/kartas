export const formatRelativeTime = (dateStr, t) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('common:relativeTime.justNow');
    if (minutes < 60) return t('common:relativeTime.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('common:relativeTime.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('common:relativeTime.daysAgo', { count: days });
};

const fieldLabel = (t, field) => t(`common:fieldLabels.${field}`, { defaultValue: field });

// Scoped to a single story's own history section (HIST-02) — unlike ForYou.jsx's
// describeActivity, this never needs to describe/link a *different* entity, since
// the page it renders on already is the entity.
export const describeHistoryEntry = (item, t) => {
    const who = item.userName || t('common:someone');
    if (item.actionType === 'created') {
        return t('storyDetail:history.created', { user: who });
    }
    if (item.actionType === 'moved' && item.fieldChanged === 'status') {
        return t('storyDetail:history.statusChanged', { user: who, value: item.newValue });
    }
    const field = fieldLabel(t, item.fieldChanged);
    return t('storyDetail:history.updatedField', { user: who, field });
};

// FY-04's "Latest Activities" widget — third-person descriptions of *other*
// users' actions (unlike ForYou.jsx's own describeActivity, which narrates the
// viewer's own actions in first person/imperative, e.g. "Moved X to Y").
export const describeLatestActivity = (item, t) => {
    const who = item.actorName || t('common:someone');

    if (item.kind === 'mention') {
        return t('dashboard:latestActivitiesWidget.mentioned', { user: who, storyCode: item.storyCode });
    }
    const { actionType, entityType, fieldChanged, oldValue, newValue, storyCode } = item;
    const target = entityType === 'sub_task'
        ? t('dashboard:latestActivitiesWidget.subItemTarget', { storyCode })
        : storyCode;

    if (actionType === 'created') {
        return t('dashboard:latestActivitiesWidget.created', { user: who, target });
    }
    if (actionType === 'moved') {
        const from = t(`dashboard:statusLabels.${oldValue}`, { defaultValue: oldValue });
        const to = t(`dashboard:statusLabels.${newValue}`, { defaultValue: newValue });
        return oldValue != null
            ? t('dashboard:latestActivitiesWidget.movedFrom', { user: who, target, from, to })
            : t('dashboard:latestActivitiesWidget.movedTo', { user: who, target, to });
    }
    const field = fieldLabel(t, fieldChanged || 'field');
    return t('dashboard:latestActivitiesWidget.updatedField', { user: who, field, target });
};
