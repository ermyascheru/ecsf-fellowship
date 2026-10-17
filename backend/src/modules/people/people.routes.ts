import { Router } from 'express';
import {
  getPeople,
  getPersonById,
  createPerson,
  updatePerson,
} from './people.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPeople);
router.get('/:id', getPersonById);
router.post('/', createPerson);
router.put('/:id', updatePerson);

export default router;
