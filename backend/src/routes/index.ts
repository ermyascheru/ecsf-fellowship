import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import studentsRoutes from '../modules/students/students.routes.js';
import peopleRoutes from '../modules/people/people.routes.js';
import familiesRoutes from '../modules/families/families.routes.js';
import transfersRoutes from '../modules/transfers/transfers.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import accountsRoutes from '../modules/accounts/accounts.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import searchRoutes from '../modules/search/search.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/students', studentsRoutes);
router.use('/people', peopleRoutes);
router.use('/families', familiesRoutes);
router.use('/transfers', transfersRoutes);
router.use('/reports', reportsRoutes);
router.use('/accounts', accountsRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FTVTI ECSF Fellowship Backend API', timestamp: new Date() });
});

export default router;
