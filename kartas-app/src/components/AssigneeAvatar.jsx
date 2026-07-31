import React from 'react';
import { useTranslation } from 'react-i18next';
import { getAvatarColor, getInitialsFromFullName } from '../utils/avatar';
import './navigation.css';

const AssigneeAvatar = ({ assigneeId, assigneeName }) => {
    const { t } = useTranslation(['users']);
    return (
        <span className="flex flex-center" style={{ gap: '4px' }} data-assignee-id={assigneeId || undefined}>
            {assigneeName ? (
                <span
                    className="assignee-avatar-sm"
                    style={{ backgroundColor: getAvatarColor(assigneeId) }}
                    title={assigneeName}
                >
                    {getInitialsFromFullName(assigneeName)}
                </span>
            ) : (
                <span className="assignee-avatar-sm-unassigned" title={t('users:avatar.unassigned')}>?</span>
            )}
        </span>
    );
};

export default AssigneeAvatar;
