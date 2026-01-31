import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductAttribute,
  checkAvailability
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/:id/check-availability', checkAvailability);

// Protected routes
router.post('/', protect, authorize('VENDOR', 'ADMIN'), createProduct);
router.put('/:id', protect, authorize('VENDOR', 'ADMIN'), updateProduct);
router.delete('/:id', protect, authorize('VENDOR', 'ADMIN'), deleteProduct);
router.post('/:id/attributes', protect, authorize('VENDOR', 'ADMIN'), addProductAttribute);

export default router;
