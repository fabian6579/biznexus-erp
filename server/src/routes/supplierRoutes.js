import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', authorize('super_admin', 'business_owner', 'manager'), createSupplier);
router.put('/:id', authorize('super_admin', 'business_owner', 'manager'), updateSupplier);
router.delete('/:id', authorize('super_admin', 'business_owner'), deleteSupplier);

export default router;
