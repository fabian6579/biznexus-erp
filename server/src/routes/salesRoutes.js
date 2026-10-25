import express from 'express';
import {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrderStatus,
  generateInvoiceFromOrder,
} from '../controllers/salesController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSalesOrders);
router.get('/:id', getSalesOrderById);
router.post('/', authorize('super_admin', 'business_owner', 'manager', 'employee'), createSalesOrder);
router.patch('/:id/status', authorize('super_admin', 'business_owner', 'manager'), updateSalesOrderStatus);
router.post('/:id/invoice', authorize('super_admin', 'business_owner', 'manager', 'accountant'), generateInvoiceFromOrder);

export default router;
