import express from 'express';
import { body } from 'express-validator';
import { subTaskController } from '../controllers/subTaskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const validateSubTaskUpdate = [
    body('type').optional().isIn(['sub_task', 'sub_test']),
    body('status').optional().isIn(['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled']),
    body('title').optional().trim().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('assigneeId').optional().isInt()
];

router.use(authenticateToken);

router.put('/:id', validateSubTaskUpdate, subTaskController.updateSubTask);
router.delete('/:id', subTaskController.deleteSubTask);

export default router;
