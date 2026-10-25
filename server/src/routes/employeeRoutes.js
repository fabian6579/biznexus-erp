import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
} from '../controllers/employeeController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', getEmployeeStats);
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', authorize('super_admin', 'business_owner', 'manager'), createEmployee);
router.put('/:id', authorize('super_admin', 'business_owner', 'manager'), updateEmployee);
router.delete('/:id', authorize('super_admin', 'business_owner'), deleteEmployee);

export default router;
