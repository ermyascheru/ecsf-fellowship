import { Router } from 'express';
import {
  getDashboardStats,
  getAcademicStageChartData,
  getFamilyOverview,
} from './dashboard.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/academic-stages', getAcademicStageChartData);
router.get('/family-overview', getFamilyOverview);

export default router;
