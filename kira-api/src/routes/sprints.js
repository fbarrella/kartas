import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { sprintController } from '../controllers/sprintController.js';

const router = express.Router();

// Validation middleware
const validateSprintCreation = [
    body('projectId').isInt(),
    body('name').trim().notEmpty().isLength({ min: 2, max: 255 }),
    body('objective').optional().trim(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
];

const validateSprintUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('objective').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
];

const validateAddStories = [
    body('storyIds').isArray({ min: 1 }),
    body('storyIds.*').isInt()
];

// All routes require authentication
router.use(authenticateToken);

// Sprint CRUD
router.post('/', validateSprintCreation, sprintController.createSprint);
router.get('/project/:projectId', sprintController.getProjectSprints);
router.get('/project/:projectId/active', sprintController.getActiveSprint);
router.get('/:sprintId', sprintController.getSprint);
router.put('/:sprintId', validateSprintUpdate, sprintController.updateSprint);
router.delete('/:sprintId', sprintController.deleteSprint);

// Sprint lifecycle
router.post('/:sprintId/start', sprintController.startSprint);
router.post('/:sprintId/end', sprintController.endSprint);

// Story management
router.post('/:sprintId/stories', validateAddStories, sprintController.addStoriesToSprint);
router.delete('/:sprintId/stories/:storyId', sprintController.removeStoryFromSprint);

export default router;
