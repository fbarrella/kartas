import React, { useState, useEffect } from 'react';
import api from '../services/api';

// BKP-03/BKP-04: mirrors AdminEmailSettings.jsx's structure (own loading/error/
// saving/successMessage state, fetch-on-mount, api.get/api.put). Unlike email
// settings, nothing here is ever env-locked — every field is always editable,
// so there's no EnvHint/editable gating, just the "blank submit = leave
// unchanged" behavior for the S3 secret.
const PAGE_SIZE = 20;

const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return '—';
    const n = Number(bytes);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PasswordField = ({ label, configured, value, onChange }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        <input
            type="password"
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={configured ? 'Leave blank to keep the current value' : 'Not set'}
        />
    </div>
);

const AdminBackupSettings = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [data, setData] = useState(null);
    const [draft, setDraft] = useState(null);

    const [runningBackup, setRunningBackup] = useState(false);
    const [runMessage, setRunMessage] = useState('');
    const [runError, setRunError] = useState('');

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [hasMore, setHasMore] = useState(false);

    const [restoreSource, setRestoreSource] = useState('upload');
    const [restoreFile, setRestoreFile] = useState(null);
    const [restoreHistoryId, setRestoreHistoryId] = useState('');
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [restoring, setRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState('');
    const [restoreSuccess, setRestoreSuccess] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchHistory(0);
    }, []);

    const draftFrom = (settings) => ({
        destinationType: settings.destinationType,
        localPath: settings.localPath || '',
        s3Bucket: settings.s3Bucket || '',
        s3Region: settings.s3Region || '',
        s3AccessKeyId: settings.s3AccessKeyId || '',
        s3SecretAccessKey: '',
        scheduleFrequency: settings.scheduleFrequency,
        scheduleTime: settings.scheduleTime,
        scheduleDayOfWeek: settings.scheduleDayOfWeek ?? 0,
        retentionCount: settings.retentionCount,
        enabled: settings.enabled
    });

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/system-settings/backup');
            setData(response.data);
            setDraft(draftFrom(response.data));
        } catch (err) {
            console.error('Error fetching system backup settings:', err);
            setError('Failed to load system backup settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (offset) => {
        setHistoryLoading(true);
        setHistoryError('');
        try {
            const response = await api.get(`/system-settings/backup/history?limit=${PAGE_SIZE}&offset=${offset}`);
            setHistory((prev) => (offset === 0 ? response.data.items : [...prev, ...response.data.items]));
            setHasMore(response.data.hasMore);
        } catch (err) {
            console.error('Error fetching backup history:', err);
            setHistoryError('Failed to load backup history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSaving(true);

        const payload = {
            destinationType: draft.destinationType,
            localPath: draft.localPath,
            s3Bucket: draft.s3Bucket,
            s3Region: draft.s3Region,
            s3AccessKeyId: draft.s3AccessKeyId,
            scheduleFrequency: draft.scheduleFrequency,
            scheduleTime: draft.scheduleTime,
            scheduleDayOfWeek: draft.scheduleFrequency === 'weekly' ? parseInt(draft.scheduleDayOfWeek, 10) : undefined,
            retentionCount: parseInt(draft.retentionCount, 10),
            enabled: draft.enabled
        };
        if (draft.s3SecretAccessKey) payload.s3SecretAccessKey = draft.s3SecretAccessKey;

        try {
            const response = await api.put('/system-settings/backup', payload);
            setData(response.data);
            setDraft(draftFrom(response.data));
            setSuccessMessage('Backup settings saved');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save backup settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRunNow = async () => {
        setRunningBackup(true);
        setRunMessage('');
        setRunError('');
        try {
            const response = await api.post('/system-settings/backup/run');
            if (response.data.status === 'success') {
                setRunMessage(`Backup completed: ${response.data.filename}`);
            } else {
                setRunError(response.data.errorMessage || 'Backup failed');
            }
            fetchHistory(0);
        } catch (err) {
            setRunError(err.response?.data?.error || 'Failed to run backup');
        } finally {
            setRunningBackup(false);
        }
    };

    const handleDownload = async (item) => {
        try {
            const res = await api.get(`/system-settings/backup/${item.id}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = item.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading backup:', err);
        }
    };

    const handleRestore = async () => {
        setRestoring(true);
        setRestoreError('');
        setRestoreSuccess('');
        try {
            let payload;
            if (restoreSource === 'upload') {
                if (!restoreFile) {
                    setRestoreError('Choose a dump file to upload');
                    setRestoring(false);
                    return;
                }
                payload = new FormData();
                payload.append('file', restoreFile);
            } else {
                if (!restoreHistoryId) {
                    setRestoreError('Choose a backup to restore from');
                    setRestoring(false);
                    return;
                }
                payload = { backupHistoryId: restoreHistoryId };
            }
            await api.post('/system-settings/backup/restore', payload);
            setRestoreSuccess('Restore completed successfully.');
        } catch (err) {
            setRestoreError(err.response?.data?.error || 'Restore failed');
        } finally {
            setRestoring(false);
            setConfirmPhrase('');
            setRestoreFile(null);
            setRestoreHistoryId('');
        }
    };

    if (loading) {
        return <div className="text-muted">Loading system backup settings...</div>;
    }

    if (!data) {
        return <div className="form-error">{error || 'System backup settings unavailable'}</div>;
    }

    const successfulHistory = history.filter((h) => h.status === 'success');

    return (
        <div>
            <form onSubmit={handleSave}>
                {error && <div className="form-error mb-md">{error}</div>}
                {successMessage && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{successMessage}</div>}

                <div className="form-group">
                    <label className="form-label">Destination</label>
                    <select
                        className="form-select"
                        value={draft.destinationType}
                        onChange={(e) => updateDraft('destinationType', e.target.value)}
                    >
                        <option value="local">Local folder</option>
                        <option value="s3">Amazon S3</option>
                    </select>
                </div>

                {draft.destinationType === 'local' ? (
                    <div className="form-group">
                        <label className="form-label">Local Path</label>
                        <input
                            type="text"
                            className="form-input"
                            value={draft.localPath}
                            onChange={(e) => updateDraft('localPath', e.target.value)}
                        />
                    </div>
                ) : (
                    <>
                        <div className="form-group">
                            <label className="form-label">S3 Bucket</label>
                            <input type="text" className="form-input" value={draft.s3Bucket} onChange={(e) => updateDraft('s3Bucket', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">S3 Region</label>
                            <input type="text" className="form-input" value={draft.s3Region} onChange={(e) => updateDraft('s3Region', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">S3 Access Key ID</label>
                            <input type="text" className="form-input" value={draft.s3AccessKeyId} onChange={(e) => updateDraft('s3AccessKeyId', e.target.value)} />
                        </div>
                        <PasswordField
                            label="S3 Secret Access Key"
                            configured={data.s3SecretAccessKey.configured}
                            value={draft.s3SecretAccessKey}
                            onChange={(v) => updateDraft('s3SecretAccessKey', v)}
                        />
                    </>
                )}

                <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <select
                        className="form-select"
                        value={draft.scheduleFrequency}
                        onChange={(e) => updateDraft('scheduleFrequency', e.target.value)}
                    >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>

                {draft.scheduleFrequency !== 'hourly' && (
                    <div className="form-group">
                        <label className="form-label">Time</label>
                        <input
                            type="time"
                            className="form-input"
                            value={draft.scheduleTime}
                            onChange={(e) => updateDraft('scheduleTime', e.target.value)}
                            style={{ maxWidth: '160px' }}
                        />
                    </div>
                )}

                {draft.scheduleFrequency === 'weekly' && (
                    <div className="form-group">
                        <label className="form-label">Day of Week</label>
                        <select
                            className="form-select"
                            value={draft.scheduleDayOfWeek}
                            onChange={(e) => updateDraft('scheduleDayOfWeek', e.target.value)}
                            style={{ maxWidth: '200px' }}
                        >
                            {DAY_NAMES.map((name, idx) => (
                                <option key={idx} value={idx}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Retention Count</label>
                    <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={draft.retentionCount}
                        onChange={(e) => updateDraft('retentionCount', e.target.value)}
                        style={{ maxWidth: '160px' }}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="switch switch-primary">
                        <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(e) => updateDraft('enabled', e.target.checked)}
                        />
                        <span className="switch-track">
                            <span className="switch-thumb" />
                        </span>
                        <span className="switch-text">Scheduled backups enabled</span>
                    </label>
                </div>

                <div className="flex flex-gap-sm mt-lg">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Backup Settings'}
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={runningBackup} onClick={handleRunNow}>
                        {runningBackup ? 'Running...' : 'Back Up Now'}
                    </button>
                </div>
                {runMessage && <div className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{runMessage}</div>}
                {runError && <div className="form-error mt-sm">{runError}</div>}
            </form>

            <h3 className="mt-lg mb-sm">Backup History</h3>
            {historyError && <div className="form-error mb-md">{historyError}</div>}
            {history.length === 0 && !historyLoading ? (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No backups yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Filename', 'Size', 'Destination', 'Status', 'Triggered By', 'Created At', ''].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{item.filename}</td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{formatBytes(item.sizeBytes)}</td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{item.destination}</td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                        <span className={`badge ${item.status === 'success' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{item.triggeredBy}</td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>{new Date(item.createdAt).toLocaleString()}</td>
                                    <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                        {item.downloadable && (
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDownload(item)}>
                                                Download
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {hasMore && (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-sm"
                    disabled={historyLoading}
                    onClick={() => fetchHistory(history.length)}
                >
                    {historyLoading ? 'Loading...' : 'Load more'}
                </button>
            )}

            <div className="card mt-lg" style={{ borderColor: 'var(--color-danger)' }}>
                <h3 className="mb-sm">Restore Database</h3>
                <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                    This is a single-process restore — the app is not restarted, but in-flight requests may transiently fail while the restore runs.
                    The connection pool reconnects automatically afterward; no manual restart is needed.
                    <strong> This action overwrites the current database and cannot be undone.</strong>
                </p>

                <div className="form-group">
                    <label className="flex flex-gap-sm" style={{ alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                        <input type="radio" checked={restoreSource === 'upload'} onChange={() => setRestoreSource('upload')} />
                        <span>Upload a dump file</span>
                    </label>
                    <label className="flex flex-gap-sm" style={{ alignItems: 'center' }}>
                        <input type="radio" checked={restoreSource === 'history'} onChange={() => setRestoreSource('history')} />
                        <span>Restore from an existing backup</span>
                    </label>
                </div>

                {restoreSource === 'upload' ? (
                    <div className="form-group">
                        <input
                            type="file"
                            onChange={(e) => setRestoreFile(e.target.files[0])}
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <select
                            className="form-select"
                            value={restoreHistoryId}
                            onChange={(e) => setRestoreHistoryId(e.target.value)}
                        >
                            <option value="">Select a backup...</option>
                            {successfulHistory.map((h) => (
                                <option key={h.id} value={h.id}>{h.filename} ({new Date(h.createdAt).toLocaleString()})</option>
                            ))}
                        </select>
                    </div>
                )}

                {restoreError && <div className="form-error mb-md">{restoreError}</div>}
                {restoreSuccess && <div className="alert alert-success mb-md" style={{ color: 'var(--color-success)' }}>{restoreSuccess}</div>}

                <div className="form-group">
                    <label className="form-label">Type RESTORE to confirm</label>
                    <input
                        type="text"
                        className="form-input"
                        value={confirmPhrase}
                        onChange={(e) => setConfirmPhrase(e.target.value)}
                        placeholder="RESTORE"
                        style={{ maxWidth: '240px' }}
                    />
                </div>

                <button
                    type="button"
                    className="btn btn-danger"
                    disabled={confirmPhrase !== 'RESTORE' || restoring}
                    onClick={handleRestore}
                >
                    {restoring ? 'Restoring...' : 'Restore Database'}
                </button>
            </div>
        </div>
    );
};

export default AdminBackupSettings;
