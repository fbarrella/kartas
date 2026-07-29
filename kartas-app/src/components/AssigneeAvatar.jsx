import React from 'react';
import { getAvatarColor, getInitialsFromFullName } from '../utils/avatar';
import './navigation.css';

const AssigneeAvatar = ({ assigneeId, assigneeName }) => (
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
            <span className="assignee-avatar-sm-unassigned" title="Unassigned">?</span>
        )}
    </span>
);

export default AssigneeAvatar;
