import React, { useState } from 'react';
import api from '../services/api';

export const SUBITEM_TYPE_OPTIONS = [
    { value: 'sub_task', label: 'Sub-Task', icon: '🔧' },
    { value: 'sub_test', label: 'Sub-Test', icon: '🧪' }
];

export const SUBITEM_STATUS_OPTIONS = [
    { value: 'backlog', label: 'Backlog', color: 'var(--color-neutral-400)' },
    { value: 'refining', label: 'Refining', color: 'var(--color-info)' },
    { value: 'ready', label: 'Ready', color: 'var(--color-success)' },
    { value: 'in_development', label: 'In Development', color: 'var(--color-warning)' },
    { value: 'review', label: 'Review', color: 'var(--color-secondary)' },
    { value: 'test', label: 'Test', color: 'var(--color-info)' },
    { value: 'done', label: 'Done', color: 'var(--color-success)' },
    { value: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' }
];

// mode: 'create' | 'edit'
// storyId: required when mode === 'create'
// subItem: required when mode === 'edit'
// members: project members list, for the assignee <select>
// onClose(), onSaved(): callbacks
const SubItemEditModal = ({ mode, storyId, subItem, members, onClose, onSaved }) => {
    const [form, setForm] = useState({
        title: subItem?.title || '',
        description: subItem?.description || '',
        type: subItem?.type || 'sub_task',
        status: subItem?.status || 'backlog',
        storyPoints: subItem?.storyPoints ?? '',
        assigneeId: subItem?.assigneeId || null
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            title: form.title,
            description: form.description,
            type: form.type,
            status: form.status,
            storyPoints: form.storyPoints !== '' ? parseInt(form.storyPoints) : null,
            assigneeId: form.assigneeId || null
        };
        try {
            if (mode === 'edit') {
                await api.put(`/sub-tasks/${subItem.id}`, payload);
            } else {
                await api.post(`/stories/${storyId}/sub-tasks`, payload);
            }
            await onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save sub-item');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, overflowY: 'auto'
        }} onClick={onClose}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'var(--spacing-md)' }}
                onClick={(e) => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">{mode === 'edit' ? 'Edit Sub-Item' : 'Create Sub-Item'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            {SUBITEM_TYPE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input type="text" className="form-input" value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={4} value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {SUBITEM_STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Story Points</label>
                        <input type="number" className="form-input" min="0" value={form.storyPoints}
                            onChange={(e) => setForm({ ...form, storyPoints: e.target.value })} placeholder="Optional" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Assignee</label>
                        <select className="form-select" value={form.assigneeId || ''}
                            onChange={(e) => setForm({ ...form, assigneeId: e.target.value ? parseInt(e.target.value) : null })}>
                            <option value="">Unassigned</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>
                    {error && <div className="form-error mb-md">{error}</div>}
                    <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubItemEditModal;
