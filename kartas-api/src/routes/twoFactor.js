import express from 'express';
import { twoFactorController } from '../controllers/twoFactorController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/totp/setup', twoFactorController.setupTotp);
router.post('/totp/confirm', twoFactorController.confirmTotp);
router.post('/email/setup', twoFactorController.setupEmail);
router.post('/email/confirm', twoFactorController.confirmEmail);
router.post('/email/resend', twoFactorController.resendEmail);
router.post('/backup-codes/regenerate', twoFactorController.regenerateBackupCodes);
router.post('/disable', twoFactorController.disable);

export default router;
