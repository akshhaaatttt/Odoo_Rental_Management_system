import express from 'express';
import {
  getInvoices,
  getInvoice,
  getInvoiceByOrderId,
  postInvoice,
  recordPayment,
  sendInvoice
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all invoices
router.get('/', protect, getInvoices);

// Get invoice by order ID (MUST be before /:id to avoid conflict)
router.get('/order/:orderId', protect, getInvoiceByOrderId);

// Get specific invoice
router.get('/:id', protect, getInvoice);

// Post invoice
router.patch('/:id/post', protect, authorize('VENDOR', 'ADMIN'), postInvoice);

// Send invoice with payment link
router.post('/:id/send', protect, authorize('VENDOR', 'ADMIN'), sendInvoice);

// Record payment
router.post('/:id/payment', protect, authorize('VENDOR', 'ADMIN', 'CUSTOMER'), recordPayment);

export default router;
