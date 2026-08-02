import express from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateAdminCreation = [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
];

const validateLogin = [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty()
];

const validatePasswordChange = [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
];

// Routes
router.get('/check-admin', authController.checkAdminExists);
router.post('/admin/setup', validateAdminCreation, authController.createAdmin);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/change-password', authenticateToken, validatePasswordChange, authController.changePassword);
router.post('/logout', authController.logout);

// TFA-05: no authenticateToken — completing a 2FA challenge IS how a
// challenged login becomes an authenticated session.
router.post('/2fa/verify', authController.verifyTwoFactor);
router.post('/2fa/resend', authController.resendTwoFactorChallenge);

export default router;
