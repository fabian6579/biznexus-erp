import express from 'express';
import {
  getTransactions,
  createTransaction,
  getFinanceSummary,
  getInvoices,
  getInvoiceById,
  recordInvoicePayment,
} from '../controllers/financeController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getFinanceSummary);
router.get('/transactions', getTransactions);
router.post('/transactions', authorize('super_admin', 'business_owner', 'manager', 'accountant'), createTransaction);
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.patch('/invoices/:id/payment', authorize('super_admin', 'business_owner', 'accountant'), recordInvoicePayment);

export default router;
