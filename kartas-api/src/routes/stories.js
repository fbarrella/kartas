import express from 'express';
import { body } from 'express-validator';
import { storyController } from '../controllers/storyController.js';
import { subTaskController } from '../controllers/subTaskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateStoryCreation = [
    body('projectId').isInt(),
    body('epicId').optional().isInt(),
    body('type').isIn(['story', 'task', 'bug']),
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('assigneeId').optional({ nullable: true }).isInt()
];

const validateStoryUpdate = [
    body('epicId').optional().isInt(),
    body('type').optional().isIn(['story', 'task', 'bug']),
    body('status').optional().isIn(['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled']),
    body('title').optional().trim().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('assigneeId').optional({ nullable: true }).isInt(),
    body('isBlocked').optional().isBoolean()
];

const validateComment = [
    body('content').trim().notEmpty()
];

const validateSubTaskCreation = [
    body('type').isIn(['sub_task', 'sub_test']),
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('assigneeId').optional({ nullable: true }).isInt(),
    body('status').optional().isIn(['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'])
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.post('/', validateStoryCreation, storyController.createStory);
router.get('/project/:projectId', storyController.getProjectStories);
router.get('/:storyId', storyController.getStory);
router.put('/:storyId', validateStoryUpdate, storyController.updateStory);
router.delete('/:storyId', storyController.deleteStory);
router.post('/:storyId/comments', validateComment, storyController.addComment);
router.get('/:storyId/history', storyController.getStoryHistory);
router.post('/:storyId/sub-tasks', validateSubTaskCreation, subTaskController.createSubTask);

export default router;
