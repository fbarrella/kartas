import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import MarkdownEditor from './MarkdownEditor';

// Label text is translated via t(); `value` fields are stable identifiers
// used for API/DB values and must never be translated.
export const getSubItemTypeOptions = (t) => [
    { value: 'sub_task', label: t('storyDetail:types.subTask'), icon: '🔧' },
    { value: 'sub_test', label: t('storyDetail:types.subTest'), icon: '🧪' }
];

export const getSubItemStatusOptions = (t) => [
    { value: 'backlog', label: t('storyDetail:statuses.backlog'), color: 'var(--color-neutral-400)' },
    { value: 'refining', label: t('storyDetail:statuses.refining'), color: 'var(--color-info)' },
    { value: 'ready', label: t('storyDetail:statuses.ready'), color: 'var(--color-success)' },
    { value: 'in_development', label: t('storyDetail:statuses.inDevelopment'), color: 'var(--color-warning)' },
    { value: 'review', label: t('storyDetail:statuses.review'), color: 'var(--color-secondary)' },
    { value: 'test', label: t('storyDetail:statuses.test'), color: 'var(--color-info)' },
    { value: 'done', label: t('storyDetail:statuses.done'), color: 'var(--color-success)' },
    { value: 'cancelled', label: t('storyDetail:statuses.cancelled'), color: 'var(--color-danger)' }
];

// mode: 'create' | 'edit'
// storyId: required when mode === 'create'
// subItem: required when mode === 'edit'
// members: project members list, for the assignee <select>
// onClose(), onSaved(): callbacks
const SubItemEditModal = ({ mode, storyId, subItem, members, onClose, onSaved }) => {
    const { t } = useTranslation(['storyDetail', 'common']);
    const SUBITEM_TYPE_OPTIONS = getSubItemTypeOptions(t);
    const SUBITEM_STATUS_OPTIONS = getSubItemStatusOptions(t);
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
            setError(err.response?.data?.error || t('storyDetail:subItemModal.failedToSave'));
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
            <div className="card" style={{ maxWidth: '650px', width: '100%', margin: 'var(--spacing-md)' }}
                onClick={(e) => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">{mode === 'edit' ? t('storyDetail:subItemModal.editTitle') : t('storyDetail:subItemModal.createTitle')}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('storyDetail:fields.type')}</label>
                        <select className="form-select" value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            {SUBITEM_TYPE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('common:title')} *</label>
                        <input type="text" className="form-input" value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('common:description')}</label>
                        <MarkdownEditor
                            value={form.description}
                            onChange={(v) => setForm({ ...form, description: v })}
                            rows={6}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('common:status')}</label>
                        <select className="form-select" value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {SUBITEM_STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('storyDetail:fields.storyPoints')}</label>
                        <input type="number" className="form-input" min="0" value={form.storyPoints}
                            onChange={(e) => setForm({ ...form, storyPoints: e.target.value })} placeholder={t('storyDetail:subItemModal.storyPointsPlaceholder')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('storyDetail:fields.assignee')}</label>
                        <select className="form-select" value={form.assigneeId || ''}
                            onChange={(e) => setForm({ ...form, assigneeId: e.target.value ? parseInt(e.target.value) : null })}>
                            <option value="">{t('storyDetail:fields.unassigned')}</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>
                    {error && <div className="form-error mb-md">{error}</div>}
                    <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">{t('common:cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('common:saving') : mode === 'edit' ? t('common:saveChanges') : t('common:create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubItemEditModal;
