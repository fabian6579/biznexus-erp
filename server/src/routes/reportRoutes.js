import express from 'express';
import {
  getSalesReport,
  getFinancialReport,
  getInventoryReport,
  exportReportCsv,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/sales', getSalesReport);
router.get('/financial', authorize('super_admin', 'business_owner', 'manager', 'accountant'), getFinancialReport);
router.get('/inventory', getInventoryReport);
router.get('/export-csv', exportReportCsv);

export default router;
