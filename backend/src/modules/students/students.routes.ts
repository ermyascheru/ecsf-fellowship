import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateParticipationStatus,
} from './students.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.patch('/:id/participation', updateParticipationStatus);

export default router;
