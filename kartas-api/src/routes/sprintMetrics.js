import express from 'express';
import { sprintMetricsController } from '../controllers/sprintMetricsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get completed sprints for a project
router.get('/projects/:projectId/sprints', sprintMetricsController.getCompletedSprints);

// Get comprehensive sprint report
router.get('/sprints/:sprintId/report', sprintMetricsController.getSprintReport);

export default router;
