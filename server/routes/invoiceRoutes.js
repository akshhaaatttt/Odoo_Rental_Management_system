import express from 'express';
import {
  getInvoices,
  getInvoice,
  getInvoiceByOrderId,
  postInvoice,
  recordPayment,
  sendInvoice,
  downloadInvoicePDF,
  downloadInvoiceByOrderPDF
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all invoices
router.get('/', protect, getInvoices);

// Download invoice PDF by order ID
router.get('/order/:orderId/download', protect, downloadInvoiceByOrderPDF);

// Get invoice by order ID (MUST be before /:id to avoid conflict)
router.get('/order/:orderId', protect, getInvoiceByOrderId);

// Download invoice PDF
router.get('/:id/download', protect, downloadInvoicePDF);

// Get specific invoice
router.get('/:id', protect, getInvoice);

// Post invoice
router.patch('/:id/post', protect, authorize('VENDOR', 'ADMIN'), postInvoice);

// Send invoice with payment link
router.post('/:id/send', protect, authorize('VENDOR', 'ADMIN'), sendInvoice);

// Record payment
router.post('/:id/payment', protect, authorize('VENDOR', 'ADMIN', 'CUSTOMER'), recordPayment);

export default router;
