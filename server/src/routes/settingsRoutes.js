import express from 'express';
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  getOrganizationUsers,
  createOrganizationUser,
  updateOrganizationUser,
  getAuditLogs,
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

// Organization Profile
router.get('/organization', getOrganizationSettings);
router.put('/organization', authorize('super_admin', 'business_owner'), updateOrganizationSettings);

// User Management
router.get('/users', authorize('super_admin', 'business_owner', 'manager'), getOrganizationUsers);
router.post('/users', authorize('super_admin', 'business_owner'), createOrganizationUser);
router.put('/users/:id', authorize('super_admin', 'business_owner'), updateOrganizationUser);

// Audit logs
router.get('/audit-logs', authorize('super_admin', 'business_owner'), getAuditLogs);

export default router;
