import express from 'express';
import { epicController } from '../controllers/epicController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Epic routes
router.get('/project/:projectId/epics', epicController.getEpics);
router.get('/epics/:epicId', epicController.getEpic);
router.post('/project/:projectId/epics', epicController.createEpic);
router.put('/epics/:epicId', epicController.updateEpic);
router.delete('/epics/:epicId', epicController.deleteEpic);

export default router;
