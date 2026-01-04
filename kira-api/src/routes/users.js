import express from 'express';
import { body } from 'express-validator';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation middleware
const validateProfileUpdate = [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
];

const validatePasswordChange = [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
];

// Routes
router.get('/profile', userController.getProfile);
router.put('/profile', validateProfileUpdate, userController.updateProfile);
router.put('/password', validatePasswordChange, userController.changePassword);

export default router;
