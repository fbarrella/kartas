import express from 'express';
import { forYouController } from '../controllers/forYouController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/project/:projectId/tasks', forYouController.getMyTasks);
router.get('/project/:projectId/activity', forYouController.getMyActivity);
router.get('/project/:projectId/user/:userId/tasks', forYouController.getMyTasks);
router.get('/project/:projectId/user/:userId/activity', forYouController.getMyActivity);

export default router;
