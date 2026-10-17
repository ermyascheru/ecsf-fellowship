import { Router } from 'express';
import {
  getReportCatalog,
  getFamilySummary,
  getAcademicStagesReport,
  getGcClassificationReport,
  getDepartmentsReport,
  getParticipationReport,
  getFamilyCapacityAlerts,
  getUnassignedStudents,
  getMissingDataReport,
  getLeadershipHistoryReport,
  getTransferHistoryReport,
  getStudentsReport,
  exportReport,
} from './reports.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/catalog', getReportCatalog);
router.get('/students', getStudentsReport);
router.get('/family-summary', getFamilySummary);
router.get('/academic-stages', getAcademicStagesReport);
router.get('/gc-classification', getGcClassificationReport);
router.get('/departments', getDepartmentsReport);
router.get('/participation', getParticipationReport);
router.get('/family-capacity', getFamilyCapacityAlerts);
router.get('/unassigned-students', getUnassignedStudents);
router.get('/missing-data', getMissingDataReport);
router.get('/leadership-history', getLeadershipHistoryReport);
router.get('/transfer-history', getTransferHistoryReport);
router.get('/:reportType/export', exportReport);

export default router;
