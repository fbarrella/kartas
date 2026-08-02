import express from 'express';
import multer from 'multer';
import os from 'os';
import { systemSettingsController } from '../controllers/systemSettingsController.js';
import { backupController } from '../controllers/backupController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// BKP-04: disk storage, not multer's memory-storage default — restore needs
// req.file.path to hand off to pg_restore. 2GB cap is a sane upper guard.
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

router.use(authenticateToken);

router.get('/theme', systemSettingsController.getTheme);
router.put('/theme', requireAdmin, systemSettingsController.updateTheme);

// MAIL-01: unlike theme, email config is admin-only end-to-end — no non-admin
// UI ever needs to read SMTP/Gmail credentials.
router.get('/email', requireAdmin, systemSettingsController.getEmail);
router.put('/email', requireAdmin, systemSettingsController.updateEmail);

// TFA-03: authenticated only, no requireAdmin — see systemSettingsController.getEmailStatus
router.get('/email/status', systemSettingsController.getEmailStatus);

// BKP-01/02/03/04: backup settings, history, manual trigger, download, and
// restore — kept in a dedicated backupController.js rather than
// systemSettingsController.js given the amount of logic involved.
router.get('/backup', requireAdmin, backupController.getSettings);
router.put('/backup', requireAdmin, backupController.updateSettings);
router.get('/backup/history', requireAdmin, backupController.getHistory);
router.post('/backup/run', requireAdmin, backupController.runNow);
router.post('/backup/restore', requireAdmin, upload.single('file'), backupController.restore);
router.get('/backup/:id/download', requireAdmin, backupController.downloadBackup);

export default router;
