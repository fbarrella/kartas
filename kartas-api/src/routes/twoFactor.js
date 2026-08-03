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

// TRUST-01
router.get('/trusted-devices', twoFactorController.listTrustedDevices);
router.delete('/trusted-devices/:id', twoFactorController.revokeTrustedDevice);
router.delete('/trusted-devices', twoFactorController.revokeAllTrustedDevices);

export default router;
