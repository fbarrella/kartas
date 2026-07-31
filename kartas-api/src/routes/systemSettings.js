import express from 'express';
import { systemSettingsController } from '../controllers/systemSettingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/theme', systemSettingsController.getTheme);
router.put('/theme', requireAdmin, systemSettingsController.updateTheme);

// MAIL-01: unlike theme, email config is admin-only end-to-end — no non-admin
// UI ever needs to read SMTP/Gmail credentials.
router.get('/email', requireAdmin, systemSettingsController.getEmail);
router.put('/email', requireAdmin, systemSettingsController.updateEmail);

export default router;
