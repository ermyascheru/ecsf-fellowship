import { Router } from 'express';
import {
  getTransfers,
  getTransferById,
  createTransferRequest,
  approveTransfer,
  rejectTransfer,
} from './transfers.controller.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getTransfers);
router.get('/:id', getTransferById);
router.post('/', createTransferRequest);
router.post('/:id/approve', requireAdmin, approveTransfer);
router.post('/:id/reject', requireAdmin, rejectTransfer);

export default router;
