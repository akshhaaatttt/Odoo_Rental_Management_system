import express from 'express';
import {
  getRevenueAnalytics,
  getProductPerformance,
  getOrderStatistics,
  getDashboardSummary
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All report routes require authentication and vendor/admin role
router.use(protect);
router.use(authorize('VENDOR', 'ADMIN'));

router.get('/revenue', getRevenueAnalytics);
router.get('/products', getProductPerformance);
router.get('/orders', getOrderStatistics);
router.get('/dashboard', getDashboardSummary);

export default router;
