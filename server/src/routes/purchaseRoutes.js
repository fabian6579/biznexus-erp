import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receiveGoods,
} from '../controllers/purchaseController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', authorize('super_admin', 'business_owner', 'manager'), createPurchaseOrder);
router.patch('/:id/receive', authorize('super_admin', 'business_owner', 'manager'), receiveGoods);

export default router;
