import { Router } from 'express';
import {
  getMetadata,
  addDepartment,
  addAcademicStage,
  addGcClassification,
} from './settings.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/metadata', getMetadata);
router.post('/departments', requireAdmin, addDepartment);
router.post('/stages', requireAdmin, addAcademicStage);
router.post('/gc-classifications', requireAdmin, addGcClassification);

export default router;
