import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { kanbanController } from '../controllers/kanbanController.js';

const router = express.Router();

// Validation middleware
const validateStatusUpdate = [
    body('status').isIn(['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'])
];

const validateColumnConfig = [
    body('columns').isArray(),
    body('columns.*.status').isString(),
    body('columns.*.displayName').isString(),
    body('columns.*.visible').isBoolean(),
    body('columns.*.position').isInt()
];

// All routes require authentication
router.use(authenticateToken);

// Kanban board
router.get('/project/:projectId', kanbanController.getKanbanBoard);
router.put('/stories/:storyId/status', validateStatusUpdate, kanbanController.updateStoryStatus);

// Column configuration
router.get('/project/:projectId/columns', kanbanController.getColumnConfig);
router.put('/project/:projectId/columns', validateColumnConfig, kanbanController.updateColumnConfig);

// Sprint metrics
router.get('/sprint/:sprintId/metrics', kanbanController.getSprintMetrics);

export default router;
