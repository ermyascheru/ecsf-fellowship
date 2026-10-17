import { Router } from 'express';
import {
  getFamilies,
  getFamilyById,
  createFamily,
  updateFamily,
  assignMemberToFamily,
  endAssignment,
} from './families.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getFamilies);
router.get('/:id', getFamilyById);
router.post('/', requireAdmin, createFamily);
router.put('/:id', requireAdmin, updateFamily);
router.post('/:id/assign', assignMemberToFamily);
router.post('/assignments/:id/end', endAssignment);

export default router;
