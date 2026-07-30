import React, { useState } from 'react';
import api from '../services/api';

// CLONE-02: shared Yes/No sub-task prompt used by both Backlog.jsx and
// StoryDetail.jsx — both need the identical prompt calling the identical
// endpoint, so it's a single small component rather than duplicated JSX.
const CloneStoryModal = ({ story, onClose, onCloned }) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const doClone = async (includeSubtasks) => {
        setSaving(true);
        setError('');
        try {
            const response = await api.post(`/stories/${story.id}/clone`, { includeSubtasks });
            onCloned(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to clone story');
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
                    <h3 className="card-title">Clone Story</h3>
                </div>
                <p>
                    Clone <strong>{story.storyId}</strong>? The new story will be created in the Backlog.
                </p>
                <p className="text-small text-muted mt-sm">
                    Include this story's sub-tasks in the clone?
                </p>

                {error && (
                    <div className="form-error mt-md">{error}</div>
                )}

                <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={saving} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button onClick={() => doClone(false)} disabled={saving} className="btn btn-secondary">
                        No, sub-tasks
                    </button>
                    <button onClick={() => doClone(true)} disabled={saving} className="btn btn-primary">
                        {saving ? 'Cloning...' : 'Yes, include sub-tasks'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloneStoryModal;
