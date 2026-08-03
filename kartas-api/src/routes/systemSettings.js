import express from 'express';
import multer from 'multer';
import os from 'os';
import { systemSettingsController } from '../controllers/systemSettingsController.js';
import { backupController } from '../controllers/backupController.js';
import { authenticateToken, requireAdmin, requireTwoFactor, requireStepUp } from '../middleware/auth.js';

const router = express.Router();

// BKP-04: disk storage, not multer's memory-storage default — restore needs
// req.file.path to hand off to pg_restore. 2GB cap is a sane upper guard.
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

router.use(authenticateToken);

router.get('/theme', systemSettingsController.getTheme);
// TFA-09: 2FA required on top of requireAdmin for every mutating admin
// route in this file — not just the literal "settings" PUTs, but also the
// backup run/restore actions below, which are at least as consequential.
// STEPUP-01: layered on top of requireTwoFactor — a fresh re-verification,
// not just "2FA enabled at all", is now required for every one of these.
router.put('/theme', requireAdmin, requireTwoFactor, requireStepUp, systemSettingsController.updateTheme);

// MAIL-01: unlike theme, email config is admin-only end-to-end — no non-admin
// UI ever needs to read SMTP/Gmail credentials.
router.get('/email', requireAdmin, systemSettingsController.getEmail);
router.put('/email', requireAdmin, requireTwoFactor, requireStepUp, systemSettingsController.updateEmail);

// TFA-03: authenticated only, no requireAdmin — see systemSettingsController.getEmailStatus
router.get('/email/status', systemSettingsController.getEmailStatus);

// RECAP-01: admin-only read/write of the full settings (secret masked). The
// public site-key-only endpoint is registered separately in index.js, before
// this router is mounted, since it must skip authenticateToken entirely.
router.get('/recaptcha', requireAdmin, systemSettingsController.getRecaptcha);
router.put('/recaptcha', requireAdmin, requireTwoFactor, requireStepUp, systemSettingsController.updateRecaptcha);

// BKP-01/02/03/04: backup settings, history, manual trigger, download, and
// restore — kept in a dedicated backupController.js rather than
// systemSettingsController.js given the amount of logic involved.
router.get('/backup', requireAdmin, backupController.getSettings);
router.put('/backup', requireAdmin, requireTwoFactor, requireStepUp, backupController.updateSettings);
router.get('/backup/history', requireAdmin, backupController.getHistory);
router.post('/backup/run', requireAdmin, requireTwoFactor, requireStepUp, backupController.runNow);
router.post('/backup/restore', requireAdmin, requireTwoFactor, requireStepUp, upload.single('file'), backupController.restore);
router.get('/backup/:id/download', requireAdmin, backupController.downloadBackup);

export default router;
