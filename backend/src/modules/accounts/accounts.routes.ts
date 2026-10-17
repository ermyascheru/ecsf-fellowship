import { Router } from 'express';
import {
  getAccounts,
  createAccount,
  updateAccountStatus,
  assignFamilyAccess,
  removeFamilyAccess,
} from './accounts.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', getAccounts);
router.post('/', createAccount);
router.patch('/:id/status', updateAccountStatus);
router.post('/:id/family-access', assignFamilyAccess);
router.delete('/:id/family-access/:familyId', removeFamilyAccess);

export default router;
