import { execFile } from 'child_process';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import cron from 'node-cron';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { query } from '../config/database.js';

// Manual callback wrapper (not promisify) — guarantees exitCode/stdout/stderr
// are captured on both success and failure, which promisify's rejection shape
// doesn't reliably give across Node versions. Used for pg_restore, where the
// caller needs the exit code/stderr regardless of outcome.
function execFileCapture(cmd, args) {
    return new Promise((resolve) => {
        execFile(cmd, args, (error, stdout, stderr) => {
            resolve({ success: !error, exitCode: error ? error.code : 0, stdout, stderr, errorMessage: error?.message });
        });
    });
}

// BKP-02: module-level current node-cron task — mirrors MAIL-02's
// getEmailConfig()'s "resolve fresh, no caching" idea, applied here to a cron
// task instead of a transporter: whenever settings change, the old task is
// stopped and a new one scheduled from scratch.
let scheduledTask = null;

export async function getBackupSettings() {
    const result = await query('SELECT * FROM system_backup_settings WHERE id = 1');
    return result.rows[0];
}

export function buildCronExpression(frequency, time, dayOfWeek) {
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    if (frequency === 'hourly') return `${mm} * * * *`;
    if (frequency === 'daily') return `${mm} ${hh} * * *`;
    if (frequency === 'weekly') return `${mm} ${hh} * * ${dayOfWeek ?? 0}`;
    throw new Error(`Unknown schedule_frequency: ${frequency}`);
}

export function rescheduleBackupJob(settings) {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
    }
    if (!settings.enabled) return;

    const expr = buildCronExpression(settings.schedule_frequency, settings.schedule_time, settings.schedule_day_of_week);
    scheduledTask = cron.schedule(expr, () => {
        runBackup('cron').catch((err) => console.error('Scheduled backup threw unexpectedly:', err));
    });
}

// Called once at server startup so a restart doesn't silently drop the schedule.
export async function initScheduler() {
    const settings = await getBackupSettings();
    rescheduleBackupJob(settings);
}

function s3ClientFrom(settings) {
    return new S3Client({
        region: settings.s3_region,
        credentials: { accessKeyId: settings.s3_access_key_id, secretAccessKey: settings.s3_secret_access_key }
    });
}

export async function uploadToS3(settings, localFilePath, key) {
    const client = s3ClientFrom(settings);
    const body = await fsp.readFile(localFilePath);
    await client.send(new PutObjectCommand({ Bucket: settings.s3_bucket, Key: key, Body: body }));
}

export async function downloadFromS3ToTemp(settings, key) {
    const client = s3ClientFrom(settings);
    const result = await client.send(new GetObjectCommand({ Bucket: settings.s3_bucket, Key: key }));
    const tmpPath = path.join(os.tmpdir(), `restore-${Date.now()}-${key}`);
    await pipeline(result.Body, fs.createWriteStream(tmpPath));
    return tmpPath;
}

export async function deleteFromS3(settings, key) {
    const client = s3ClientFrom(settings);
    await client.send(new DeleteObjectCommand({ Bucket: settings.s3_bucket, Key: key }));
}

export async function runBackup(triggeredBy) {
    const settings = await getBackupSettings();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kartas-backup-${timestamp}.dump`;
    const tmpPath = path.join(os.tmpdir(), filename);

    try {
        // Array-args execFile, never exec-with-string-interpolation — even though
        // DATABASE_URL is a trusted env var, not user input.
        await new Promise((resolve, reject) => {
            execFile('pg_dump', ['-Fc', '-f', tmpPath, process.env.DATABASE_URL], (error, stdout, stderr) => {
                if (error) reject(new Error(stderr || error.message));
                else resolve();
            });
        });

        const { size } = await fsp.stat(tmpPath);

        let filePath = null;
        if (settings.destination_type === 's3') {
            await uploadToS3(settings, tmpPath, filename);
        } else {
            const destDir = path.resolve(settings.local_path);
            await fsp.mkdir(destDir, { recursive: true });
            filePath = path.join(destDir, filename);
            await fsp.copyFile(tmpPath, filePath);
        }

        await query(
            `INSERT INTO backup_history (filename, size_bytes, destination, file_path, status, triggered_by)
             VALUES ($1, $2, $3, $4, 'success', $5)`,
            [filename, size, settings.destination_type, filePath, triggeredBy]
        );

        await pruneOldBackups(settings);
    } catch (err) {
        console.error('Backup failed:', err);
        await query(
            `INSERT INTO backup_history (filename, size_bytes, destination, file_path, status, triggered_by, error_message)
             VALUES ($1, NULL, $2, NULL, 'failed', $3, $4)`,
            [filename, settings.destination_type, triggeredBy, err.message]
        ).catch((e) => console.error('Failed to write failed-backup history row:', e));
    } finally {
        await fsp.unlink(tmpPath).catch(() => {});
    }
}

export async function pruneOldBackups(settings) {
    const result = await query(
        `SELECT id, destination, file_path, filename FROM backup_history
         WHERE status = 'success' ORDER BY created_at DESC OFFSET $1`,
        [settings.retention_count]
    );

    for (const row of result.rows) {
        try {
            if (row.destination === 'local' && row.file_path) {
                await fsp.unlink(row.file_path).catch(() => {});
            } else if (row.destination === 's3') {
                await deleteFromS3(settings, row.filename);
            }
            await query('DELETE FROM backup_history WHERE id = $1', [row.id]);
        } catch (err) {
            console.error(`Failed to prune backup_history row ${row.id}:`, err);
        }
    }
}

export async function restoreBackup(filePath) {
    const result = await execFileCapture('pg_restore', ['--clean', '--if-exists', '-d', process.env.DATABASE_URL, filePath]);
    if (!result.success) {
        console.error(`pg_restore exited with code ${result.exitCode}:`, result.stderr);
    }
    return result;
}
