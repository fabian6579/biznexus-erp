import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

// Projects
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', authorize('super_admin', 'business_owner', 'manager'), createProject);
router.put('/:id', authorize('super_admin', 'business_owner', 'manager'), updateProject);
router.delete('/:id', authorize('super_admin', 'business_owner'), deleteProject);

// Tasks (also accessible directly via /api/tasks)
router.get('/tasks/all', getTasks);
router.post('/tasks/all', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

export default router;
