import { Router } from 'express';
import { globalSearch } from './search.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', globalSearch);

export default router;
