import express from 'express';
import { body, param } from 'express-validator';
import { inviteController } from '../controllers/inviteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateInviteGeneration = [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('role').optional().isIn(['admin', 'project_owner', 'member'])
];

const validateInviteRegistration = [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
];

// Public routes (no authentication required)
// Validate invite token (public)
router.get('/validate/:token', inviteController.validateInvite);

// Register with invite (public)
router.post('/register', validateInviteRegistration, inviteController.registerWithInvite);

// Protected routes (authentication required)
// Generate invite (admin only)
router.post('/generate', authenticateToken, validateInviteGeneration, inviteController.generateInvite);

// Get pending invites (admin only)
router.get('/pending', authenticateToken, inviteController.getPendingInvites);

// Cancel invite (admin only)
router.delete('/:inviteId', authenticateToken, inviteController.deleteInvite);

export default router;
