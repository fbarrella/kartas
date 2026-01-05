import express from 'express';
import { body, param } from 'express-validator';
import { projectController } from '../controllers/projectController.js';
import { authenticateToken, requireProjectOwner } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateProjectCreation = [
    body('name').trim().notEmpty().isLength({ min: 2, max: 255 }),
    body('description').optional().trim()
];

const validateProjectUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('description').optional().trim()
];

const validateAddMember = [
    body('userId').isInt(),
    body('role').optional().isIn(['owner', 'member'])
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.post('/', requireProjectOwner, validateProjectCreation, projectController.createProject);
router.get('/', projectController.getUserProjects);
router.get('/:projectId', projectController.getProject);
router.get('/:projectId/members', projectController.getProjectMembers);
router.put('/:projectId', validateProjectUpdate, projectController.updateProject);
router.delete('/:projectId', projectController.deleteProject);
router.post('/:projectId/members', validateAddMember, projectController.addMember);
router.delete('/:projectId/members/:userId', projectController.removeMember);

export default router;
