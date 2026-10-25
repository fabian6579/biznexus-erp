import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', authorize('super_admin', 'business_owner', 'manager', 'employee'), createCustomer);
router.put('/:id', authorize('super_admin', 'business_owner', 'manager', 'employee'), updateCustomer);
router.delete('/:id', authorize('super_admin', 'business_owner', 'manager'), deleteCustomer);
router.post('/:id/notes', addCustomerNote);

export default router;
