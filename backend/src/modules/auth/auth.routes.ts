import { Router } from 'express';
import { login, getCurrentUser, changePassword } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);

export default router;
