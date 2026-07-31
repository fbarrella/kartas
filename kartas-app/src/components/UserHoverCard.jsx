import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAvatarColor, getInitialsFromFullName } from '../utils/avatar';

const UserHoverCard = ({ assigneeId, assigneeName, assigneeRole, assigneeEmail, projectId }) => {
    const { t } = useTranslation(['users']);
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(assigneeEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="user-hover-card">
            <Link to={`/project/${projectId}/user/${assigneeId}`} className="user-hover-card-header">
                <span className="assignee-avatar-sm user-hover-card-avatar" style={{ backgroundColor: getAvatarColor(assigneeId) }}>
                    {getInitialsFromFullName(assigneeName)}
                </span>
                <div>
                    <div className="user-hover-card-name">{assigneeName}</div>
                    {assigneeRole && <div className="user-hover-card-role">{t(`users:roles.${assigneeRole}`, assigneeRole)}</div>}
                </div>
            </Link>
            <div className="user-hover-card-email-row">
                <span className="user-hover-card-email">{assigneeEmail}</span>
                <button type="button" className="user-hover-card-copy-btn" onClick={handleCopyEmail} title={t('users:hoverCard.copyEmail')}>
                    {copied ? t('users:hoverCard.copied') : t('users:hoverCard.copy')}
                </button>
            </div>
        </div>
    );
};

export default UserHoverCard;
