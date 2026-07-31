import fs from 'fs';
import { query } from '../config/database.js';
import * as backupService from '../services/backupService.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// BKP-01: unlike MAIL-01's fields, none of these have an env-var fallback —
// every field is always editable. Masking only ever hides the secret's real
// value, never an env-lock state.
const shapeSettings = (row) => ({
    destinationType: row.destination_type,
    localPath: row.local_path,
    s3Bucket: row.s3_bucket,
    s3Region: row.s3_region,
    s3AccessKeyId: row.s3_access_key_id,
    s3SecretAccessKey: { configured: !!row.s3_secret_access_key },
    scheduleFrequency: row.schedule_frequency,
    scheduleTime: row.schedule_time,
    scheduleDayOfWeek: row.schedule_day_of_week,
    retentionCount: row.retention_count,
    enabled: row.enabled,
    updatedAt: row.updated_at
});

export const backupController = {
    async getSettings(req, res) {
        try {
            const result = await query('SELECT * FROM system_backup_settings WHERE id = 1');
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System backup settings not found' });
            }
            res.json(shapeSettings(result.rows[0]));
        } catch (error) {
            console.error('Error fetching system backup settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Admin-only. Manual validation guard, matching updateTheme/updateEmail's
    // convention — validationResult() is never enforced anywhere in this codebase.
    async updateSettings(req, res) {
        try {
            const {
                destinationType, localPath, s3Bucket, s3Region, s3AccessKeyId, s3SecretAccessKey,
                scheduleFrequency, scheduleTime, scheduleDayOfWeek, retentionCount, enabled
            } = req.body;

            if (!['local', 's3'].includes(destinationType)) {
                return res.status(400).json({ error: "destinationType must be 'local' or 's3'" });
            }
            if (destinationType === 'local' && !localPath) {
                return res.status(400).json({ error: 'localPath is required for the local destination' });
            }

            const current = (await query('SELECT * FROM system_backup_settings WHERE id = 1')).rows[0];
            if (!current) {
                return res.status(404).json({ error: 'System backup settings not found' });
            }

            if (destinationType === 's3') {
                if (!s3Bucket || !s3Region || !s3AccessKeyId) {
                    return res.status(400).json({ error: 's3Bucket, s3Region, and s3AccessKeyId are required for the S3 destination' });
                }
                // Blank submit = "leave unchanged" — same convention as MAIL-01's password fields.
                if (!s3SecretAccessKey && !current.s3_secret_access_key) {
                    return res.status(400).json({ error: 's3SecretAccessKey is required for the S3 destination' });
                }
            }
            if (!['hourly', 'daily', 'weekly'].includes(scheduleFrequency)) {
                return res.status(400).json({ error: "scheduleFrequency must be 'hourly', 'daily', or 'weekly'" });
            }
            if (!TIME_RE.test(scheduleTime || '')) {
                return res.status(400).json({ error: 'scheduleTime must be in HH:MM format' });
            }
            if (scheduleFrequency === 'weekly' && (!Number.isInteger(scheduleDayOfWeek) || scheduleDayOfWeek < 0 || scheduleDayOfWeek > 6)) {
                return res.status(400).json({ error: 'scheduleDayOfWeek must be an integer between 0 and 6 for the weekly frequency' });
            }
            if (!Number.isInteger(retentionCount) || retentionCount < 1) {
                return res.status(400).json({ error: 'retentionCount must be a positive integer' });
            }
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ error: 'enabled must be a boolean' });
            }

            const result = await query(
                `UPDATE system_backup_settings
                 SET destination_type = $1, local_path = $2, s3_bucket = $3, s3_region = $4, s3_access_key_id = $5,
                     s3_secret_access_key = $6, schedule_frequency = $7, schedule_time = $8, schedule_day_of_week = $9,
                     retention_count = $10, enabled = $11, updated_by = $12, updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1
                 RETURNING *`,
                [
                    destinationType, localPath || current.local_path, s3Bucket || null, s3Region || null, s3AccessKeyId || null,
                    s3SecretAccessKey || current.s3_secret_access_key,
                    scheduleFrequency, scheduleTime, scheduleFrequency === 'weekly' ? scheduleDayOfWeek : null,
                    retentionCount, enabled, req.user.userId
                ]
            );

            const updated = result.rows[0];
            // Settings and the live schedule must never drift apart.
            backupService.rescheduleBackupJob(updated);

            res.json(shapeSettings(updated));
        } catch (error) {
            console.error('Error updating system backup settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async getHistory(req, res) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = parseInt(req.query.offset) || 0;

            // Fetch one extra row to determine hasMore without a second COUNT query.
            const result = await query(
                `SELECT id, filename, size_bytes, destination, status, triggered_by, error_message, created_at
                 FROM backup_history ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                [limit + 1, offset]
            );

            const hasMore = result.rows.length > limit;
            const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

            res.json({
                items: rows.map((r) => ({
                    id: r.id,
                    filename: r.filename,
                    sizeBytes: r.size_bytes,
                    destination: r.destination,
                    status: r.status,
                    triggeredBy: r.triggered_by,
                    errorMessage: r.error_message,
                    createdAt: r.created_at,
                    downloadable: r.destination === 'local' && r.status === 'success'
                })),
                hasMore
            });
        } catch (error) {
            console.error('Error fetching backup history:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async runNow(req, res) {
        try {
            await backupService.runBackup('manual');
            const latest = (await query('SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 1')).rows[0];
            res.json({
                id: latest.id,
                filename: latest.filename,
                sizeBytes: latest.size_bytes,
                destination: latest.destination,
                status: latest.status,
                triggeredBy: latest.triggered_by,
                errorMessage: latest.error_message,
                createdAt: latest.created_at
            });
        } catch (error) {
            console.error('Error running manual backup:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async downloadBackup(req, res) {
        try {
            const { id } = req.params;
            const result = await query('SELECT * FROM backup_history WHERE id = $1', [id]);
            const row = result.rows[0];
            if (!row) {
                return res.status(404).json({ error: 'Backup not found' });
            }
            if (row.destination !== 'local') {
                return res.status(400).json({ error: "S3 backups aren't downloadable in-app — retrieve them from your S3 console/tooling directly" });
            }
            if (!row.file_path || !fs.existsSync(row.file_path)) {
                return res.status(404).json({ error: 'Backup file no longer exists on disk' });
            }
            res.download(row.file_path, row.filename);
        } catch (error) {
            console.error('Error downloading backup:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async restore(req, res) {
        let tempFileToCleanup = null;
        try {
            let filePath;

            if (req.file) {
                filePath = req.file.path;
                tempFileToCleanup = filePath;
            } else if (req.body.backupHistoryId) {
                const result = await query(
                    "SELECT * FROM backup_history WHERE id = $1 AND status = 'success'",
                    [req.body.backupHistoryId]
                );
                const record = result.rows[0];
                if (!record) {
                    return res.status(404).json({ error: 'Backup not found' });
                }
                if (record.destination === 'local') {
                    if (!record.file_path || !fs.existsSync(record.file_path)) {
                        return res.status(404).json({ error: 'Backup file no longer exists on disk' });
                    }
                    filePath = record.file_path; // the persisted backup itself — never deleted
                } else {
                    const settings = await backupService.getBackupSettings();
                    filePath = await backupService.downloadFromS3ToTemp(settings, record.filename);
                    tempFileToCleanup = filePath;
                }
            } else {
                return res.status(400).json({ error: 'Provide a dump file upload or a backupHistoryId' });
            }

            const result = await backupService.restoreBackup(filePath);
            if (!result.success) {
                return res.status(500).json({ error: 'Restore failed', exitCode: result.exitCode, stderr: result.stderr });
            }
            res.json({ success: true });
        } catch (error) {
            console.error('Error restoring backup:', error);
            res.status(500).json({ error: 'Server error during restore' });
        } finally {
            if (tempFileToCleanup) {
                fs.promises.unlink(tempFileToCleanup).catch(() => {});
            }
        }
    }
};
