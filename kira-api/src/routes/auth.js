import express from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateAdminCreation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
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

export default router;
