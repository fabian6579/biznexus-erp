import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getInventoryMovements,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/movements/all', getInventoryMovements);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authorize('super_admin', 'business_owner', 'manager'), createProduct);
router.put('/:id', authorize('super_admin', 'business_owner', 'manager'), updateProduct);
router.delete('/:id', authorize('super_admin', 'business_owner'), deleteProduct);
router.post('/:id/adjust', authorize('super_admin', 'business_owner', 'manager'), adjustStock);

export default router;
