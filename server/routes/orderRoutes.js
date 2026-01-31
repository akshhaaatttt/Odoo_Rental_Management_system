import express from 'express';
import {
  checkout,
  getOrders,
  getOrder,
  updateOrderStatus,
  sendOrder,
  confirmSale,
  confirmOrder,
  approveOrder,
  rejectOrder,
  createInvoiceForOrder,
  pickupOrder,
  returnOrder,
  cancelOrder
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { checkInventoryAvailability } from '../middleware/inventory.js';

const router = express.Router();

// Checkout (with inventory check)
router.post('/checkout', protect, checkInventoryAvailability, checkout);

// Get orders
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);

// Update order
router.patch('/:id/status', protect, authorize('VENDOR', 'ADMIN'), updateOrderStatus);

// Order lifecycle transitions (NEW WORKFLOW)
router.patch('/:id/approve', protect, authorize('VENDOR', 'ADMIN'), approveOrder);
router.patch('/:id/reject', protect, authorize('VENDOR', 'ADMIN'), rejectOrder);
router.patch('/:id/confirm', protect, authorize('VENDOR', 'ADMIN'), confirmOrder);
router.patch('/:id/send', protect, authorize('VENDOR', 'ADMIN'), sendOrder);
router.patch('/:id/confirm-sale', protect, authorize('VENDOR', 'ADMIN'), confirmSale);
router.post('/:id/create-invoice', protect, authorize('VENDOR', 'ADMIN'), createInvoiceForOrder);
router.patch('/:id/pickup', protect, authorize('VENDOR', 'ADMIN'), pickupOrder);
router.patch('/:id/return', protect, authorize('VENDOR', 'ADMIN'), returnOrder);
router.patch('/:id/cancel', protect, cancelOrder);

export default router;
