import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

// CLONE-02: shared Yes/No sub-task prompt used by both Backlog.jsx and
// StoryDetail.jsx — both need the identical prompt calling the identical
// endpoint, so it's a single small component rather than duplicated JSX.
const CloneStoryModal = ({ story, onClose, onCloned }) => {
    const { t } = useTranslation(['backlog', 'common']);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const doClone = async (includeSubtasks) => {
        setSaving(true);
        setError('');
        try {
            const response = await api.post(`/stories/${story.id}/clone`, { includeSubtasks });
            onCloned(response.data);
        } catch (err) {
            setError(err.response?.data?.error || t('backlog:errors.cloneStory'));
            setSaving(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{ maxWidth: '500px', width: '100%', margin: 'var(--spacing-md)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="card-header">
                    <h3 className="card-title">{t('backlog:cloneModal.title')}</h3>
                </div>
                <p>
                    {t('backlog:cloneModal.promptPrefix')} <strong>{story.storyId}</strong>{t('backlog:cloneModal.promptSuffix')}
                </p>
                <p className="text-small text-muted mt-sm">
                    {t('backlog:cloneModal.includeSubtasksPrompt')}
                </p>

                {error && (
                    <div className="form-error mt-md">{error}</div>
                )}

                <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={saving} className="btn btn-secondary">
                        {t('common:cancel')}
                    </button>
                    <button onClick={() => doClone(false)} disabled={saving} className="btn btn-secondary">
                        {t('backlog:cloneModal.noSubtasks')}
                    </button>
                    <button onClick={() => doClone(true)} disabled={saving} className="btn btn-primary">
                        {saving ? t('backlog:cloneModal.cloning') : t('backlog:cloneModal.yesIncludeSubtasks')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloneStoryModal;
