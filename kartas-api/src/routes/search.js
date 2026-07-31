import express from 'express';
import { searchController } from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/project/:projectId', searchController.search);

export default router;
