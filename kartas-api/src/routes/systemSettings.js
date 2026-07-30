import express from 'express';
import { systemSettingsController } from '../controllers/systemSettingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/theme', systemSettingsController.getTheme);
router.put('/theme', requireAdmin, systemSettingsController.updateTheme);

export default router;
