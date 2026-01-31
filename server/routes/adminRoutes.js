import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDashboardMetrics,
  getAllVendors,
  verifyVendor,
  getAllProducts,
  publishProduct,
  getAllOrders,
  exportOrders,
  getReturnsOverview,
  getReports,
  exportReport,
  getSettings,
  updateSettings
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// Dashboard
router.get('/dashboard', getDashboardMetrics);

// Vendor Management
router.get('/vendors', getAllVendors);
router.patch('/vendors/:id/verify', verifyVendor);

// Product Management
router.get('/products', getAllProducts);
router.patch('/products/:id/publish', publishProduct);

// Order Management
router.get('/orders', getAllOrders);
router.get('/orders/export', exportOrders);

// Returns Management
router.get('/returns', getReturnsOverview);

// Reports
router.get('/reports', getReports);
router.get('/reports/export', exportReport);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
