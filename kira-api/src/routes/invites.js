import express from 'express';
import { body, param } from 'express-validator';
import { inviteController } from '../controllers/inviteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateInviteGeneration = [
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'project_owner', 'member'])
];

const validateInviteRegistration = [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
];

// Generate invite (admin only)
router.post('/generate', authenticateToken, validateInviteGeneration, inviteController.generateInvite);

// Validate invite token (public)
router.get('/validate/:token', inviteController.validateInvite);

// Register with invite (public)
router.post('/register', validateInviteRegistration, inviteController.registerWithInvite);

// Get pending invites (admin only)
router.get('/pending', authenticateToken, inviteController.getPendingInvites);

export default router;
