import express from 'express';
import { protect } from '../middleware/auth.js';
import * as customerController from '../controllers/customerController.js';

const router = express.Router();

// Get all customers for the logged-in vendor
router.get('/', protect, customerController.getVendorCustomers);

// Get detailed information about a specific customer
router.get('/:customerId', protect, customerController.getCustomerDetail);

export default router;
