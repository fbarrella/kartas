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
    body('email').optional().isEmail().normalizeEmail({ gmail_remove_dots: false })
];

const validatePasswordChange = [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
];

const validateRoleUpdate = [
    body('role').isIn(['admin', 'project_owner', 'member'])
];

const validateUserCreation = [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').optional().isIn(['admin', 'project_owner', 'member'])
];

// Routes
router.get('/', userController.getAllUsers);
router.post('/', validateUserCreation, userController.createUser);
router.get('/search', userController.searchUsers);
router.get('/profile', userController.getProfile);
router.put('/profile', validateProfileUpdate, userController.updateProfile);
router.put('/password', validatePasswordChange, userController.changePassword);
router.put('/:id/role', validateRoleUpdate, userController.updateUserRole);
router.delete('/:id', userController.deleteUser);

export default router;
